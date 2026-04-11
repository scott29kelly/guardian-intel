/**
 * useCustomerArtifacts Hook
 *
 * TanStack Query polling hook for multi-artifact generation status.
 * Fetches per-artifact state from the status endpoint and exposes a
 * generate mutation to trigger new artifact generation.
 *
 * Polling behavior:
 * - Polls every 3 seconds while any artifact is in a non-terminal state
 * - Stops polling when all artifacts reach terminal state (ready/failed/skipped)
 * - Does not poll when no deck row exists for the customer
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TERMINAL_STATES } from "@/features/multi-artifact";
import type {
  ArtifactStatus,
  ArtifactsResponse,
  ArtifactState,
  GenerateArtifactsInput,
  GenerateArtifactsResponse,
} from "@/features/multi-artifact";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const artifactKeys = {
  all: ["artifacts"] as const,
  customer: (customerId: string) => ["artifacts", "customer", customerId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether every artifact has reached a terminal state (or has no data).
 * A null status means the artifact was never requested -- treat as terminal
 * so polling does not continue indefinitely for legacy single-deck rows.
 */
function isAllTerminal(artifacts: ArtifactsResponse["artifacts"]): boolean {
  return Object.values(artifacts).every(
    (a: ArtifactState) =>
      a.status === null ||
      (TERMINAL_STATES as readonly string[]).includes(a.status),
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCustomerArtifacts(customerId: string | undefined) {
  const queryClient = useQueryClient();

  // --- Status polling query ---
  const statusQuery = useQuery<ArtifactsResponse>({
    queryKey: artifactKeys.customer(customerId!),
    queryFn: async (): Promise<ArtifactsResponse> => {
      const response = await fetch(`/api/decks/status/${customerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artifact status");
      }
      return response.json();
    },
    enabled: !!customerId,
    refetchInterval: (query) => {
      const data = query.state.data;

      // No deck row exists -- nothing to poll
      if (!data?.hasDeck) return false;

      // All artifacts in terminal state -- stop polling
      if (data.artifacts && isAllTerminal(data.artifacts)) return false;

      // Still processing -- poll every 3 seconds
      return 3000;
    },
    staleTime: 2000,
  });

  // --- Generate mutation ---
  const generateMutation = useMutation<
    GenerateArtifactsResponse,
    Error,
    GenerateArtifactsInput
  >({
    mutationFn: async (input: GenerateArtifactsInput): Promise<GenerateArtifactsResponse> => {
      const response = await fetch("/api/ai/generate-customer-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start artifact generation");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate status query to trigger immediate re-fetch
      queryClient.invalidateQueries({
        queryKey: artifactKeys.customer(customerId!),
      });
    },
  });

  // --- Return combined API ---
  return {
    // Status data
    artifacts: statusQuery.data?.artifacts ?? null,
    hasDeck: statusQuery.data?.hasDeck ?? false,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,

    // Convenience flags
    isAllTerminal: statusQuery.data?.artifacts
      ? isAllTerminal(statusQuery.data.artifacts)
      : false,
    isAnyProcessing: statusQuery.data?.artifacts
      ? Object.values(statusQuery.data.artifacts).some(
          (a: ArtifactState) => a.status === "processing",
        )
      : false,

    // Actions
    generate: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error,
  };
}
