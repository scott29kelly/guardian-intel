/**
 * Deck Processing Service
 *
 * Shared pipeline for processing ScheduledDeck jobs via NotebookLM.
 * Used by both the /api/decks/process-now route (immediate) and
 * the /api/cron/process-scheduled-decks route (batch).
 */

import { prisma } from "@/lib/prisma";
import {
  generateCustomerDeck,
  healthCheck,
} from "@/lib/services/notebooklm/index";
import type { CustomerDeckRequest } from "@/lib/services/notebooklm/index";
import {
  formatCustomerDataForNotebook,
  formatWeatherHistoryForNotebook,
  pdfToImages,
} from "@/lib/services/notebooklm/formatters";
import * as fs from "fs/promises";

// =============================================================================
// TYPES
// =============================================================================

interface ProcessingResult {
  success: boolean;
  deckId: string;
  error?: string;
  slideCount?: number;
  processingTimeMs?: number;
}

// =============================================================================
// MAIN PROCESSING FUNCTION
// =============================================================================

/**
 * Process a single ScheduledDeck via NotebookLM.
 *
 * 1. Parse requestPayload for customer data
 * 2. Format data for NotebookLM
 * 3. Generate deck via NotebookLM CLI
 * 4. Convert PDF to slide images
 * 5. Optionally upload PDF to Supabase Storage
 * 6. Update ScheduledDeck record with results
 * 7. Send push notification to requesting user
 */
