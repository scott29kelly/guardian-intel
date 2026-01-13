/**
 * Timeline Hooks
 * 
 * React Query hooks for customer activity timeline.
 */

"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { TimelineItem, TimelineItemType } from "@/app/api/customers/[id]/timeline/route";

// Re-export types for convenience
export type { TimelineItem, TimelineItemType };

interface TimelineResponse {
  success: boolean;
  items: TimelineItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

// Query Keys
export const timelineKeys = {
  all: ["timeline"] as const,
  customer: (customerId: string) => [...timelineKeys.all, customerId] as const,
  filtered: (customerId: string, types?: TimelineItemType[]) => 
    [...timelineKeys.customer(customerId), { types }] as const,
};

// API Function
async function fetchTimeline(
  customerId: string,
  cursor?: string,
  limit = 20,
  types?: TimelineItemType[]
): Promise<TimelineResponse> {
  const searchParams = new URLSearchParams();
  
  if (cursor) searchParams.set("cursor", cursor);
  if (limit) searchParams.set("limit", String(limit));
  if (types && types.length > 0) searchParams.set("types", types.join(","));

  const url = `/api/customers/${customerId}/timeline?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch timeline");
  }

  return response.json();
}

// Date grouping helper
export function groupTimelineByDate(items: TimelineItem[]): Map<string, TimelineItem[]> {
  const groups = new Map<string, TimelineItem[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    
    let groupKey: string;

    if (itemDay.getTime() === today.getTime()) {
      groupKey = "Today";
    } else if (itemDay.getTime() === yesterday.getTime()) {
      groupKey = "Yesterday";
    } else if (itemDay >= thisWeekStart) {
      groupKey = "This Week";
    } else if (itemDay >= lastWeekStart) {
      groupKey = "Last Week";
    } else if (itemDay >= thisMonthStart) {
      groupKey = "This Month";
    } else if (itemDay >= lastMonthStart) {
      groupKey = "Last Month";
    } else {
      // Format as "Month Year"
      groupKey = itemDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  });

  return groups;
}

/**
 * Hook for fetching customer timeline with infinite scroll
 */
export function useTimeline(
  customerId: string | undefined,
  options?: {
    limit?: number;
    types?: TimelineItemType[];
    enabled?: boolean;
  }
) {
  const { limit = 20, types, enabled = true } = options || {};

  return useInfiniteQuery({
    queryKey: timelineKeys.filtered(customerId || "", types),
    queryFn: ({ pageParam }) => 
      fetchTimeline(customerId!, pageParam as string | undefined, limit, types),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasMore ? lastPage.pagination.cursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!customerId && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Get all timeline items from infinite query pages
 */
export function flattenTimelinePages(
  pages: TimelineResponse[] | undefined
): TimelineItem[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
