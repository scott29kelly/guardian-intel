/**
 * Lead-Intel Hooks (Phase 8, LG-10)
 *
 * React Query hooks for the Pipeline Inspector. Fetches tracked-property
 * lists, detail views, and the saved compound query from the lead-intel
 * API routes. Follows the exact pattern established in use-customers.ts
 * (key factory + fetch functions + useQuery wrappers).
 *
 * Security note: these hooks assume the caller is inside an authenticated
 * dashboard session. Rep-ownership filtering is deferred per LG-02 — any
 * authenticated user fetching /api/lead-intel/properties will see every
 * tracked property. Tracked in STATE.md ### Discovered TODOs.
 */

"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types — mirror the API response shapes from Plan 08-03
// ============================================================================

export interface LeadIntelPropertyListFilters {
  minScore?: number;
  maxScore?: number;
  signalTypes?: string[];
  hasPendingResolution?: boolean;
  zipCode?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export interface LeadIntelPropertyListRow {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latestScore: number | null;
  signalCount: number;
  lastSignalAt: string | null;
  lastScoreAt: string | null;
  resolutionStatus: string;
}

export interface LeadIntelPropertyListResponse {
  success: boolean;
  rows: LeadIntelPropertyListRow[];
  total: number;
}

export interface LeadIntelScoreContribution {
  signalEventId: string;
  signalType: string;
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
  ageDays: number;
  decayFactor: number;
  effectiveWeight: number;
}

export interface LeadIntelSourceRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceRecordedAt: string;
  reliabilityWeight: number;
  ingestionRunId: string;
}

export interface LeadIntelSignalEvent {
  id: string;
  signalType: string;
  eventTimestamp: string;
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
  value: number | null;
  metadata: string | null;
}

export interface LeadIntelOutcomeEvent {
  id: string;
  eventType: string;
  eventTimestamp: string;
  payload: string;
}

export interface LeadIntelPropertyDetailResponse {
  success: boolean;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    county: string | null;
    latitude: number | null;
    longitude: number | null;
    parcelNumber: string | null;
    normalizedAddress: string;
    normalizedKey: string;
    resolutionStatus: string;
    latestScore: number | null;
    signalCount: number;
    lastSignalAt: string | null;
    lastScoreAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  sourceRecords: LeadIntelSourceRecord[];
  signalEvents: LeadIntelSignalEvent[];
  latestSnapshot: {
    id: string;
    totalScore: number;
    formulaVersion: string;
    evaluatedAt: string;
    contributions: string; // JSON — parse into LeadIntelScoreContribution[]
    signalCount: number;
  } | null;
  outcomeEvents: LeadIntelOutcomeEvent[];
}

export interface LeadIntelSavedQueryMatch {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  latestScore: number | null;
  roofAge: number;
  stormCount: number;
  neighborWinCount: number;
  nearestWinMeters: number | null;
}

export interface LeadIntelSavedQueryResponse {
  success: boolean;
  queryId: string;
  rows: LeadIntelSavedQueryMatch[];
}

// ============================================================================
// Query key factory (matches LG-10 spec)
// ============================================================================

export const leadIntelKeys = {
  all: ["lead-intel"] as const,
  properties: () => [...leadIntelKeys.all, "properties"] as const,
  list: (filters: LeadIntelPropertyListFilters) =>
    [...leadIntelKeys.properties(), "list", filters] as const,
  details: () => [...leadIntelKeys.properties(), "detail"] as const,
  detail: (id: string) => [...leadIntelKeys.details(), id] as const,
  savedQueries: () => [...leadIntelKeys.all, "saved-query"] as const,
  savedQuery: (queryId: string) => [...leadIntelKeys.savedQueries(), queryId] as const,
};

// ============================================================================
// Fetch helpers
// ============================================================================

async function fetchPropertyList(
  filters: LeadIntelPropertyListFilters,
): Promise<LeadIntelPropertyListResponse> {
  const sp = new URLSearchParams();
  if (filters.minScore !== undefined) sp.set("minScore", String(filters.minScore));
  if (filters.maxScore !== undefined) sp.set("maxScore", String(filters.maxScore));
  if (filters.signalTypes && filters.signalTypes.length > 0)
    sp.set("signalTypes", filters.signalTypes.join(","));
  if (filters.hasPendingResolution) sp.set("hasPendingResolution", "true");
  if (filters.zipCode) sp.set("zipCode", filters.zipCode);
  if (filters.state) sp.set("state", filters.state);
  if (filters.limit !== undefined) sp.set("limit", String(filters.limit));
  if (filters.offset !== undefined) sp.set("offset", String(filters.offset));

  const response = await fetch(`/api/lead-intel/properties?${sp.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch tracked properties");
  }
  return response.json();
}

async function fetchPropertyDetail(
  id: string,
): Promise<LeadIntelPropertyDetailResponse> {
  const response = await fetch(`/api/lead-intel/properties/${encodeURIComponent(id)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch property detail");
  }
  return response.json();
}

async function fetchSavedQuery(
  queryId: "high-value-roof-storm-neighbor",
): Promise<LeadIntelSavedQueryResponse> {
  const response = await fetch(`/api/lead-intel/queries/${queryId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to run saved query");
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

export function useLeadIntelProperties(filters: LeadIntelPropertyListFilters = {}) {
  return useQuery({
    queryKey: leadIntelKeys.list(filters),
    queryFn: () => fetchPropertyList(filters),
    staleTime: 1000 * 60, // 1 minute — new signals can land via backfill
  });
}

export function useLeadIntelPropertyDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: leadIntelKeys.detail(id || ""),
    queryFn: () => fetchPropertyDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useLeadIntelSavedQuery(
  queryId: "high-value-roof-storm-neighbor",
  enabled: boolean = false,
) {
  return useQuery({
    queryKey: leadIntelKeys.savedQuery(queryId),
    queryFn: () => fetchSavedQuery(queryId),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
