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
