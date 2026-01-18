/**
 * Proposals Hooks
 * 
 * React Query hooks for proposal management:
 * - useProposals: List proposals
 * - useProposal: Get single proposal
 * - useProposalPreview: Generate proposal preview
 * - useCreateProposal: Generate and save proposal
 * - useUpdateProposal: Update proposal
 * - useDeleteProposal: Delete proposal
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GeneratedProposal, PricingOption, LineItem } from "@/lib/services/proposals/types";

// =============================================================================
// TYPES
// =============================================================================

export interface ProposalListItem {
  id: string;
  proposalNumber: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: number;
  materialGrade: string | null;
  primaryMaterial: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    address: string;
    city: string;
    state: string;
  };
}

export interface ProposalDetail extends ProposalListItem {
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  
  // Property
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: string | null;
  roofType: string | null;
  roofAge: number | null;
  roofSquares: number | null;
  roofPitch: string | null;
  
  // Damage
  damageType: string | null;
  damageSeverity: string | null;
  damageDescription: string | null;
  stormDate: string | null;
  hailSize: number | null;
  windSpeed: number | null;
  
  // Pricing
  materialsCost: number;
  laborCost: number;
  permitFees: number;
  disposalFees: number;
  miscFees: number;
  subtotal: number;
  discountAmount: number;
  discountReason: string | null;
  taxRate: number;
  taxAmount: number;
  lineItems: LineItem[];
  pricingOptions: PricingOption[];
  
  // Insurance
  isInsuranceClaim: boolean;
  insuranceCarrier: string | null;
  deductible: number | null;
  insuranceNotes: string | null;
  
  // Content
  executiveSummary: string | null;
  scopeSummary: string | null;
  scopeDetails: string | null;
  valueProposition: string | null;
  warrantyDetails: string | null;
  termsAndConditions: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  
  // Tracking
  viewCount: number;
  signedAt: string | null;
  signedByName: string | null;
}

export interface ProposalQueryParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateProposalRequest {
  customerId: string;
  materialGrade?: "economy" | "standard" | "premium" | "luxury";
  specificMaterial?: string;
  customDiscount?: {
    amount: number;
    reason: string;
  };
  includeInsuranceAssistance?: boolean;
  urgencyLevel?: "standard" | "high" | "urgent";
}

export interface UpdateProposalRequest {
  id: string;
  updates: {
    status?: string;
    title?: string;
    discountAmount?: number;
    discountReason?: string;
    customerNotes?: string;
    internalNotes?: string;
    executiveSummary?: string;
    scopeDetails?: string;
    valueProposition?: string;
    termsAndConditions?: string;
    validUntil?: string;
    estimatedStartDate?: string;
    estimatedDuration?: number;
    signatureData?: string;
    signedByName?: string;
    signedByEmail?: string;
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchProposals(params: ProposalQueryParams): Promise<{
  data: ProposalListItem[];
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
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.status) searchParams.set("status", params.status);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const response = await fetch(`/api/proposals?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch proposals");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result;
}

async function fetchProposal(id: string): Promise<ProposalDetail> {
  const response = await fetch(`/api/proposals/${id}`);
  if (!response.ok) throw new Error("Failed to fetch proposal");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function generateProposalPreview(request: CreateProposalRequest): Promise<GeneratedProposal> {
  const response = await fetch("/api/proposals/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) throw new Error("Failed to generate preview");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function createProposal(request: CreateProposalRequest): Promise<ProposalDetail> {
  const response = await fetch("/api/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) throw new Error("Failed to create proposal");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function updateProposal({ id, updates }: UpdateProposalRequest): Promise<ProposalDetail> {
  const response = await fetch(`/api/proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) throw new Error("Failed to update proposal");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.data;
}

async function deleteProposal(id: string): Promise<void> {
  const response = await fetch(`/api/proposals/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) throw new Error("Failed to delete proposal");
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * List proposals with filtering and pagination
 */
export function useProposals(params: ProposalQueryParams = {}) {
  return useQuery({
    queryKey: ["proposals", params],
    queryFn: () => fetchProposals(params),
  });
}

/**
 * Get a single proposal by ID
 */
export function useProposal(id: string | null) {
  return useQuery({
    queryKey: ["proposal", id],
    queryFn: () => fetchProposal(id!),
    enabled: !!id,
  });
}

/**
 * Generate a proposal preview without saving
 */
export function useProposalPreview() {
  return useMutation({
    mutationFn: generateProposalPreview,
  });
}

/**
 * Generate and save a new proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProposal,
    onSuccess: (data) => {
      // Invalidate proposals list
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      // Add to cache
      queryClient.setQueryData(["proposal", data.id], data);
    },
  });
}

/**
 * Update an existing proposal
 */
export function useUpdateProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProposal,
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(["proposal", data.id], data);
      // Invalidate list to reflect changes
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

/**
 * Delete a proposal
 */
export function useDeleteProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProposal,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["proposal", id] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

/**
 * Get proposals for a specific customer
 */
export function useCustomerProposals(customerId: string | null) {
  return useProposals({
    customerId: customerId || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}
