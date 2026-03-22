"use client";

/**
 * useInfographicGeneration Hook
 *
 * Manages the full lifecycle of a single infographic generation request:
 * isGenerating state, contextual progress messages, result/error handling,
 * and background generation support via service worker notifications.
 *
 * Progress messages are purely contextual -- no model names are ever exposed.
 */

import { useState, useCallback, useRef, useEffect } from "react";
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
  generate: (request: InfographicRequest) => Promise<InfographicResponse | null>;
  reset: () => void;
}

export function useInfographicGeneration(): UseInfographicGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<InfographicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Track mount state for background generation support
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearProgressTimers = useCallback(() => {
    progressTimersRef.current.forEach((timer) => clearTimeout(timer));
    progressTimersRef.current = [];
  }, []);

  const generate = useCallback(
    async (request: InfographicRequest): Promise<InfographicResponse | null> => {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Reset state
      setIsGenerating(true);
      setError(null);
      setResult(null);
      clearProgressTimers();

      // Simulate progress phases locally (HTTP POST does not stream progress)
      setProgress({
        phase: "data",
        percent: 10,
        statusMessage: "Assembling customer data...",
      });

      const t1 = setTimeout(() => {
        if (mountedRef.current) {
          setProgress({
            phase: "scoring",
            percent: 25,
            statusMessage: "Preparing generation...",
          });
        }
      }, 1500);

      const t2 = setTimeout(() => {
        if (mountedRef.current) {
          setProgress({
            phase: "generating",
            percent: 50,
            statusMessage: "Generating your briefing...",
          });
        }
      }, 3000);

      const t3 = setTimeout(() => {
        if (mountedRef.current) {
          setProgress({
            phase: "generating",
            percent: 70,
            statusMessage: "Almost there...",
          });
        }
      }, 6000);

      progressTimersRef.current = [t1, t2, t3];

      try {
        const res = await fetch("/api/ai/generate-infographic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({ error: "Generation failed" }));
          throw new Error(errorBody.error || "Generation failed");
        }

        const data: InfographicResponse = await res.json();

        if (mountedRef.current) {
          setResult(data);
          setProgress({
            phase: "complete",
            percent: 100,
            statusMessage: "Your briefing is ready!",
          });
        } else {
          // Component unmounted -- fire background notification via service worker
          notifyBackgroundComplete();
        }

        return data;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return null;
        }

        const errorMessage = err instanceof Error ? err.message : "Generation failed";

        if (mountedRef.current) {
          setError(errorMessage);
          setProgress(null);
        }

        return null;
      } finally {
        clearProgressTimers();
        if (mountedRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [clearProgressTimers],
  );

  const reset = useCallback(() => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    clearProgressTimers();
    setIsGenerating(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, [clearProgressTimers]);

  return {
    isGenerating,
    progress,
    result,
    error,
    generate,
    reset,
  };
}

/**
 * Fires a push notification when generation completes after the component
 * has already unmounted (background generation support).
 */
async function notifyBackgroundComplete(): Promise<void> {
  try {
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Briefing Ready", {
        body: "Your infographic briefing has been generated.",
        icon: "/icons/icon-192x192.png",
      });
    }
  } catch {
    // Notification is best-effort; swallow errors silently
  }
}
