/**
 * POST /api/decks/process-now
 *
 * Trigger immediate processing of a pending ScheduledDeck via NotebookLM.
 * Returns immediately after marking the deck as "processing" —
 * the actual generation runs in the background (fire-and-forget).
 *
 * This avoids the browser timeout that occurs when NotebookLM
 * takes 3-5 minutes to generate a deck synchronously.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDeckWithNotebookLM } from "@/lib/services/deck-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes max for NotebookLM generation

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deckId } = body;

    if (!deckId) {
      return NextResponse.json(
        { error: "deckId is required" },
        { status: 400 }
      );
    }

    // Fetch and validate the deck
    const deck = await prisma.scheduledDeck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "Deck not found" },
        { status: 404 }
      );
    }

    if (deck.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot process deck with status "${deck.status}"`,
          currentStatus: deck.status,
        },
        { status: 409 }
      );
    }

    // Mark as processing immediately
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: { status: "processing" },
    });

    console.log(`[ProcessNow] Starting background processing for deck ${deckId} (${deck.customerName})`);

    // Fire-and-forget: process in background
    // The promise runs to completion even after the HTTP response is sent.
    // Next.js serverless functions stay alive until maxDuration or completion.
    processDeckWithNotebookLM(deckId).then((result) => {
      if (result.success) {
        console.log(`[ProcessNow] Background processing completed for deck ${deckId}: ${result.slideCount} slides in ${result.processingTimeMs}ms`);
      } else {
        console.error(`[ProcessNow] Background processing failed for deck ${deckId}: ${result.error}`);
      }
    }).catch((err) => {
      console.error(`[ProcessNow] Unhandled error processing deck ${deckId}:`, err);
    });

    // Return immediately — client will poll via useDeckStatus
    return NextResponse.json({
      success: true,
      message: "Processing started",
      deckId,
      status: "processing",
    });
  } catch (error) {
    console.error("[ProcessNow] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start processing" },
      { status: 500 }
    );
  }
}
