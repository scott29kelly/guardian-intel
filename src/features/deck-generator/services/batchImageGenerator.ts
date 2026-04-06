/**
 * Batch Image Generator Service
 *
 * Processes scheduled decks overnight for next-day availability.
 * Uses NotebookLM as the exclusive generation pipeline.
 */

import type { SlideType, SlideContent, BrandingConfig } from '../types/deck.types';
import {
  generateCustomerDeck,
  healthCheck,
  type CustomerDeckRequest,
} from '@/lib/services/notebooklm/index';
import * as fs from 'fs/promises';

export interface BatchSlideRequest {
  slideId: string;
  slide: {
    type: SlideType;
    sectionId: string;
    content: SlideContent;
  };
  branding: BrandingConfig;
  slideNumber: number;
  totalSlides: number;
}

interface BatchJobResult {
  slideId: string;
  success: boolean;
  imageData?: string;
  mimeType?: string;
  error?: string;
}

// =============================================================================
// NOTEBOOKLM BATCH GENERATION
// =============================================================================

export interface BatchDeckRequest {
  customerName: string;
  customerDataText: string;
  weatherHistoryText?: string;
  templateInstructions: string;
  audience: "internal" | "customer-facing";
  slideIds: string[];
}

/**
 * Generate a complete deck via NotebookLM and return results mapped to slide IDs.
 */
export async function processDeckViaNotebookLM(
  request: BatchDeckRequest
): Promise<BatchJobResult[]> {
  const health = await healthCheck();
  if (!health.ok) {
    throw new Error(`NotebookLM unavailable: ${health.error}`);
  }

  const deckRequest: CustomerDeckRequest = {
    customerName: request.customerName,
    customerData: request.customerDataText,
    weatherHistory: request.weatherHistoryText,
    templateInstructions: request.templateInstructions,
    audience: request.audience,
  };

  console.log(`[Batch-NLM] Generating deck for ${request.customerName}`);
  const result = await generateCustomerDeck(deckRequest);

  if (!result.success || !result.outputPath) {
    return request.slideIds.map((slideId) => ({
      slideId,
      success: false,
      error: result.error || "NotebookLM generation failed",
    }));
  }

  // Convert PDF to images
  try {
    const { pdf } = await import("pdf-to-img");
    const pdfBuffer = await fs.readFile(result.outputPath);
    const document = await pdf(pdfBuffer, { scale: 2 });

    const images: string[] = [];
    for await (const page of document) {
      images.push(Buffer.from(page).toString("base64"));
    }

    // Clean up temp file
    fs.unlink(result.outputPath).catch(() => {});

    // Map images to slide IDs
    return request.slideIds.map((slideId, index) => {
      if (index < images.length) {
        return {
          slideId,
          success: true,
          imageData: images[index],
          mimeType: "image/png",
        };
      }
      return {
        slideId,
        success: false,
        error: `NotebookLM generated ${images.length} pages but expected at least ${index + 1}`,
      };
    });
  } catch (conversionError) {
    fs.unlink(result.outputPath).catch(() => {});
    throw new Error(`PDF conversion failed: ${conversionError}`);
  }
}

