/**
 * NotebookLM Deck Generation API Route
 *
 * Generates a complete slide deck via NotebookLM's deep research pipeline.
 * Creates a notebook with customer data, generates a slide deck PDF,
 * then converts each page to a base64 PNG for the deck preview UI.
 *
 * POST /api/ai/generate-deck-notebooklm
 */

import { NextRequest, NextResponse } from "next/server";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for NotebookLM generation

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

interface DeckGenerationRequestBody {
  customerName: string;
  customerData: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType?: string;
    yearBuilt?: number;
    squareFootage?: number;
    roofType?: string;
    roofAge?: number;
    propertyValue?: number;
    insuranceCarrier?: string;
    policyType?: string;
    deductible?: number;
    leadScore?: number;
    urgencyScore?: number;
    stage?: string;
    status?: string;
    leadSource?: string;
  };
  weatherEvents?: Array<{
    eventType: string;
    eventDate: string;
    severity?: string;
    hailSize?: number;
    windSpeed?: number;
    damageReported?: boolean;
    claimFiled?: boolean;
  }>;
  templateInstructions: string;
  audience: "internal" | "customer-facing";
}

// Helpers (formatCustomerDataForNotebook, formatWeatherHistoryForNotebook, pdfToImages)
// are imported from @/lib/services/notebooklm/formatters

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  console.log("[NotebookLM] === ROUTE HIT === POST /api/ai/generate-deck-notebooklm");
  try {
    const body: DeckGenerationRequestBody = await request.json();

    // Validate required fields
    if (!body.customerName || !body.customerData) {
      return NextResponse.json(
        { success: false, error: "Missing customerName or customerData" },
        { status: 400 }
      );
    }

    // Check NotebookLM health first
    console.log("[NotebookLM] Checking service health...");
    const health = await healthCheck();
    if (!health.ok) {
      console.error("[NotebookLM] Health check failed:", health.error);
      return NextResponse.json(
        {
          success: false,
          error: `NotebookLM is not available: ${health.error}`,
          code: "NOTEBOOKLM_UNAVAILABLE",
          retryable: false,
        },
        { status: 503 }
      );
    }

    // Format data for NotebookLM
    const customerDataText = formatCustomerDataForNotebook(body.customerData);
    const weatherHistoryText = formatWeatherHistoryForNotebook(body.weatherEvents);

    const deckRequest: CustomerDeckRequest = {
      customerName: body.customerName,
      customerData: customerDataText,
      weatherHistory: weatherHistoryText || undefined,
      templateInstructions: body.templateInstructions,
      audience: body.audience,
    };

    // Generate the deck via NotebookLM
    console.log(`[NotebookLM] Generating deck for ${body.customerName}...`);
    const result = await generateCustomerDeck(deckRequest);

    if (!result.success || !result.outputPath) {
      console.error("[NotebookLM] Deck generation failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Deck generation failed",
          code: "GENERATION_FAILED",
          retryable: true,
        },
        { status: 500 }
      );
    }

    // Convert PDF pages to base64 PNG images
    console.log("[NotebookLM] Converting PDF to slide images...");
    let slideImages: string[];
    try {
      slideImages = await pdfToImages(result.outputPath);
    } catch (conversionError) {
      console.error("[NotebookLM] PDF conversion failed:", conversionError);

      // Fallback: return the PDF as a base64 blob so the client can still download it
      const pdfBuffer = await fs.readFile(result.outputPath);
      return NextResponse.json({
        success: true,
        format: "pdf",
        pdfData: pdfBuffer.toString("base64"),
        slideCount: 0,
        slides: [],
        message: "Deck generated as PDF (image conversion unavailable)",
      });
    } finally {
      // Clean up temp file
      fs.unlink(result.outputPath).catch(() => {});
    }

    console.log(`[NotebookLM] Successfully generated ${slideImages.length} slide images`);

    return NextResponse.json({
      success: true,
      format: "images",
      slideCount: slideImages.length,
      slides: slideImages.map((imageData, index) => ({
        pageNumber: index + 1,
        imageData,
        mimeType: "image/png",
      })),
    });
  } catch (error) {
    console.error("[NotebookLM] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "UNKNOWN",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
