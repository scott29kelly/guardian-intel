"use client";

/**
 * useInfographicBatch Hook
 *
 * Manages batch infographic generation for multiple customers. Schedules
 * NotebookLM jobs via POST, then polls each customer's ScheduledDeck status
 * via the deck status endpoint.
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface BatchCustomerStatus {
  customerId: string;
  deckId?: string;
  status: "pending" | "generating" | "complete" | "error";
  imageUrl?: string;
  error?: string;
}

interface UseInfographicBatchReturn {
  isBatching: boolean;
  batchProgress: BatchCustomerStatus[];
  startBatch: (customerIds: string[]) => Promise<void>;
  cancelBatch: () => void;
}

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 10000;

export function useInfographicBatch(): UseInfographicBatchReturn {
  const [isBatching, setIsBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchCustomerStatus[]>([]);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deckIdsRef = useRef<Array<{ customerId: string; deckId: string }>>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollBatchStatus = useCallback(async () => {
    const entries = deckIdsRef.current;
    if (entries.length === 0) return;

    const updatedProgress: BatchCustomerStatus[] = [];

    for (const { customerId, deckId } of entries) {
      try {
        const res = await fetch(`/api/decks/status/${customerId}?deckId=${deckId}`);
        if (!res.ok) {
          updatedProgress.push({ customerId, deckId, status: "error", error: "Status check failed" });
          continue;
        }
        const data = await res.json();
        const deck = data.deck;

        if (data.isCompleted && deck?.infographicUrl) {
          updatedProgress.push({ customerId, deckId, status: "complete", imageUrl: deck.infographicUrl });
        } else if (data.isFailed) {
          updatedProgress.push({ customerId, deckId, status: "error", error: deck?.errorMessage || "Failed" });
        } else if (data.isProcessing) {
          updatedProgress.push({ customerId, deckId, status: "generating" });
        } else {
          updatedProgress.push({ customerId, deckId, status: "pending" });
        }
      } catch {
        updatedProgress.push({ customerId, deckId, status: "error", error: "Network error" });
      }
    }

    if (!mountedRef.current) return;
    setBatchProgress(updatedProgress);

    // Stop polling when all are done
    const allDone = updatedProgress.every(
      (c) => c.status === "complete" || c.status === "error",
    );
    if (allDone) {
      stopPolling();
      setIsBatching(false);
    }
  }, [stopPolling]);

  const startBatch = useCallback(
    async (customerIds: string[]): Promise<void> => {
      stopPolling();

      const initialProgress: BatchCustomerStatus[] = customerIds.map(
        (customerId) => ({ customerId, status: "pending" as const }),
      );
      setBatchProgress(initialProgress);
      setIsBatching(true);

      try {
        const res = await fetch("/api/ai/generate-infographic/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerIds, autoSelectPresets: true }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({ error: "Batch initiation failed" }));
          throw new Error(errorBody.error || "Batch initiation failed");
        }

        const data = await res.json();
        const deckIds: string[] = data.deckIds || [];

        // Map deckIds back to customerIds (same order)
        deckIdsRef.current = customerIds
          .map((customerId, i) => ({ customerId, deckId: deckIds[i] }))
          .filter((entry) => entry.deckId);

        // Start polling
        pollingIntervalRef.current = setInterval(pollBatchStatus, POLL_INTERVAL_MS);
      } catch (err) {
        if (mountedRef.current) {
          setIsBatching(false);
          setBatchProgress(
            customerIds.map((customerId) => ({
              customerId,
              status: "error" as const,
              error: err instanceof Error ? err.message : "Batch initiation failed",
            })),
          );
        }
      }
    },
    [stopPolling, pollBatchStatus],
  );

  const cancelBatch = useCallback(() => {
    stopPolling();
    deckIdsRef.current = [];
    setIsBatching(false);
  }, [stopPolling]);

  return {
    isBatching,
    batchProgress,
    startBatch,
    cancelBatch,
  };
}
