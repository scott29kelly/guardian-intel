/**
 * Playbook API Hooks
 * 
 * React Query hooks for playbook data fetching and mutations.
 * Provides caching, optimistic updates, and automatic refetching.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreatePlaybookInput, UpdatePlaybookInput, PlaybookQueryInput } from "@/lib/validations";

// Types
export interface Playbook {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  content: string;
  stage: string | null;
  scenario: string | null;
  author: string | null;
  isPublished: boolean;
  usageCount: number;
  rating: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PaginatedPlaybooksResponse {
  success: boolean;
  data: Playbook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PlaybookResponse {
  success: boolean;
  playbook: Playbook;
}

// Query Keys
export const playbookKeys = {
  all: ["playbooks"] as const,
  lists: () => [...playbookKeys.all, "list"] as const,
  list: (filters: Partial<PlaybookQueryInput>) => [...playbookKeys.lists(), filters] as const,
  details: () => [...playbookKeys.all, "detail"] as const,
  detail: (id: string) => [...playbookKeys.details(), id] as const,
};

// API Functions
async function fetchPlaybooks(params: Partial<PlaybookQueryInput>): Promise<PaginatedPlaybooksResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`/api/playbooks?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch playbooks");
  }
  
  return response.json();
}

async function fetchPlaybookById(id: string): Promise<PlaybookResponse> {
  const response = await fetch(`/api/playbooks/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch playbook");
  }
  
  return response.json();
}

async function createPlaybook(data: CreatePlaybookInput): Promise<PlaybookResponse> {
  const response = await fetch("/api/playbooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create playbook");
  }
  
  return response.json();
}

async function updatePlaybook(id: string, data: UpdatePlaybookInput): Promise<PlaybookResponse> {
  const response = await fetch(`/api/playbooks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update playbook");
  }
  
  return response.json();
}

async function deletePlaybook(id: string): Promise<void> {
  const response = await fetch(`/api/playbooks/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete playbook");
  }
}

// Hooks

/**
 * Fetch paginated playbooks with filtering
 */
export function usePlaybooks(params: Partial<PlaybookQueryInput> = {}) {
  const queryParams: Partial<PlaybookQueryInput> = {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    sortOrder: params.sortOrder ?? "desc",
    ...params,
  };
  
  return useQuery({
    queryKey: playbookKeys.list(queryParams),
    queryFn: () => fetchPlaybooks(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes (playbooks don't change often)
  });
}

/**
 * Fetch a single playbook by ID
 */
export function usePlaybook(id: string | undefined) {
  return useQuery({
    queryKey: playbookKeys.detail(id || ""),
    queryFn: () => fetchPlaybookById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Create a new playbook with optimistic updates
 */
export function useCreatePlaybook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPlaybook,
    
    // On success, invalidate and refetch
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.lists() });
    },
  });
}

/**
 * Update a playbook with optimistic updates
 */
export function useUpdatePlaybook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaybookInput }) => 
      updatePlaybook(id, data),
    
    // Optimistic update: instantly reflect changes in the UI
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: playbookKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: playbookKeys.lists() });
      
      // Snapshot the previous values
      const previousPlaybook = queryClient.getQueryData(playbookKeys.detail(id));
      const previousLists = queryClient.getQueriesData({ queryKey: playbookKeys.lists() });
      
      // Optimistically update the detail cache
      queryClient.setQueryData(
        playbookKeys.detail(id),
        (old: PlaybookResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            playbook: {
              ...old.playbook,
              ...data,
              updatedAt: new Date().toISOString(),
            },
          };
        }
      );
      
      // Optimistically update the list caches
      queryClient.setQueriesData(
        { queryKey: playbookKeys.lists() },
        (old: PaginatedPlaybooksResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((playbook) =>
              playbook.id === id
                ? { ...playbook, ...data, updatedAt: new Date().toISOString() }
                : playbook
            ),
          };
        }
      );
      
      // Return context for rollback
      return { previousPlaybook, previousLists, playbookId: id };
    },
    
    // On error, rollback to the previous state
    onError: (_error, _variables, context) => {
      if (context?.previousPlaybook) {
        queryClient.setQueryData(
          playbookKeys.detail(context.playbookId),
          context.previousPlaybook
        );
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after error or success
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: playbookKeys.lists() });
    },
  });
}

/**
 * Delete a playbook
 */
export function useDeletePlaybook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePlaybook,
    
    // Optimistic update: instantly remove from UI
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: playbookKeys.lists() });
      
      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: playbookKeys.lists() });
      
      // Optimistically update the list caches
      queryClient.setQueriesData(
        { queryKey: playbookKeys.lists() },
        (old: PaginatedPlaybooksResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((playbook) => playbook.id !== id),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        }
      );
      
      // Return context for rollback
      return { previousLists };
    },
    
    // On error, rollback to the previous state
    onError: (_error, _variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after error or success
    onSettled: (_, __, id) => {
      queryClient.removeQueries({ queryKey: playbookKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: playbookKeys.lists() });
    },
  });
}

/**
 * Prefetch a playbook (for hover states, etc.)
 */
export function usePrefetchPlaybook() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: playbookKeys.detail(id),
      queryFn: () => fetchPlaybookById(id),
      staleTime: 1000 * 60 * 5,
    });
  };
}

// =============================================================================
// FAVORITES HOOKS
// =============================================================================

