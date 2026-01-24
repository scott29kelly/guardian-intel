/**
 * Ready Decks API
 *
 * GET /api/decks/ready - Get completed scheduled decks ready for viewing
 *
 * Returns decks that have been batch-processed and are ready to use.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/decks/ready
 *
 * Get completed decks for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const includeViewed = searchParams.get("includeViewed") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Fetch completed decks assigned to this user (or requested by them)
    const readyDecks = await prisma.scheduledDeck.findMany({
      where: {
        status: "completed",
        OR: [{ assignedToId: userId }, { requestedById: userId }],
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    // Parse the result payload for each deck
    const decksWithData = readyDecks.map((deck) => {
      let generatedDeck = null;
      if (deck.resultPayload) {
        try {
          generatedDeck = JSON.parse(deck.resultPayload);
        } catch {
          console.error(`Failed to parse result payload for deck ${deck.id}`);
        }
      }

      return {
        id: deck.id,
        customerId: deck.customerId,
        customerName: deck.customerName,
        templateId: deck.templateId,
        templateName: deck.templateName,
        status: deck.status,
        completedAt: deck.completedAt?.toISOString() || null,
        actualSlides: deck.actualSlides,
        processingTimeMs: deck.processingTimeMs,
        generatedDeck, // Full deck data for viewing
      };
    });

    return NextResponse.json({
      success: true,
      count: decksWithData.length,
      decks: decksWithData,
    });
  } catch (error) {
    console.error("[API] GET /api/decks/ready error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ready decks" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/decks/ready
 *
 * Mark a ready deck as dismissed/archived
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Get deck ID from query
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("id");

    if (!deckId) {
      return NextResponse.json(
        { success: false, error: "Deck ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const deck = await prisma.scheduledDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ assignedToId: userId }, { requestedById: userId }],
      },
    });

    if (!deck) {
      return NextResponse.json(
        { success: false, error: "Deck not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.scheduledDeck.delete({
      where: { id: deckId },
    });

    return NextResponse.json({
      success: true,
      message: "Deck removed from ready list",
    });
  } catch (error) {
    console.error("[API] DELETE /api/decks/ready error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove deck" },
      { status: 500 }
    );
  }
}