export async function processDeckWithNotebookLM(
  deckId: string
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Fetch the deck record
  const deck = await prisma.scheduledDeck.findUnique({
    where: { id: deckId },
  });

  if (!deck) {
    return { success: false, deckId, error: "Deck not found" };
  }

  if (deck.status !== "processing") {
    return { success: false, deckId, error: `Unexpected status: ${deck.status}` };
  }

  console.log(`[DeckProcessing] Starting NotebookLM processing for deck ${deckId} (${deck.customerName})`);

  try {
    // Step 1: Check NotebookLM health
    const health = await healthCheck();
    if (!health.ok) {
      throw new Error(`NotebookLM unavailable: ${health.error}`);
    }

    // Step 2: Parse request payload and format for NotebookLM
    const requestData = JSON.parse(deck.requestPayload);
    const customer = requestData.customer;

    const customerDataText = formatCustomerDataForNotebook({
      firstName: customer.firstName,
      lastName: customer.lastName,
      address: customer.address?.street || "",
      city: customer.address?.city || "",
      state: customer.address?.state || "",
      zipCode: customer.address?.zipCode || "",
      propertyType: customer.property?.type,
      yearBuilt: customer.property?.yearBuilt,
      squareFootage: customer.property?.squareFootage,
      roofType: customer.roof?.type,
      roofAge: customer.roof?.age,
      propertyValue: customer.property?.value,
      insuranceCarrier: customer.insurance?.carrier,
      policyType: customer.insurance?.policyType,
      deductible: customer.insurance?.deductible,
      leadScore: customer.scores?.lead,
      urgencyScore: customer.scores?.urgency,
      stage: customer.pipeline?.stage,
      status: customer.pipeline?.status,
      leadSource: customer.pipeline?.leadSource,
    });

    const weatherHistoryText = formatWeatherHistoryForNotebook(
      requestData.weatherEvents?.map((e: { type: string; date: string; severity?: string; hailSize?: number; windSpeed?: number }) => ({
        eventType: e.type,
        eventDate: e.date,
        severity: e.severity,
        hailSize: e.hailSize,
        windSpeed: e.windSpeed,
        damageReported: false,
        claimFiled: false,
      }))
    );

    // Step 3: Build template instructions
    const templateInstructions = `Create a professional ${deck.templateName} presentation for Guardian Roofing.
This deck is for ${deck.customerName}.

Style requirements:
- Use a dark navy (#1E3A5F) and gold (#D4A656) color scheme
- Professional, corporate aesthetic suitable for the roofing industry
- Include data visualizations where relevant
- Make it visually impactful and easy to scan quickly`;

    const deckRequest: CustomerDeckRequest = {
      customerName: deck.customerName,
      customerData: customerDataText,
      weatherHistory: weatherHistoryText || undefined,
      templateInstructions,
      audience: "internal",
    };

    // Step 4: Generate via NotebookLM
    console.log(`[DeckProcessing] Calling NotebookLM for ${deck.customerName}...`);
    const result = await generateCustomerDeck(deckRequest);

    if (!result.success || !result.outputPath) {
      throw new Error(result.error || "NotebookLM generation failed");
    }

    // Step 5: Convert PDF to slide images
    console.log(`[DeckProcessing] Converting PDF to images...`);
    let slideImages: string[] = [];
    let pdfData: string | undefined;

    try {
      slideImages = await pdfToImages(result.outputPath);
    } catch (conversionError) {
      console.warn("[DeckProcessing] PDF-to-image conversion failed, storing PDF as base64:", conversionError);
      const pdfBuffer = await fs.readFile(result.outputPath);
      pdfData = pdfBuffer.toString("base64");
    }

    // Step 6: Upload PDF to Supabase Storage (if configured)
    let pdfUrl: string | undefined;
    let pdfStoragePath: string | undefined;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "deck-pdfs";
        const storagePath = `decks/${deckId}/${deck.customerName.replace(/\s+/g, "-")}.pdf`;

        const pdfBuffer = await fs.readFile(result.outputPath);
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);
          pdfUrl = urlData.publicUrl;
          pdfStoragePath = storagePath;
          console.log(`[DeckProcessing] PDF uploaded to: ${pdfUrl}`);
        } else {
          console.warn("[DeckProcessing] PDF upload failed:", uploadError.message);
        }
      }
    } catch (uploadErr) {
      console.warn("[DeckProcessing] Supabase upload error:", uploadErr);
    }

    // Clean up temp PDF
    fs.unlink(result.outputPath).catch(() => {});

    // Step 7: Build result payload
    const processingTimeMs = Date.now() - startTime;
    const resultPayload = {
      id: deckId,
      templateId: deck.templateId,
      templateName: deck.templateName,
      generatedAt: new Date().toISOString(),
      context: { customerId: deck.customerId, customerName: deck.customerName },
      pipeline: "NotebookLM",
      slides: slideImages.map((imageData, index) => ({
        id: `${deckId}-slide-${index + 1}`,
        pageNumber: index + 1,
        imageData,
        mimeType: "image/png",
        generatedAt: new Date().toISOString(),
      })),
      pdfData, // base64 PDF fallback if image conversion failed
      metadata: {
        totalSlides: slideImages.length,
        generationTimeMs: processingTimeMs,
        version: "2.0.0",
        pipeline: "NotebookLM",
      },
    };

    // Step 8: Update ScheduledDeck
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: {
        status: "completed",
        resultPayload: JSON.stringify(resultPayload),
        completedAt: new Date(),
        actualSlides: slideImages.length,
        processingTimeMs,
        ...(pdfUrl ? { pdfUrl } : {}),
        ...(pdfStoragePath ? { pdfStoragePath } : {}),
      },
    });

    console.log(`[DeckProcessing] Completed deck ${deckId} in ${processingTimeMs}ms (${slideImages.length} slides)`);

    // Step 9: Send push notification
    await sendDeckCompletionNotification(deck.requestedById, deck.customerName, deckId);

    return {
      success: true,
      deckId,
      slideCount: slideImages.length,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[DeckProcessing] Failed to process deck ${deckId}:`, errorMessage);

    // Mark as failed
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: {
        status: "failed",
        errorMessage,
        retryCount: { increment: 1 },
        processingTimeMs: Date.now() - startTime,
      },
    });

    // Notify user of failure
    await sendDeckFailureNotification(deck.requestedById, deck.customerName, deckId);

    return { success: false, deckId, error: errorMessage };
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

async function sendDeckCompletionNotification(
  userId: string,
  customerName: string,
  deckId: string
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload: {
          title: "Deck Ready",
          body: `Your deck for ${customerName} is ready to view.`,
          tag: `deck-${deckId}`,
          data: {
            type: "deal",
            url: `/decks?deckId=${deckId}`,
            entityId: deckId,
          },
        },
        userIds: [userId],
        type: "specific",
      }),
    });
  } catch (err) {
    console.warn("[DeckProcessing] Failed to send completion notification:", err);
  }
}

async function sendDeckFailureNotification(
  userId: string,
  customerName: string,
  deckId: string
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload: {
          title: "Deck Generation Failed",
          body: `The deck for ${customerName} could not be generated. You can retry from the deck panel.`,
          tag: `deck-${deckId}`,
          data: {
            type: "deal",
            url: `/decks?deckId=${deckId}`,
            entityId: deckId,
          },
        },
        userIds: [userId],
        type: "specific",
      }),
    });
  } catch (err) {
    console.warn("[DeckProcessing] Failed to send failure notification:", err);
  }
}
