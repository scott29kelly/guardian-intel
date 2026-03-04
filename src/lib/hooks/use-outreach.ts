/**
 * Outreach Hooks
 * 
 * React Query hooks for campaign management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface Campaign {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string;
  triggerType: "storm" | "manual" | "scheduled";
  stormTypes: string[];
  minSeverity?: string;
  targetZipCodes: string[];
  targetStates: string[];
  excludeRecent: number;
  enableSms: boolean;
  enableEmail: boolean;
  smsTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  delayMinutes: number;
  isActive: boolean;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  createdBy: { id: string; name: string };
  executionCount: number;
  executions?: CampaignExecution[];
}

interface CampaignExecution {
  id: string;
  createdAt: string;
  status: string;
  triggerType: string;
  affectedCustomers: number;
  smsSent: number;
  emailSent: number;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  triggerType: "storm" | "manual" | "scheduled";
  stormTypes?: string[];
  minSeverity?: string;
  targetZipCodes?: string[];
  targetStates?: string[];
  excludeRecent?: number;
  enableSms?: boolean;
  enableEmail?: boolean;
  smsTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  delayMinutes?: number;
}

interface ExecuteCampaignInput {
  customerIds?: string[];
  stormData?: {
    stormId: string;
    stormType: string;
    severity: string;
    affectedZipCodes: string[];
    stormDate: string;
    description?: string;
  };
}

export interface ExecutionResult {
  executionId: string;
  status: string;
  targetedCustomers: number;
  smsSent: number;
  smsDelivered: number;
  smsFailed: number;
  emailSent: number;
  emailDelivered: number;
  emailFailed: number;
  errors: string[];
}

// ============================================================
// Query Keys
// ============================================================

const outreachKeys = {
  all: ["outreach"] as const,
  campaigns: () => [...outreachKeys.all, "campaigns"] as const,
  campaignList: (filters?: Record<string, unknown>) => [...outreachKeys.campaigns(), "list", filters] as const,
  campaignDetail: (id: string) => [...outreachKeys.campaigns(), "detail", id] as const,
  templates: () => [...outreachKeys.all, "templates"] as const,
  templateList: (filters?: Record<string, unknown>) => [...outreachKeys.templates(), "list", filters] as const,
};

// ============================================================
// Campaign Hooks
// ============================================================

export function useCampaigns(filters?: {
  triggerType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: outreachKeys.campaignList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.triggerType) params.set("triggerType", filters.triggerType);
      if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));

      const response = await fetch(`/api/outreach/campaigns?${params}`);
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: outreachKeys.campaignDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/outreach/campaigns/${id}`);
      if (!response.ok) throw new Error("Failed to fetch campaign");
      const data = await response.json();
      return data.data as Campaign;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const response = await fetch("/api/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
    },
  });
}

interface UpdateCampaignInput extends Partial<CreateCampaignInput> {
  id: string;
  isActive?: boolean;
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCampaignInput) => {
      const response = await fetch(`/api/outreach/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update campaign");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaignDetail(variables.id) });
    },
  });
}

export function useExecuteCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExecuteCampaignInput): Promise<{ success: boolean; data: ExecutionResult }> => {
      const response = await fetch(`/api/outreach/campaigns/${campaignId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Execution failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaignDetail(campaignId) });
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
    },
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: async (input: {
      template: string;
      channel: "sms" | "email";
      subject?: string;
    }) => {
      const response = await fetch("/api/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Preview failed");
      const data = await response.json();
      return data.data as {
        body: string;
        subject?: string;
        characterCount: number;
        smsSegments?: number;
      };
    },
  });
}