export interface FavoritePlaybook extends Playbook {
  favoritedAt: string;
}

async function fetchFavorites(): Promise<{ success: boolean; data: FavoritePlaybook[]; total: number }> {
  const response = await fetch("/api/playbooks/favorites");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch favorites");
  }
  return response.json();
}

export function useFavoritePlaybooks() {
  return useQuery({
    queryKey: [...playbookKeys.all, "favorites"],
    queryFn: fetchFavorites,
    staleTime: 1000 * 60 * 2,
  });
}

async function toggleFavorite(id: string): Promise<{ success: boolean; isFavorited: boolean }> {
  const response = await fetch(`/api/playbooks/${id}/favorite`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to toggle favorite");
  }
  return response.json();
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...playbookKeys.all, "favorites"] });
    },
  });
}

// =============================================================================
// RECENT PLAYBOOKS HOOKS
// =============================================================================

export interface RecentPlaybook extends Playbook {
  lastUsedAt: string;
  lastContext: string;
}

async function fetchRecentPlaybooks(limit = 5): Promise<{ success: boolean; data: RecentPlaybook[] }> {
  const response = await fetch(`/api/playbooks/recent?limit=${limit}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch recent playbooks");
  }
  return response.json();
}

export function useRecentPlaybooks(limit = 5) {
  return useQuery({
    queryKey: [...playbookKeys.all, "recent", limit],
    queryFn: () => fetchRecentPlaybooks(limit),
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// RECOMMENDED PLAYBOOKS HOOKS
// =============================================================================

export interface RecommendedPlaybook extends Playbook {
  recommendationScore: number;
  recommendationReason: string;
}

async function fetchRecommendedPlaybooks(params: {
  customerId?: string;
  category?: string;
  limit?: number;
}): Promise<{ success: boolean; data: RecommendedPlaybook[] }> {
  const searchParams = new URLSearchParams();
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.category) searchParams.set("category", params.category);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetch(`/api/playbooks/recommended?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch recommendations");
  }
  return response.json();
}

export function useRecommendedPlaybooks(params: {
  customerId?: string;
  category?: string;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: [...playbookKeys.all, "recommended", params],
    queryFn: () => fetchRecommendedPlaybooks(params),
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// USAGE TRACKING HOOKS
// =============================================================================

export interface PlaybookUsageInput {
  playbookId: string;
  customerId?: string;
  context: "practice" | "customer_call" | "meeting" | "reference" | "roleplay";
  duration?: number;
  completed?: boolean;
  outcome?: "closed_won" | "follow_up" | "no_result" | "objection_handled";
}

async function logPlaybookUsage(input: PlaybookUsageInput): Promise<{ success: boolean; usage: unknown }> {
  const { playbookId, ...data } = input;
  const response = await fetch(`/api/playbooks/${playbookId}/use`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to log usage");
  }
  return response.json();
}

export function useLogPlaybookUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logPlaybookUsage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...playbookKeys.all, "recent"] });
      queryClient.invalidateQueries({ queryKey: playbookKeys.detail(variables.playbookId) });
    },
  });
}

// =============================================================================
// DUPLICATE HOOK
// =============================================================================

async function duplicatePlaybook(id: string, title?: string): Promise<PlaybookResponse> {
  const response = await fetch(`/api/playbooks/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to duplicate playbook");
  }
  return response.json();
}

export function useDuplicatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title?: string }) => duplicatePlaybook(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.lists() });
    },
  });
}

// =============================================================================
// RATING HOOK
// =============================================================================

async function ratePlaybook(
  id: string,
  data: { rating: number; feedback?: string }
): Promise<{ success: boolean; rating: unknown; newAvgRating: number }> {
  const response = await fetch(`/api/playbooks/${id}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to rate playbook");
  }
  return response.json();
}

export function useRatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating, feedback }: { id: string; rating: number; feedback?: string }) =>
      ratePlaybook(id, { rating, feedback }),
    onSuccess: (data, variables) => {
      // Update the playbook's rating in the cache
      queryClient.setQueryData(
        playbookKeys.detail(variables.id),
        (old: PlaybookResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            playbook: { ...old.playbook, rating: data.newAvgRating },
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: playbookKeys.lists() });
    },
  });
}

// =============================================================================
// AI GENERATION HOOKS
// =============================================================================

export type PlaybookAIAction = 
  | "generate_full"
  | "generate_section"
  | "enhance"
  | "expand"
  | "simplify"
  | "add_objections"
  | "add_closing"
  | "add_tips"
  | "add_opening"
  | "make_conversational"
  | "add_insurance_context"
  | "brainstorm";

export interface PlaybookAIRequest {
  action: PlaybookAIAction;
  title?: string;
  category?: string;
  type?: string;
  stage?: string;
  existingContent?: string;
  selectedText?: string;
  additionalContext?: string;
}

export interface PlaybookAIResponse {
  success: boolean;
  content: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  warning?: string;
}

/**
 * Generate playbook content using AI
 */
async function generatePlaybookContent(request: PlaybookAIRequest): Promise<PlaybookAIResponse> {
  const response = await fetch("/api/ai/playbook-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate content");
  }
  
  return response.json();
}

/**
 * Hook for AI-powered playbook content generation
 */
export function usePlaybookAI() {
  return useMutation({
    mutationFn: generatePlaybookContent,
  });
}
