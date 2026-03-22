"use client";

/**
 * useInfographicBatch Hook
 *
 * Manages batch infographic generation for multiple customers. Initiates a
 * batch job via POST, then polls the status endpoint every 2 seconds to
 * progressively deliver per-customer results as they complete.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { InfographicResponse } from "../types/infographic.types";

export interface BatchCustomerStatus {
  customerId: string;
  status: "pending" | "generating" | "complete" | "error";
  result?: InfographicResponse;
  error?: string;
}

interface UseInfographicBatchReturn {
  isBatching: boolean;
  batchProgress: BatchCustomerStatus[];
  startBatch: (customerIds: string[]) => Promise<void>;
  cancelBatch: () => void;
}

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 2000;

export function useInfographicBatch(): UseInfographicBatchReturn {
  const [isBatching, setIsBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchCustomerStatus[]>([]);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Track mount state for cleanup
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
    const jobId = jobIdRef.current;
    if (!jobId) return;

    try {
      const res = await fetch(`/api/ai/generate-infographic/batch/${jobId}`);

      if (!res.ok) {
        console.error("[useInfographicBatch] Polling error:", res.status);
        return;
      }

      const data = await res.json();

      if (!mountedRef.current) return;

      // Map API response to BatchCustomerStatus array
      const updatedProgress: BatchCustomerStatus[] = (
        data.customers as Array<{
          customerId: string;
          status: "pending" | "generating" | "complete" | "error";
          result?: InfographicResponse;
          error?: string;
        }>
      ).map((c) => ({
        customerId: c.customerId,
        status: c.status,
        result: c.result,
        error: c.error,
      }));

      setBatchProgress(updatedProgress);

      // Stop polling when batch is complete
      if (data.status === "complete") {
        stopPolling();
        setIsBatching(false);
      }
    } catch (err) {
      console.error("[useInfographicBatch] Polling fetch error:", err);
    }
  }, [stopPolling]);

  const startBatch = useCallback(
    async (customerIds: string[]): Promise<void> => {
      // Stop any existing polling
      stopPolling();

      // Initialize all customers as pending
      const initialProgress: BatchCustomerStatus[] = customerIds.map(
        (customerId) => ({
          customerId,
          status: "pending" as const,
        }),
      );

      setBatchProgress(initialProgress);
      setIsBatching(true);

      try {
        const res = await fetch("/api/ai/generate-infographic/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerIds,
            autoSelectPresets: true,
          }),
        });

        if (!res.ok) {
          const errorBody = await res
            .json()
            .catch(() => ({ error: "Batch initiation failed" }));
          throw new Error(errorBody.error || "Batch initiation failed");
        }

        const data = await res.json();
        jobIdRef.current = data.jobId;

        // Start polling every 2 seconds
        pollingIntervalRef.current = setInterval(pollBatchStatus, POLL_INTERVAL_MS);
      } catch (err) {
        console.error("[useInfographicBatch] Start batch error:", err);
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
    jobIdRef.current = null;
    setIsBatching(false);
  }, [stopPolling]);

  return {
    isBatching,
    batchProgress,
    startBatch,
    cancelBatch,
  };
}
