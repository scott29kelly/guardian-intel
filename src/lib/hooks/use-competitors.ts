/**
 * Competitors Hooks
 * 
 * React Query hooks for competitor intelligence:
 * - useCompetitors: List competitors
 * - useCompetitor: Get single competitor
 * - useCompetitorAnalytics: Get analytics dashboard data
 * - useCompetitorActivities: List activities
 * - useCreateCompetitor: Add new competitor
 * - useLogCompetitorActivity: Log activity
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { 
  CompetitorAnalytics,
  CompetitorQueryParams,
  ActivityQueryParams,
  AnalyticsQueryParams,
  PricingTier,
  ActivityType,
  PriceComparison,
} from "@/lib/services/competitors/types";

// =============================================================================
// TYPES
// =============================================================================

export interface CompetitorListItem {
  id: string;
  name: string;
  displayName: string | null;
  website: string | null;
  headquarters: string | null;
  pricingTier: PricingTier;
  specialties: string[];
  reputation: number | null;
  avgReviewScore: number | null;
  isActive: boolean;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorDetail extends CompetitorListItem {
  phone: string | null;
  serviceAreas: string[];
  yearFounded: number | null;
  employeeCount: number | null;
  certifications: string[];
  strengths: string | null;
  weaknesses: string | null;
  salesTactics: string | null;
  pricingNotes: string | null;
  marketShare: number | null;
  reviewCount: number | null;
  stats: {
    activityCount: number;
    mentionCount: number;
    wonAgainst: number;
    lostTo: number;
    winRate: number | null;
    lastActivity: string | null;
  };
}

export interface CompetitorActivityItem {
  id: string;
  createdAt: string;
  competitorId: string;
  competitorName: string;
  customerId: string | null;
  customerName: string | null;
  activityType: ActivityType;
  city: string | null;
  state: string | null;
  description: string | null;
  quotedPrice: number | null;
  priceComparison: PriceComparison | null;
  outcome: string | null;
  outcomeReason: string | null;
  dealValue: number | null;
  hasPhoto: boolean;
}

export interface CreateCompetitorRequest {
  name: string;
  displayName?: string;
  website?: string;
  phone?: string;
  headquarters?: string;
  serviceAreas?: string[];
  yearFounded?: number;
  employeeCount?: number;
  pricingTier?: PricingTier;
  specialties?: string[];
  certifications?: string[];
  strengths?: string;
  weaknesses?: string;
  salesTactics?: string;
  pricingNotes?: string;
}

export interface LogActivityRequest {
  competitorId: string;
  customerId?: string;
  activityType: ActivityType;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
  quotedPrice?: number;
  priceComparison?: PriceComparison;
  outcome?: string;
  outcomeReason?: string;
  dealValue?: number;
  photoUrl?: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchCompetitors(params: CompetitorQueryParams): Promise<{
  data: CompetitorListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.pricingTier) searchParams.set("pricingTier", params.pricingTier);
  if (params.isActive !== undefined) searchParams.set("isActive", params.isActive.toString());
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const response = await fetch(`/api/competitors?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch competitors");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result;
}

async function fetchCompetitor(id: string): Promise<CompetitorDetail> {
  const response = await fetch(`/api/competitors/${id}`);
  if (!response.ok) throw new Error("Failed to fetch competitor");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function fetchCompetitorAnalytics(params: AnalyticsQueryParams): Promise<CompetitorAnalytics> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.state) searchParams.set("state", params.state);
  if (params.competitorId) searchParams.set("competitorId", params.competitorId);

  const response = await fetch(`/api/competitors/analytics?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch analytics");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function fetchActivities(params: ActivityQueryParams): Promise<{
  data: CompetitorActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.competitorId) searchParams.set("competitorId", params.competitorId);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.activityType) searchParams.set("activityType", params.activityType);
  if (params.state) searchParams.set("state", params.state);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const response = await fetch(`/api/competitors/activity?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch activities");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result;
}

async function createCompetitor(data: CreateCompetitorRequest): Promise<CompetitorListItem> {
  const response = await fetch("/api/competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to create competitor");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function logActivity(data: LogActivityRequest): Promise<CompetitorActivityItem> {
  const response = await fetch("/api/competitors/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to log activity");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function updateCompetitor(id: string, data: Partial<CreateCompetitorRequest>): Promise<CompetitorDetail> {
  const response = await fetch(`/api/competitors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error("Failed to update competitor");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * List competitors with filtering
 */
export function useCompetitors(params: CompetitorQueryParams = {}) {
  return useQuery({
    queryKey: ["competitors", params],
    queryFn: () => fetchCompetitors(params),
  });
}

/**
 * Get a single competitor by ID
 */
export function useCompetitor(id: string | null) {
  return useQuery({
    queryKey: ["competitor", id],
    queryFn: () => fetchCompetitor(id!),
    enabled: !!id,
  });
}

/**
 * Get competitor analytics dashboard data
 */
export function useCompetitorAnalytics(params: AnalyticsQueryParams = {}) {
  return useQuery({
    queryKey: ["competitor-analytics", params],
    queryFn: () => fetchCompetitorAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * List competitor activities
 */
export function useCompetitorActivities(params: ActivityQueryParams = {}) {
  return useQuery({
    queryKey: ["competitor-activities", params],
    queryFn: () => fetchActivities(params),
  });
}

/**
 * Create a new competitor
 */
export function useCreateCompetitor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      queryClient.invalidateQueries({ queryKey: ["competitor-analytics"] });
    },
  });
}

/**
 * Log competitor activity
 */
export function useLogCompetitorActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: logActivity,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["competitor-activities"] });
      queryClient.invalidateQueries({ queryKey: ["competitor", data.competitorId] });
      queryClient.invalidateQueries({ queryKey: ["competitor-analytics"] });
    },
  });
}

/**
 * Update a competitor
 */
export function useUpdateCompetitor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCompetitorRequest> }) => 
      updateCompetitor(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["competitor", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}
