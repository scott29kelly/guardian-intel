/**
 * Contract Hooks
 * 
 * React Query hooks for digital contract management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface Contract {
  id: string;
  createdAt: string;
  updatedAt: string;
  contractNumber: string;
  customerId: string;
  templateId?: string;
  claimId?: string;
  createdById: string;
  title: string;
  description?: string;
  content: string;
  termsContent?: string;
  totalAmount: number;
  depositAmount?: number;
  depositPercent?: number;
  balanceDueOn?: string;
  paymentTerms?: string;
  scopeOfWork?: string;
  materials?: string[];
  laborDetails?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  warrantyTerms?: string;
  status: ContractStatus;
  expiresAt?: string;
  sentAt?: string;
  sentVia?: string;
  viewedAt?: string;
  customerSignature?: string;
  customerSignedAt?: string;
  customerInitials?: string;
  repSignature?: string;
  repSignedAt?: string;
  signedLatitude?: number;
  signedLongitude?: number;
  signedAddress?: string;
  pdfUrl?: string;
  auditLog?: AuditEvent[];
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    email?: string;
    phone?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email?: string;
  };
}

export type ContractStatus = 
  | "draft" 
  | "sent" 
  | "viewed" 
  | "signed" 
  | "completed" 
  | "cancelled" 
  | "expired";

export interface AuditEvent {
  timestamp: string;
  action: string;
  actor: string;
  ip?: string;
  details?: string;
}

export interface ContractStats {
  total: number;
  draft: number;
  sent: number;
  signed: number;
  completed: number;
  totalValue: number;
  signedValue: number;
  conversionRate: number;
}

export interface CreateContractInput {
  customerId: string;
  templateId?: string;
  claimId?: string;
  title: string;
  description?: string;
  totalAmount: number;
  depositAmount?: number;
  depositPercent?: number;
  balanceDueOn?: string;
  paymentTerms?: string;
  scopeOfWork?: string;
  materials?: string[];
  laborDetails?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  warrantyTerms?: string;
  expirationDays?: number;
}

export interface SignContractInput {
  signature: string;
  initials?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

// ============================================================
// Query Keys
// ============================================================

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...contractKeys.lists(), filters] as const,
  details: () => [...contractKeys.all, "detail"] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  stats: (userId?: string) => [...contractKeys.all, "stats", userId] as const,
};

// ============================================================
// Contract Hooks
// ============================================================

export function useContracts(filters?: {
  customerId?: string;
  status?: ContractStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.customerId) params.set("customerId", filters.customerId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));

      const response = await fetch(`/api/contracts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch contracts");
      return response.json();
    },
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch contract");
      const data = await response.json();
      return data.data as Contract;
    },
    enabled: !!id,
  });
}

export function useContractStats(userId?: string) {
  return useQuery({
    queryKey: contractKeys.stats(userId),
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : "";
      const response = await fetch(`/api/contracts/stats${params}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      return data.data as ContractStats;
    },
  });
}

export function useCustomerContracts(customerId: string) {
  return useContracts({ customerId, limit: 50 });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create contract");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      if (variables.customerId) {
        queryClient.invalidateQueries({ 
          queryKey: contractKeys.list({ customerId: variables.customerId }) 
        });
      }
    },
  });
}

export function useSignContract(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SignContractInput) => {
      const response = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Signing failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
    },
  });
}

export function useSendContract(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (via: "email" | "sms" | "in-person") => {
      const response = await fetch(`/api/contracts/${contractId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ via }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Send failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useCancelContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const params = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      const response = await fetch(`/api/contracts/${id}${params}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Cancel failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
    },
  });
}
