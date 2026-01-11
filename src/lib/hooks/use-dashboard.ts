/**
 * Dashboard Data Hook
 * 
 * Fetches aggregated dashboard data from the API
 */

import { useState, useEffect } from "react";

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

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/dashboard");
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Unknown error");
        }

        setData({
          priorityCustomers: result.priorityCustomers,
          intelItems: result.intelItems,
          weatherEvents: result.weatherEvents,
          metrics: result.metrics,
          alerts: result.alerts,
        });
        setError(null);
      } catch (err) {
        console.error("[Dashboard] Fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error, refetch: () => {} };
}
