/**
 * Dashboard Data Hook
 * 
 * Fetches aggregated dashboard data from the API.
 * Integrates with SSE for real-time updates - auto-refetches when
 * new events are received instead of polling every 60s.
 */

import { useState, useEffect, useCallback, useRef } from "react";

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
  const [sseStatus, setSSEStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
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
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to SSE for real-time updates
  const connectSSE = useCallback(() => {
    // Cleanup existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setSSEStatus("connecting");
    
    const eventSource = new EventSource("/api/events");
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log("[Dashboard SSE] Connected");
      setSSEStatus("connected");
      reconnectAttemptRef.current = 0;
    };
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Skip heartbeat events
        if (parsed.type === "heartbeat") return;
        
        // Refetch dashboard on relevant events (storm, intel, customer)
        if (["storm", "intel", "customer"].includes(parsed.type)) {
          console.log(`[Dashboard SSE] Received ${parsed.type} event, refetching...`);
          fetchDashboard(true); // Silent refetch
        }
      } catch (err) {
        console.error("[Dashboard SSE] Parse error:", err);
      }
    };
    
    eventSource.onerror = () => {
      console.warn("[Dashboard SSE] Connection error");
      eventSource.close();
      
      const attempt = ++reconnectAttemptRef.current;
      
      if (attempt > 10) {
        setSSEStatus("error");
        console.error("[Dashboard SSE] Max reconnection attempts reached, falling back to polling");
        // Fall back to polling if SSE fails
        return;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 30000);
      console.log(`[Dashboard SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${attempt})`);
      
      setSSEStatus("disconnected");
      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    };
  }, [fetchDashboard]);

  // Initial fetch and SSE connection - run only once on mount
  useEffect(() => {
    fetchDashboard();
    connectSSE();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  // Fallback polling when SSE fails
  useEffect(() => {
    if (sseStatus !== "error") return;
    
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [sseStatus, fetchDashboard]);

  return { 
    data, 
    isLoading, 
    error, 
    refetch: () => fetchDashboard(false),
    sseStatus,
    lastUpdate,
    isRealtime: sseStatus === "connected",
  };
}
