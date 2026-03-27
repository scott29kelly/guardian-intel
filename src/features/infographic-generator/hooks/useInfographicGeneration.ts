"use client";

/**
 * useInfographicGeneration Hook
 *
 * Manages the full lifecycle of a single infographic generation request:
 * schedules a NotebookLM job via the API, then polls for completion
 * using the shared useDeckStatus hook.
 *
 * Progress messages are purely contextual -- no model names are ever exposed.
 */

import { useState, useCallback, useEffect } from "react";
import { useDeckStatus } from "@/lib/hooks/use-deck-generation";
import type {
  InfographicRequest,
  InfographicResponse,
  GenerationProgress,
} from "../types/infographic.types";

interface UseInfographicGenerationReturn {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  result: InfographicResponse | null;
  error: string | null;
  generate: (request: InfographicRequest) => Promise<void>;
  reset: () => void;
}

export function useInfographicGeneration(customerId: string): UseInfographicGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<InfographicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for job status when we have a jobId
  const deckStatus = useDeckStatus(
    jobId ? customerId : undefined,
    { enabled: !!jobId, deckId: jobId || undefined },
  );

  // React to poll results
  useEffect(() => {
    if (!jobId || !deckStatus.data) return;
    const { isPending, isProcessing, isCompleted, isFailed, deck } = deckStatus.data;

    if (isPending) {
      setProgress({ phase: "queued", percent: 15, statusMessage: "Queued for generation..." });
    }
    if (isProcessing) {
      setProgress({ phase: "processing", percent: 45, statusMessage: "NotebookLM is generating your briefing..." });
    }
    if (isCompleted && deck?.infographicUrl) {
      setResult({
        imageUrl: deck.infographicUrl,
        cached: false,
        generationTimeMs: deck.processingTimeMs || 0,
      });
      setProgress({ phase: "complete", percent: 100, statusMessage: "Your briefing is ready!" });
      setIsGenerating(false);
      setJobId(null);
    }
    if (isFailed) {
      setError(deck?.errorMessage || "Generation failed");
      setIsGenerating(false);
      setJobId(null);
    }
  }, [jobId, deckStatus.data]);

  const generate = useCallback(async (request: InfographicRequest) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setProgress({ phase: "data", percent: 5, statusMessage: "Preparing your briefing..." });

    try {
      const res = await fetch("/api/ai/generate-infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule generation");
      }

      if (data.cached) {
        // Cache hit — instant result
        setResult(data);
        setProgress({ phase: "complete", percent: 100, statusMessage: "Your briefing is ready!" });
        setIsGenerating(false);
        return;
      }

      if (data.jobId) {
        setJobId(data.jobId); // Triggers polling via useDeckStatus
        setProgress({ phase: "queued", percent: 10, statusMessage: "Queued for generation..." });
      } else {
        throw new Error("No jobId returned from server");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Generation failed";
      setError(errorMessage);
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    setIsGenerating(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    result,
    error,
    generate,
    reset,
  };
}
