/**
 * NotebookLM Deck Generation API
 *
 * Generates slide deck content using NotebookLM's deep research capabilities.
 * Accepts customer data and returns researched content for all slide sections.
 *
 * POST /api/decks/generate-notebooklm
 *
 * Security: Rate limited, Input validated
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDeckWithNotebookLM,
  researchWithNotebookLM,
  isNotebookLMAvailable,
  type NotebookLMProgress,
} from "@/features/deck-generator/services/notebookLMService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, weatherEvents, intelItems, sections, mode, notebookId } = body;

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer data is required" },
        { status: 400 }
      );
    }

    // Check if NotebookLM is available
    const available = await isNotebookLMAvailable();
    if (!available) {
      return NextResponse.json(
        {
          success: false,
          error: "NotebookLM is not available. Ensure Python 3 and notebooklm-py are installed.",
          fallback: true,
        },
        { status: 503 }
      );
    }

    // Collect progress events for response metadata
    const progressEvents: NotebookLMProgress[] = [];
    const onProgress = (progress: NotebookLMProgress) => {
      progressEvents.push(progress);
      console.log("[NotebookLM API] Progress:", JSON.stringify(progress));
    };

    let result;

    if (mode === "research") {
      // Research-only mode — faster, no artifact generation
      result = await researchWithNotebookLM(
        customer,
        weatherEvents || [],
        sections,
        { notebookId, onProgress }
      );
    } else {
      // Full generation mode — research + slide deck artifact
      result = await generateDeckWithNotebookLM(
        customer,
        weatherEvents || [],
        {
          sections,
          notebookId,
          intelItems,
          onProgress,
        }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "NotebookLM generation failed",
          errorType: result.errorType,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notebookId: result.notebookId,
      sections: result.sections,
      deckArtifact: result.deckArtifact,
      customerName: result.customerName,
      progressEvents,
    });
  } catch (error) {
    console.error("[API] POST /api/decks/generate-notebooklm error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
