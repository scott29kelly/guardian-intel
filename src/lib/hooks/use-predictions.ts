/**
 * Storm Predictions Hooks
 * 
 * React Query hooks for predictive storm alerts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface StormPrediction {
  id: string;
  type: "hail" | "wind" | "tornado" | "thunderstorm" | "mixed";
  severity: "marginal" | "slight" | "enhanced" | "moderate" | "high";
  probability: number;
  expectedStart: string;
  expectedEnd: string;
  hoursUntil: number;
  latitude: number;
  longitude: number;
  affectedArea: {
    states: string[];
    counties: string[];
    zipCodes: string[];
    radiusMiles: number;
  };
  threats: {
    hailProbability: number;
    hailSizeRange: string;
    windProbability: number;
    windSpeedRange: string;
    tornadoProbability: number;
  };
  potentialAffectedCustomers: number;
  estimatedDamageValue: number;
  recommendation: string;
  priorityLevel: "watch" | "prepare" | "urgent" | "critical";
  source: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionSummary {
  totalPredictions: number;
  urgentCount: number;
  next24Hours: StormPrediction[];
  next48Hours: StormPrediction[];
  next72Hours: StormPrediction[];
  byState: Record<string, StormPrediction[]>;
  totalAffectedCustomers: number;
  totalPotentialValue: number;
}

export interface AffectedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  leadScore: number;
  estimatedJobValue: number | null;
  distanceFromCenter: number;
  stormPredictionId: string;
}

export interface PredictionFilters {
  state?: string;
  hours?: number;
  minSeverity?: "marginal" | "slight" | "enhanced" | "moderate" | "high";
}

// ============================================================
// Query Keys
// ============================================================

export const predictionKeys = {
  all: ["predictions"] as const,
  lists: () => [...predictionKeys.all, "list"] as const,
  list: (filters: PredictionFilters) => [...predictionKeys.lists(), filters] as const,
  summary: () => [...predictionKeys.all, "summary"] as const,
  affectedCustomers: (predictionId: string) => [...predictionKeys.all, "affected", predictionId] as const,
};

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch storm predictions
 */
export function usePredictions(filters: PredictionFilters = {}) {
  return useQuery({
    queryKey: predictionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.state) params.set("state", filters.state);
      if (filters.hours) params.set("hours", filters.hours.toString());
      if (filters.minSeverity) params.set("minSeverity", filters.minSeverity);

      const response = await fetch(`/api/weather/predictions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch predictions");

      const data = await response.json();
      return data as {
        success: boolean;
        data: StormPrediction[];
        meta: { totalPredictions: number; hoursAhead: number; generatedAt: string };
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - predictions don't change frequently
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
}

/**
 * Fetch prediction summary for dashboard
 */
export function usePredictionSummary() {
  return useQuery({
    queryKey: predictionKeys.summary(),
    queryFn: async () => {
      const response = await fetch("/api/weather/predictions?summary=true");
      if (!response.ok) throw new Error("Failed to fetch prediction summary");

      const data = await response.json();
      return data.data as PredictionSummary;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}

/**
 * Fetch customers affected by a prediction
 */
export function useAffectedCustomers(predictionId: string | null) {
  return useQuery({
    queryKey: predictionKeys.affectedCustomers(predictionId || ""),
    queryFn: async () => {
      if (!predictionId) return [];

      const response = await fetch(`/api/weather/predictions/${predictionId}/affected-customers`);
      if (!response.ok) throw new Error("Failed to fetch affected customers");

      const data = await response.json();
      return data.data as AffectedCustomer[];
    },
    enabled: !!predictionId,
  });
}

/**
 * Send storm prediction notifications
 */
export function useSendPredictionNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      predictionId: string;
      title: string;
      body: string;
      severity: StormPrediction["severity"];
      hoursUntil: number;
      affectedStates: string[];
      userIds?: string[];
    }) => {
      const response = await fetch("/api/weather/predictions/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send notifications");
      }

      return response.json();
    },
  });
}
