/**
 * useDeckGeneration Hook
 * 
 * Manages deck generation state for a customer:
 * - Schedule new deck generation
 * - Check generation status
 * - Cancel pending jobs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export interface DeckJob {
  id: string;
  customerId: string;
  customerName: string;
  templateName: string;
  status: "pending" | "processing" | "completed" | "failed";
  scheduledFor: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  retryCount: number;
  estimatedSlides: number;
  actualSlides: number | null;
  processingTimeMs: number | null;
  pdfUrl?: string;
  ageMinutes?: number;
  isStale?: boolean;
  requestedBy?: {
    id: string;
    name: string;
  };
}

export interface DeckStatusResponse {
  hasDeck: boolean;
  deck?: DeckJob;
  message?: string;
  isPending: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isReady: boolean;
}

export interface ScheduleDeckRequest {
  customerId: string;
  templateId?: string;
  templateName?: string;
  assignedToId?: string;
  scheduledFor?: string;
}

export interface ScheduleDeckResponse {
  success: boolean;
  job: {
    id: string;
    status: string;
    customerId: string;
    customerName: string;
    templateName: string;
    scheduledFor: string;
    createdAt: string;
  };
  message: string;
}

// Query keys
export const deckQueryKeys = {
  all: ["decks"] as const,
  status: (customerId: string) => ["decks", "status", customerId] as const,
  list: (filters?: Record<string, string>) => ["decks", "list", filters] as const,
};

/**
 * Check deck generation status for a customer
 */
export function useDeckStatus(customerId: string | undefined, options?: { 
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  return useQuery({
    queryKey: deckQueryKeys.status(customerId!),
    queryFn: async (): Promise<DeckStatusResponse> => {
      const response = await fetch(`/api/decks/status/${customerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch deck status");
      }
      return response.json();
    },
    enabled: !!customerId && (options?.enabled !== false),
    // Auto-refresh while pending/processing
    refetchInterval: options?.refetchInterval ?? ((query) => {
      const data = query.state.data;
      if (data?.isPending || data?.isProcessing) {
        return 10000; // Poll every 10s while in progress
      }
      return false; // Don't poll when done
    }),
    staleTime: 5000, // Consider data fresh for 5s
  });
}

/**
 * Schedule a new deck generation
 */
export function useScheduleDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ScheduleDeckRequest): Promise<ScheduleDeckResponse> => {
      const response = await fetch("/api/decks/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule deck");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the status query to refresh UI
      queryClient.invalidateQueries({
        queryKey: deckQueryKeys.status(variables.customerId),
      });
      // Also invalidate any list queries
      queryClient.invalidateQueries({
        queryKey: deckQueryKeys.all,
      });
    },
  });
}

/**
 * Cancel a pending deck job
 */
export function useCancelDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, deckId }: { customerId: string; deckId?: string }) => {
      const url = deckId 
        ? `/api/decks/status/${customerId}?deckId=${deckId}`
        : `/api/decks/status/${customerId}`;
        
      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel deck");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: deckQueryKeys.status(variables.customerId),
      });
    },
  });
}

/**
 * Convenience hook that combines status + actions
 */
export function useDeckGeneration(customerId: string | undefined) {
  const statusQuery = useDeckStatus(customerId);
  const scheduleMutation = useScheduleDeck();
  const cancelMutation = useCancelDeck();

  return {
    // Status
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,

    // Derived state
    hasDeck: statusQuery.data?.hasDeck ?? false,
    isPending: statusQuery.data?.isPending ?? false,
    isProcessing: statusQuery.data?.isProcessing ?? false,
    isCompleted: statusQuery.data?.isCompleted ?? false,
    isFailed: statusQuery.data?.isFailed ?? false,
    isReady: statusQuery.data?.isReady ?? false,
    isInProgress: (statusQuery.data?.isPending || statusQuery.data?.isProcessing) ?? false,

    // Current deck info
    deck: statusQuery.data?.deck,
    pdfUrl: statusQuery.data?.deck?.pdfUrl,

    // Actions
    schedule: (options?: Omit<ScheduleDeckRequest, "customerId">) => {
      if (!customerId) return;
      return scheduleMutation.mutateAsync({ customerId, ...options });
    },
    cancel: (deckId?: string) => {
      if (!customerId) return;
      return cancelMutation.mutateAsync({ customerId, deckId });
    },

    // Action states
    isScheduling: scheduleMutation.isPending,
    isCancelling: cancelMutation.isPending,
    scheduleError: scheduleMutation.error,
    cancelError: cancelMutation.error,
  };
}
