/**
 * Customer API Hooks
 * 
 * React Query hooks for customer data fetching and mutations.
 * Provides caching, optimistic updates, and automatic refetching.
 */

"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { CustomerQueryInput, CreateCustomerInput, UpdateCustomerInput } from "@/lib/validations";

// Types
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  roofType: string | null;
  roofAge: number | null;
  propertyValue: number | null;
  insuranceCarrier: string | null;
  policyType: string | null;
  deductible: number | null;
  leadScore: number;
  urgencyScore: number;
  profitPotential: number;
  status: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  assignedRep?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    interactions: number;
    weatherEvents: number;
    intelItems: number;
  };
}

interface PaginatedCustomersResponse {
  success: boolean;
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CustomerResponse {
  success: boolean;
  customer: Customer;
}

// Query Keys
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: CustomerQueryInput) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  stats: () => [...customerKeys.all, "stats"] as const,
};

// API Functions
async function fetchCustomers(params: CustomerQueryInput): Promise<PaginatedCustomersResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`/api/customers?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch customers");
  }
  
  return response.json();
}

async function fetchCustomerById(id: string, includeDetails = false): Promise<CustomerResponse> {
  const url = `/api/customers/${id}${includeDetails ? "?details=true" : ""}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch customer");
  }
  
  return response.json();
}

async function createCustomer(data: CreateCustomerInput): Promise<CustomerResponse> {
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create customer");
  }
  
  return response.json();
}

async function updateCustomer(id: string, data: UpdateCustomerInput): Promise<CustomerResponse> {
  const response = await fetch(`/api/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update customer");
  }
  
  return response.json();
}

async function deleteCustomer(id: string): Promise<void> {
  const response = await fetch(`/api/customers/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete customer");
  }
}

// Hooks

/**
 * Fetch paginated customers with filtering
 */
export function useCustomers(params: Partial<CustomerQueryInput> = {}) {
  const queryParams: CustomerQueryInput = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    sortOrder: params.sortOrder ?? "desc",
    ...params,
  };
  
  return useQuery({
    queryKey: customerKeys.list(queryParams),
    queryFn: () => fetchCustomers(queryParams),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch customers with infinite scroll
 */
export function useInfiniteCustomers(params: Partial<Omit<CustomerQueryInput, "page">> = {}) {
  const baseParams = {
    limit: params.limit ?? 20,
    sortOrder: params.sortOrder ?? "desc" as const,
    ...params,
  };
  
  return useInfiniteQuery({
    queryKey: customerKeys.list({ ...baseParams, page: 1 }),
    queryFn: ({ pageParam = 1 }) => fetchCustomers({ ...baseParams, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch a single customer by ID
 */
export function useCustomer(id: string | undefined, includeDetails = false) {
  return useQuery({
    queryKey: customerKeys.detail(id || ""),
    queryFn: () => fetchCustomerById(id!, includeDetails),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      // Invalidate all customer lists
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) => 
      updateCustomer(id, data),
    onSuccess: (response) => {
      // Update the specific customer in cache
      queryClient.setQueryData(
        customerKeys.detail(response.customer.id),
        response
      );
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Prefetch a customer (for hover states, etc.)
 */
export function usePrefetchCustomer() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: customerKeys.detail(id),
      queryFn: () => fetchCustomerById(id),
      staleTime: 1000 * 60 * 5,
    });
  };
}
