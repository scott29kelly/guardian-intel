"use client";

import { useState, useCallback } from 'react';
import type {
  DeckTemplate,
  DeckGenerationRequest,
  DeckGenerationProgress,
  GeneratedDeck,
} from '../types/deck.types';

// Simple UUID generator (no external dependency needed)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface UseDeckGenerationReturn {
  isGenerating: boolean;
  progress: DeckGenerationProgress | null;
  generatedDeck: GeneratedDeck | null;
  error: string | null;
  asyncJobId: string | null;
  generateDeck: (template: DeckTemplate, request: DeckGenerationRequest) => Promise<GeneratedDeck | null>;
  setDeckFromResult: (resultPayload: string, deckId: string, pdfUrl?: string) => void;
  resetGeneration: () => void;
}

// =============================================================================
// NOTEBOOKLM ASYNC DECK GENERATION
// =============================================================================

interface ScheduleResponse {
  success: boolean;
  job?: { id: string };
  error?: string;
}

/**
 * Schedule a deck via the async pipeline:
 * 1. POST /api/decks/schedule — creates a ScheduledDeck (status=pending)
 * 2. POST /api/decks/process-now — triggers immediate background processing
 *
 * Returns the job ID so the UI can poll via useDeckStatus.
 */
async function scheduleNotebookLMDeck(
  customerId: string,
  templateId: string,
  templateName: string,
  onProgress: (update: Partial<DeckGenerationProgress>) => void
): Promise<{ asyncJobId: string } | null> {
  onProgress({
    status: "generating-slides",
    message: "Scheduling NotebookLM generation...",
    progress: 10,
  });

  try {
    // Step 1: Schedule the deck
    const scheduleResponse = await fetch("/api/decks/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, templateId, templateName }),
      redirect: "manual", // Don't follow auth redirects — treat as failure
    });

    // Check for redirect (auth middleware sends to /login)
    if (scheduleResponse.status >= 300 && scheduleResponse.status < 400) {
      console.error("[NotebookLM] Schedule redirected (auth issue) — status:", scheduleResponse.status);
      return null;
    }

    if (!scheduleResponse.ok) {
      const responseText = await scheduleResponse.text();
      let err: Record<string, unknown> = {};
      try { err = JSON.parse(responseText); } catch {
        console.error("[NotebookLM] Schedule returned non-JSON:", responseText.substring(0, 200));
        return null;
      }

      // 409 = existing pending/processing job — join that poll instead of falling back
      if (scheduleResponse.status === 409 && err.existingJobId) {
        console.log(`[NotebookLM] Existing job found: ${err.existingJobId} (status: ${err.status})`);
        return { asyncJobId: err.existingJobId as string };
      }

      console.error(`[NotebookLM] Schedule failed (${scheduleResponse.status}):`, err);
      return null;
    }

    // Parse response — guard against HTML login pages that slipped through
    const responseText = await scheduleResponse.text();
    let scheduleData: ScheduleResponse;
    try {
      scheduleData = JSON.parse(responseText);
    } catch {
      console.error("[NotebookLM] Schedule returned non-JSON response:", responseText.substring(0, 200));
      return null;
    }

    if (!scheduleData.success || !scheduleData.job?.id) {
      console.error("[NotebookLM] Schedule returned no job:", scheduleData);
      return null;
    }

    const jobId = scheduleData.job.id;

    onProgress({
      message: "Starting NotebookLM processing...",
      progress: 15,
    });

    // Step 2: Trigger immediate processing
    const processResponse = await fetch("/api/decks/process-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId: jobId }),
    });

    if (!processResponse.ok) {
      const err = await processResponse.json().catch(() => ({}));
      console.warn("[NotebookLM] Process-now failed (cron will pick it up):", err);
      // Don't return null — the job is still scheduled, cron will process it
    }

    console.log(`[NotebookLM] Async job started: ${jobId}`);
    return { asyncJobId: jobId };
  } catch (error) {
    console.error("[NotebookLM] Schedule error:", error);
    return null;
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useDeckGeneration(): UseDeckGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DeckGenerationProgress | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);

  const updateProgress = useCallback((update: Partial<DeckGenerationProgress>) => {
    setProgress(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const generateDeck = useCallback(async (
    template: DeckTemplate,
    request: DeckGenerationRequest
  ): Promise<GeneratedDeck | null> => {
    const startTime = Date.now();
    setIsGenerating(true);
    setError(null);
    setGeneratedDeck(null);
    setAsyncJobId(null);

    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    const totalSteps = enabledSections.length * 2 + 2;

    try {
      // Step 1: Initialize
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Loading customer intelligence...',
        progress: 5,
      });

      // Step 2: Try async NotebookLM pipeline first
      if (request.context.customerId) {
        const nlmResult = await scheduleNotebookLMDeck(
          request.context.customerId,
          template.id,
          template.name,
          updateProgress
        );

        if (nlmResult?.asyncJobId) {
          // Async job started — store job ID and return early.
          // The UI should use useDeckStatus (from src/lib/hooks/use-deck-generation.ts)
          // to poll for completion. That hook auto-polls every 10s while pending/processing.
          setAsyncJobId(nlmResult.asyncJobId);
          setIsGenerating(false);
          setProgress({
            status: 'generating-slides',
            currentStep: 2,
            totalSteps,
            message: 'NotebookLM is generating your deck in the background. You can navigate away — we\'ll notify you when it\'s ready.',
            progress: 20,
          });

          console.log(`[DeckGeneration] Async NotebookLM job started: ${nlmResult.asyncJobId}`);
          return null; // No synchronous deck — poll via useDeckStatus
        }

        // Scheduling failed — don't silently fall back to Gemini (takes 30+ min).
        // Show error so user can retry or check browser console for details.
        console.error("[DeckGeneration] NotebookLM async scheduling failed — check console for [NotebookLM] errors above");
        throw new Error("NotebookLM scheduling failed. Check browser console for details, then retry.");
      }

      // No customerId — cannot generate without a customer
      throw new Error("A customer must be selected to generate a deck.");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate deck';
      setError(errorMessage);
      setProgress({
        status: 'error',
        currentStep: 0,
        totalSteps,
        message: errorMessage,
        progress: 0,
      });
      return null;

    } finally {
      setIsGenerating(false);
    }
  }, [updateProgress]);

  /**
   * Parse an async result payload (from ScheduledDeck) into a GeneratedDeck for preview.
   */
  const setDeckFromResult = useCallback((resultPayload: string, deckId: string, pdfUrl?: string) => {
    try {
      const result = JSON.parse(resultPayload);

      // Map slide images from the result
      let slides = (result.slides || []).map((s: { id: string; pageNumber?: number; imageData?: string; generatedAt?: string }) => ({
        id: s.id || generateId(),
        type: "image" as const,
        sectionId: s.id || `slide-${s.pageNumber}`,
        content: { title: `Slide ${s.pageNumber || 1}`, nlmGenerated: true },
        aiGenerated: true,
        generatedAt: s.generatedAt || new Date().toISOString(),
        imageData: s.imageData,
      }));

      // Fallback: if no slide images but pdfUrl or pdfData exists, create a placeholder
      if (slides.length === 0 && (pdfUrl || result.pdfData)) {
        slides = [{
          id: `${deckId}-pdf-fallback`,
          type: "image" as const,
          sectionId: "pdf-fallback",
          content: {
            title: "NotebookLM Deck (PDF)",
            nlmGenerated: true,
            // Only embed pdfData if no URL available (avoids 6MB+ in React state)
            ...(result.pdfData && !pdfUrl ? { pdfData: result.pdfData } : {}),
          },
          aiGenerated: true,
          generatedAt: new Date().toISOString(),
          imageData: undefined,
        }];
      }

      const deck: GeneratedDeck = {
        id: result.id || deckId,
        templateId: result.templateId || "",
        templateName: result.templateName || "NotebookLM Deck",
        generatedAt: result.generatedAt || new Date().toISOString(),
        generatedBy: "current-user",
        context: result.context || {},
        slides,
        pdfUrl: pdfUrl || undefined,
        branding: {
          colors: {
            primary: "#1E3A5F",
            secondary: "#D4A656",
            accent: "#4A90A4",
            background: "#1E3A5F",
            backgroundAlt: "#162D4A",
            text: "#F9FAFB",
            textMuted: "#9CA3AF",
            success: "#10B981",
            warning: "#F59E0B",
            danger: "#EF4444",
          },
          fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
          logo: "/logo.png",
          footer: "Guardian Roofing",
          borderRadius: "8px",
        },
        metadata: {
          totalSlides: result.metadata?.totalSlides || result.slides?.length || 0,
          aiSlidesCount: result.slides?.length || 0,
          generationTimeMs: result.metadata?.generationTimeMs || 0,
          version: "2.0.0",
        },
      };
      setGeneratedDeck(deck);
      setAsyncJobId(null);
      setProgress({
        status: "complete",
        currentStep: 1,
        totalSteps: 1,
        message: `Generated ${deck.slides.length} slides via NotebookLM`,
        progress: 100,
      });
    } catch (err) {
      console.error("[DeckGeneration] Failed to parse result payload:", err);
      setError("Failed to load completed deck");
    }
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setGeneratedDeck(null);
    setError(null);
    setAsyncJobId(null);
  }, []);

  return {
    isGenerating,
    progress,
    generatedDeck,
    error,
    asyncJobId,
    generateDeck,
    setDeckFromResult,
    resetGeneration,
  };
}
