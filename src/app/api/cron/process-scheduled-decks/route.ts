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
import { processSlidesSynchronously, type BatchSlideRequest } from "@/features/deck-generator/services/batchImageGenerator";

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

    // Process each deck
    for (const deck of pendingDecks) {
      const startTime = Date.now();

      try {
        // Mark as processing
        await prisma.scheduledDeck.update({
          where: { id: deck.id },
          data: { status: "processing" },
        });

        // Parse the request payload
        const requestData = JSON.parse(deck.requestPayload);
        const { templateId, options } = requestData;

        console.log(`[Cron] Processing deck ${deck.id} for ${deck.customerName}`);

        // Fetch template sections (simplified - would normally fetch from DB/config)
        const enabledSections = options?.enabledSections || [];

        // Build slide requests for batch processing
        const slideRequests: BatchSlideRequest[] = enabledSections.map(
          (sectionId: string, index: number) => ({
            slideId: `${deck.id}-slide-${index}`,
            slide: {
              type: getSectionType(sectionId),
              sectionId,
              content: { title: formatSectionTitle(sectionId) }, // Simplified content
            },
            branding: getDefaultBranding(),
            slideNumber: index + 1,
            totalSlides: enabledSections.length,
          })
        );

        // Process slides (using synchronous method for now)
        const slideResults = await processSlidesSynchronously(slideRequests);

        // Build generated deck result
        const slides = slideResults.map((result, index) => ({
          id: result.slideId,
          type: slideRequests[index].slide.type,
          sectionId: slideRequests[index].slide.sectionId,
          content: slideRequests[index].slide.content,
          imageData: result.success ? result.imageData : undefined,
          imageError: result.success ? undefined : result.error,
          generatedAt: new Date().toISOString(),
        }));

        const generatedDeck = {
          id: deck.id,
          templateId,
          templateName: deck.templateName,
          generatedAt: new Date().toISOString(),
          context: { customerId: deck.customerId, customerName: deck.customerName },
          slides,
          branding: getDefaultBranding(),
          metadata: {
            totalSlides: slides.length,
            aiSlidesCount: slides.filter((s) => s.imageData).length,
            generationTimeMs: Date.now() - startTime,
            version: "1.0.0",
            batchProcessed: true,
          },
        };

        // Update deck with results
        await prisma.scheduledDeck.update({
          where: { id: deck.id },
          data: {
            status: "completed",
            resultPayload: JSON.stringify(generatedDeck),
            completedAt: new Date(),
            actualSlides: slides.length,
            processingTimeMs: Date.now() - startTime,
          },
        });

        console.log(`[Cron] Completed deck ${deck.id} in ${Date.now() - startTime}ms`);
        results.successful++;
      } catch (error) {
        console.error(`[Cron] Failed to process deck ${deck.id}:`, error);

        // Mark as failed
        await prisma.scheduledDeck.update({
          where: { id: deck.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            retryCount: { increment: 1 },
          },
        });

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

// Helper to determine section type
function getSectionType(sectionId: string): "title" | "stats" | "list" | "timeline" | "talking-points" | "chart" | "image" {
  const typeMap: Record<string, "title" | "stats" | "list" | "timeline" | "talking-points" | "chart" | "image"> = {
    "cover": "title",
    "customer-overview": "stats",
    "talking-points": "talking-points",
    "objection-handling": "list",
    "storm-exposure": "timeline",
    "recommended-actions": "list",
  };
  return typeMap[sectionId] || "list";
}

// Helper to format section title
function formatSectionTitle(sectionId: string): string {
  return sectionId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Default branding config
function getDefaultBranding() {
  return {
    colors: {
      primary: "#3B82F6",
      secondary: "#F59E0B",
      background: "#1F2937",
      text: "#F9FAFB",
      textMuted: "#9CA3AF",
      success: "#10B981",
      warning: "#F59E0B",
      danger: "#EF4444",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
  };
}
