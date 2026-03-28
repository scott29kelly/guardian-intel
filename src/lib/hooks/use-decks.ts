/**
 * Deck Listing Hook
 *
 * Fetches all decks for the current user via GET /api/decks/schedule.
 * Auto-refreshes while any deck is pending or processing.
 */

import { useQuery } from "@tanstack/react-query";

export interface DeckListItem {
  id: string;
  customerId: string;
  customerName: string;
  templateName: string;
  status: "pending" | "processing" | "completed" | "failed";
  scheduledFor: string;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  processingTimeMs: number | null;
  actualSlides: number | null;
  requestedArtifacts: string[];
  pdfUrl: string | null;
  audioUrl: string | null;
  infographicUrl: string | null;
  reportMarkdown: string | null;
}

interface DecksListResponse {
  decks: DeckListItem[];
  count: number;
}

interface UseDecksOptions {
  status?: string;
  customerId?: string;
  limit?: number;
  enabled?: boolean;
}

const decksPageKeys = {
  all: ["decks", "page"] as const,
  list: (filters?: Record<string, string | undefined>) =>
    ["decks", "page", "list", filters] as const,
};

export function useDecks(options: UseDecksOptions = {}) {
  const { status, customerId, limit = 50, enabled = true } = options;

  const filters = { status, customerId, limit: String(limit) };

  return useQuery({
    queryKey: decksPageKeys.list(filters),
    queryFn: async (): Promise<DecksListResponse> => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (customerId) params.set("customerId", customerId);
      params.set("limit", String(limit));

      const response = await fetch(`/api/decks/schedule?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch decks");
      }
      return response.json();
    },
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActive = data.decks.some(
        (d) => d.status === "pending" || d.status === "processing"
      );
      return hasActive ? 10000 : false;
    },
    staleTime: 5000,
  });
}
