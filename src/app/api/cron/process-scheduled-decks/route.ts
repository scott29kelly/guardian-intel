/**
 * Scheduled Decks Batch Processor (Cron Job)
 *
 * GET /api/cron/process-scheduled-decks
 *
 * Processes all pending scheduled decks overnight.
 * Designed to run at 2 AM daily via Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDeckWithNotebookLM } from "@/lib/services/deck-processing";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for batch processing

// Vercel Cron configuration
export const config = {
  // Run at 2 AM UTC daily
  cron: "0 2 * * *",
};

/**
 * Process all pending scheduled decks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
      console.warn("[Cron] Unauthorized batch processing attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting scheduled deck batch processing...");

    // Fetch all pending decks scheduled for processing
    const pendingDecks = await prisma.scheduledDeck.findMany({
      where: {
        status: "pending",
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50, // Process up to 50 decks per run
    });

    if (pendingDecks.length === 0) {
      console.log("[Cron] No pending decks to process");
      return NextResponse.json({
        success: true,
        message: "No pending decks to process",
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${pendingDecks.length} pending decks to process`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each deck via NotebookLM
    for (const deck of pendingDecks) {
      console.log(`[Cron] Processing deck ${deck.id} for ${deck.customerName}`);

      try {
        // Mark as processing
        await prisma.scheduledDeck.update({
          where: { id: deck.id },
          data: { status: "processing" },
        });

        // Process via shared NotebookLM pipeline
        const result = await processDeckWithNotebookLM(deck.id);

        if (result.success) {
          console.log(`[Cron] Completed deck ${deck.id} in ${result.processingTimeMs}ms`);
          results.successful++;
        } else {
          console.error(`[Cron] Failed deck ${deck.id}: ${result.error}`);
          results.failed++;
          results.errors.push(`${deck.id}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[Cron] Unexpected error processing deck ${deck.id}:`, error);
        results.failed++;
        results.errors.push(`${deck.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      results.processed++;
    }

    console.log(
      `[Cron] Batch processing complete. Processed: ${results.processed}, Success: ${results.successful}, Failed: ${results.failed}`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} decks`,
      ...results,
    });
  } catch (error) {
    console.error("[Cron] Batch processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Batch processing failed",
      },
      { status: 500 }
    );
  }
}

