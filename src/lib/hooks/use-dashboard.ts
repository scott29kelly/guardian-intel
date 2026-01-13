/**
 * Dashboard Data Hook
 * 
 * PERFORMANCE OPTIMIZED: Now uses React Query for:
 * - Automatic caching with stale-while-revalidate
 * - Proper refetch functionality
 * - Background updates without loading spinners
 * - Deduplication of concurrent requests
 * - Smart polling with pause when window is hidden
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface DashboardCustomer {
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
  urgencyScore: number | null;
  profitPotential: number | null;
  churnRisk: number | null;
  status: string;
  stage: string;
  assignedRep: string;
  lastContact: Date;
  nextAction: string;
  nextActionDate: Date;
}

export interface DashboardIntelItem {
  id: string;
  customerId: string;
  source: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  actionable: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
}

export interface DashboardWeatherEvent {
  id: string;
  customerId: string | null;
  eventType: string;
  eventDate: Date;
  severity: string;
  hailSize: number | null;
  windSpeed: number | null;
  damageReported: boolean;
  claimFiled: boolean;
}

export interface DashboardMetrics {
  revenue: { value: number; change: number; target: number };
  pipeline: { value: number; deals: number };
  stormOpportunity: { value: number; affected: number };
  activeAlerts: number;
  hotLeads: number;
}

export interface DashboardAlert {
  id: string;
  type: string;
  message: string;
  time: string;
  severity: "critical" | "high" | "warning";
}

export interface DashboardData {
  priorityCustomers: DashboardCustomer[];
  intelItems: DashboardIntelItem[];
  weatherEvents: DashboardWeatherEvent[];
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
}

// Query key for dashboard data - enables proper cache invalidation
export const dashboardKeys = {
  all: ["dashboard"] as const,
  data: () => [...dashboardKeys.all, "data"] as const,
};

// Fetch function extracted for reuse
async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");
  
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  return {
    priorityCustomers: result.priorityCustomers,
    intelItems: result.intelItems,
    weatherEvents: result.weatherEvents,
    metrics: result.metrics,
    alerts: result.alerts,
  };
}

export function useDashboard() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: fetchDashboardData,
    // Cache data for 2 minutes before considering it stale
    staleTime: 1000 * 60 * 2,
    // Keep cached data for 5 minutes even after unmount
    gcTime: 1000 * 60 * 5,
    // Auto-refresh every 60 seconds when window is focused
    refetchInterval: 60000,
    // Pause polling when window is hidden (saves resources)
    refetchIntervalInBackground: false,
    // Show stale data while refetching in background
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch: () => refetch(),
    // Expose cache invalidation for manual refresh
    invalidate: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  };
}
