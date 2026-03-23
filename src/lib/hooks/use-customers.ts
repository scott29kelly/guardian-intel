/**
 * Customer API Hooks
 * 
 * React Query hooks for customer data fetching and mutations.
 * Provides caching, optimistic updates, and automatic refetching.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerQueryInput, CreateCustomerInput, BulkUpdateCustomersInput } from "@/lib/validations";

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
const customerKeys = {
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

interface BulkUpdateResponse {
  success: boolean;
  message: string;
  count: number;
}

async function bulkUpdateCustomers(data: BulkUpdateCustomersInput): Promise<BulkUpdateResponse> {
  const response = await fetch("/api/customers/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to bulk update customers");
  }
  
  return response.json();
}

async function bulkDeleteCustomers(ids: string[]): Promise<BulkUpdateResponse> {
  const response = await fetch("/api/customers/bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to bulk delete customers");
  }
  
  return response.json();
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
 * Create a new customer with optimistic updates
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCustomer,
    
    // Optimistic update: instantly add the customer to the UI
    onMutate: async (newCustomerData) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      
      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: customerKeys.lists() });
      
      // Create an optimistic customer with temporary ID
      const optimisticCustomer: Customer = {
        id: `temp-${Date.now()}`,
        firstName: newCustomerData.firstName,
        lastName: newCustomerData.lastName,
        email: newCustomerData.email || null,
        phone: newCustomerData.phone || null,
        address: newCustomerData.address,
        city: newCustomerData.city,
        state: newCustomerData.state,
        zipCode: newCustomerData.zipCode,
        propertyType: newCustomerData.propertyType || null,
        yearBuilt: null,
        squareFootage: null,
        roofType: newCustomerData.roofType || null,
        roofAge: newCustomerData.roofAge || null,
        propertyValue: null,
        insuranceCarrier: newCustomerData.insuranceCarrier || null,
        policyType: null,
        deductible: null,
        leadScore: 50, // Default score
        urgencyScore: 0,
        profitPotential: 0,
        status: "lead",
        stage: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedRep: null,
      };
      
      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (old: PaginatedCustomersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: [optimisticCustomer, ...old.data],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        }
      );
      
      // Return context for rollback
      return { previousData, optimisticCustomer };
    },
    
    // On error, rollback to the previous state
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        // Restore all queries to their previous state
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Bulk update customers with optimistic UI
 */
export function useBulkUpdateCustomers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkUpdateCustomers,
    
    // Optimistic update: instantly reflect changes in the UI
    onMutate: async ({ ids, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      
      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: customerKeys.lists() });
      
      // Optimistically update the list caches
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (old: PaginatedCustomersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((customer) =>
              ids.includes(customer.id)
                ? { 
                    ...customer, 
                    ...updates,
                    updatedAt: new Date().toISOString(),
                  }
                : customer
            ),
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/**
 * Bulk delete customers
 */
export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkDeleteCustomers,
    
    // Optimistic update: instantly remove from UI
    onMutate: async (ids) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      
      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: customerKeys.lists() });
      
      // Optimistically update the list caches
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (old: PaginatedCustomersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((customer) => !ids.includes(customer.id)),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - ids.length),
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
