/**
 * Claims Hooks
 * 
 * React Query hooks for insurance claim management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// TYPES
// =============================================================================

export interface Claim {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  claimNumber: string | null;
  carrier: string;
  dateOfLoss: string;
  claimType: "roof" | "siding" | "gutters" | "full-exterior" | "interior";
  status: ClaimStatus;
  
  // Financials
  initialEstimate: number | null;
  approvedValue: number | null;
  supplementValue: number | null;
  totalPaid: number | null;
  deductible: number | null;
  acv: number | null;
  rcv: number | null;
  depreciation: number | null;
  
  // Adjuster
  adjusterName: string | null;
  adjusterPhone: string | null;
  adjusterEmail: string | null;
  adjusterCompany: string | null;
  inspectionDate: string | null;
  reinspectionDate: string | null;
  
  // Documents
  scopeOfWork: string | null;
  photos: string | null;
  notes: string | null;
  
  // Supplements
  supplementCount: number;
  lastSupplementDate: string | null;
  
  // Relations
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string | null;
    email: string | null;
    assignedRep: { id: string; name: string } | null;
  };
}

export type ClaimStatus = 
  | "pending"
  | "filed"
  | "adjuster-assigned"
  | "inspection-scheduled"
  | "approved"
  | "denied"
  | "supplement"
  | "paid"
  | "closed";

export interface ClaimFilters {
  page?: number;
  limit?: number;
  status?: ClaimStatus | "all";
  carrier?: string;
  customerId?: string;
  repId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ClaimStats {
  totalClaims: number;
  recentClaims: number;
  needsAction: number;
  approvalRate: number;
  statusBreakdown: Record<ClaimStatus, number>;
  financials: {
    totalEstimated: number;
    totalApproved: number;
    totalPaid: number;
    totalSupplements: number;
    pendingRevenue: number;
  };
  byCarrier: Array<{ carrier: string; count: number; approvedValue: number }>;
  byType: Array<{ type: string; count: number }>;
  atRiskClaims: Array<{
    id: string;
    customer: string;
    carrier: string;
    approvedValue: number | null;
    daysSinceApproval: number;
  }>;
}

export interface CreateClaimInput {
  customerId: string;
  carrier: string;
  dateOfLoss: string;
  claimType: "roof" | "siding" | "gutters" | "full-exterior" | "interior";
  claimNumber?: string;
  status?: ClaimStatus;
  initialEstimate?: number;
  deductible?: number;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  adjusterCompany?: string;
  inspectionDate?: string;
  notes?: string;
}

export interface UpdateClaimInput extends Partial<Omit<Claim, "id" | "createdAt" | "updatedAt" | "customerId" | "customer">> {}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const claimKeys = {
  all: ["claims"] as const,
  lists: () => [...claimKeys.all, "list"] as const,
  list: (filters: ClaimFilters) => [...claimKeys.lists(), filters] as const,
  details: () => [...claimKeys.all, "detail"] as const,
  detail: (id: string) => [...claimKeys.details(), id] as const,
  stats: (repId?: string) => [...claimKeys.all, "stats", repId] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch claims with filters
 */
export function useClaims(filters: ClaimFilters = {}) {
  return useQuery({
    queryKey: claimKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.carrier) params.set("carrier", filters.carrier);
      if (filters.customerId) params.set("customerId", filters.customerId);
      if (filters.repId) params.set("repId", filters.repId);
      if (filters.search) params.set("search", filters.search);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      
      const response = await fetch(`/api/claims?${params}`);
      if (!response.ok) throw new Error("Failed to fetch claims");
      
      const data = await response.json();
      return data as {
        success: boolean;
        data: Claim[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single claim details
 */
export function useClaim(id: string | null) {
  return useQuery({
    queryKey: claimKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;
      
      const response = await fetch(`/api/claims/${id}`);
      if (!response.ok) throw new Error("Failed to fetch claim");
      
      const data = await response.json();
      return data.data as Claim & { statusHistory: Array<{ id: string; title: string; content: string; createdAt: string }> };
    },
    enabled: !!id,
  });
}

/**
 * Fetch claim statistics
 */
export function useClaimStats(repId?: string) {
  return useQuery({
    queryKey: claimKeys.stats(repId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repId) params.set("repId", repId);
      
      const response = await fetch(`/api/claims/stats?${params}`);
      if (!response.ok) throw new Error("Failed to fetch claim stats");
      
      const data = await response.json();
      return data.data as ClaimStats;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Create a new claim
 */
export function useCreateClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateClaimInput) => {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create claim");
      }
      
      const data = await response.json();
      return data.data as Claim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
    },
  });
}

/**
 * Update an existing claim
 */
export function useUpdateClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateClaimInput) => {
      const response = await fetch(`/api/claims/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update claim");
      }
      
      const data = await response.json();
      return data.data as Claim;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
    },
  });
}

/**
 * Delete a claim
 */
export function useDeleteClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/claims/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete claim");
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.lists() });
      queryClient.invalidateQueries({ queryKey: claimKeys.stats() });
    },
  });
}

/**
 * Update claim status (convenience hook)
 */
export function useUpdateClaimStatus() {
  const updateClaim = useUpdateClaim();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClaimStatus }) => {
      return updateClaim.mutateAsync({ id, status });
    },
  });
}
