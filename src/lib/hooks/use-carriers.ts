/**
 * Carrier Integration Hooks
 * 
 * React Query hooks for insurance carrier operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface Carrier {
  code: string;
  name: string;
  displayName: string;
  supportsDirectFiling: boolean;
  supportsStatusUpdates: boolean;
  isTestMode: boolean;
  isConfigured?: boolean;
}

export interface ClaimFilingResult {
  carrierClaimId: string;
  claimNumber: string;
  status: string;
  statusMessage?: string;
  assignedAdjuster?: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  nextSteps?: string[];
  estimatedResponseDate?: string;
  trackingUrl?: string;
}

export interface ClaimStatusResult {
  carrierClaimId: string;
  claimNumber: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  lastUpdated: string;
  approvedAmount?: number;
  paidAmount?: number;
  adjuster?: {
    name: string;
    phone?: string;
    email?: string;
  };
  inspectionDate?: string;
  timeline?: Array<{
    date: string;
    event: string;
    description?: string;
  }>;
}

export interface FileClaimInput {
  claimId: string;
  policyNumber: string;
  lossDescription: string;
  causeOfLoss: string;
  damageAreas: Array<{
    type: string;
    severity: "minor" | "moderate" | "severe";
    description?: string;
  }>;
  emergencyRepairsNeeded?: boolean;
  temporaryRepairsCost?: number;
  photoIds?: string[];
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// ============================================================
// Query Keys
// ============================================================

export const carrierKeys = {
  all: ["carriers"] as const,
  list: () => [...carrierKeys.all, "list"] as const,
  status: (claimId: string) => [...carrierKeys.all, "status", claimId] as const,
};

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch available carriers
 */
export function useCarriers() {
  return useQuery({
    queryKey: carrierKeys.list(),
    queryFn: async () => {
      const response = await fetch("/api/carriers");
      if (!response.ok) throw new Error("Failed to fetch carriers");
      const data = await response.json();
      return data.data as Carrier[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * File claim with carrier
 */
export function useFileClaim(carrierCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FileClaimInput) => {
      const response = await fetch(`/api/carriers/${carrierCode}/file-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to file claim");
      }

      return response.json() as Promise<{ success: boolean; data: ClaimFilingResult }>;
    },
    onSuccess: (_, variables) => {
      // Invalidate claim queries
      queryClient.invalidateQueries({ queryKey: ["claims", variables.claimId] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

/**
 * Sync claim status with carrier
 */
export function useSyncClaimStatus(carrierCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimId: string) => {
      const response = await fetch(`/api/carriers/${carrierCode}/sync?claimId=${claimId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      return response.json() as Promise<{ success: boolean; data: ClaimStatusResult }>;
    },
    onSuccess: (_, claimId) => {
      queryClient.invalidateQueries({ queryKey: ["claims", claimId] });
      queryClient.invalidateQueries({ queryKey: carrierKeys.status(claimId) });
    },
  });
}

/**
 * Sync all claims for a carrier
 */
export function useSyncAllClaims(carrierCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/carriers/${carrierCode}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      return response.json() as Promise<{ success: boolean; data: SyncResult }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

/**
 * Get carriers that support direct filing
 */
export function useDirectFilingCarriers() {
  const { data: carriers, ...rest } = useCarriers();
  
  return {
    ...rest,
    data: carriers?.filter(c => c.supportsDirectFiling) || [],
  };
}

/**
 * Check if a specific carrier supports direct filing
 */
export function useCarrierSupport(carrierCode: string) {
  const { data: carriers } = useCarriers();
  const carrier = carriers?.find(c => c.code === carrierCode || c.name.toLowerCase().includes(carrierCode.toLowerCase()));
  
  return {
    carrier,
    supportsDirectFiling: carrier?.supportsDirectFiling || false,
    supportsStatusUpdates: carrier?.supportsStatusUpdates || false,
    isConfigured: carrier?.isConfigured !== false,
  };
}
