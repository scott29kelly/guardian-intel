/**
 * Realtime Hooks
 * 
 * React hooks for real-time updates via:
 * 1. SSE (Server-Sent Events) - Primary, works with Vercel
 * 2. Supabase Realtime - Fallback when configured
 * 
 * Provides live updates for storm alerts, customers, and intel.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribeToStormAlerts,
  subscribeToCustomers,
  subscribeToCustomerIntel,
  unsubscribe,
  WeatherEventPayload,
  CustomerPayload,
  IntelItemPayload,
} from "@/lib/supabase";

// ============================================================================
// SSE Types
// ============================================================================

export type SSEEventType = "storm" | "intel" | "customer" | "heartbeat" | "connected";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

export interface SSEConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error";
  lastHeartbeat: Date | null;
  reconnectAttempt: number;
  error: string | null;
}

// ============================================================================
// SSE Hook with Exponential Backoff
// ============================================================================

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

function calculateBackoff(attempt: number): number {
  // Exponential backoff with jitter: min(base * 2^attempt + random, max)
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

/**
 * Core SSE hook - connects to /api/events and handles reconnection
 */
export function useSSE() {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    status: "disconnected",
    lastHeartbeat: null,
    reconnectAttempt: 0,
    error: null,
  });
  const [events, setEvents] = useState<SSEEvent[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  
  const connect = useCallback(() => {
    // Cleanup existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionState((prev) => ({
      ...prev,
      status: "connecting",
      error: null,
    }));
    
    const eventSource = new EventSource("/api/events");
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log("[SSE] Connection opened");
      setConnectionState({
        status: "connected",
        lastHeartbeat: new Date(),
        reconnectAttempt: 0,
        error: null,
      });
    };
    
    eventSource.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);
        
        // Update heartbeat timestamp
        if (parsed.type === "heartbeat") {
          setConnectionState((prev) => ({
            ...prev,
            lastHeartbeat: new Date(),
          }));
          return;
        }
        
        // Add event to list (keep last 100)
        setEvents((prev) => [parsed, ...prev].slice(0, 100));
        
        // Invalidate relevant queries based on event type
        switch (parsed.type) {
          case "storm":
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["weather"] });
            // Show notification for severe storms
            const stormData = parsed.data as { severity?: string; eventType?: string; city?: string; state?: string };
            if (stormData.severity === "severe" || stormData.severity === "high") {
              showNotification(
                `⚠️ ${stormData.eventType} Alert`,
                `${stormData.severity?.toUpperCase()} severity in ${stormData.city}, ${stormData.state}`
              );
            }
            break;
          case "intel":
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            break;
          case "customer":
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            break;
        }
      } catch (err) {
        console.error("[SSE] Failed to parse event:", err);
      }
    };
    
    eventSource.onerror = () => {
      console.error("[SSE] Connection error");
      eventSource.close();
      
      setConnectionState((prev) => {
        const nextAttempt = prev.reconnectAttempt + 1;
        
        if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
          return {
            status: "error",
            lastHeartbeat: prev.lastHeartbeat,
            reconnectAttempt: nextAttempt,
            error: "Max reconnection attempts reached",
          };
        }
        
        // Schedule reconnection with exponential backoff
        const delay = calculateBackoff(nextAttempt);
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${nextAttempt})`);
        
        reconnectTimeoutRef.current = setTimeout(connect, delay);
        
        return {
          status: "disconnected",
          lastHeartbeat: prev.lastHeartbeat,
          reconnectAttempt: nextAttempt,
          error: `Reconnecting... (attempt ${nextAttempt})`,
        };
      });
    };
  }, [queryClient]);
  
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionState({
      status: "disconnected",
      lastHeartbeat: null,
      reconnectAttempt: 0,
      error: null,
    });
  }, []);
  
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);
  
  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return {
    connectionState,
    events,
    connect,
    disconnect,
    clearEvents,
    isConnected: connectionState.status === "connected",
  };
}

/**
 * Filter SSE events by type
 */
export function useSSEStormAlerts() {
  const { events, connectionState, clearEvents, isConnected } = useSSE();
  
  const stormEvents = events.filter((e) => e.type === "storm");
  
  return {
    alerts: stormEvents.map((e) => ({
      type: "INSERT" as const,
      data: e.data as WeatherEventPayload,
      timestamp: new Date(e.timestamp),
    })),
    isConnected,
    connectionState,
    clearAlerts: clearEvents,
  };
}

export interface RealtimeEvent<T> {
  type: "INSERT" | "UPDATE" | "DELETE";
  data: T;
  timestamp: Date;
}

/**
 * Hook to subscribe to live storm alerts
 */
export function useStormAlerts() {
  const [alerts, setAlerts] = useState<RealtimeEvent<WeatherEventPayload>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = subscribeToStormAlerts((event, type) => {
      const newEvent: RealtimeEvent<WeatherEventPayload> = {
        type,
        data: event,
        timestamp: new Date(),
      };
      
      setAlerts((prev) => [newEvent, ...prev].slice(0, 50)); // Keep last 50
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["weather"] });
      
      // Show notification for severe weather
      if (type === "INSERT" && (event.severity === "high" || event.severity === "severe")) {
        showNotification(
          `⚠️ ${event.eventType} Alert`,
          `${event.severity.toUpperCase()} severity in ${event.city}, ${event.state}`
        );
      }
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
    }

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        setIsConnected(false);
      }
    };
  }, [queryClient]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, isConnected, clearAlerts };
}

/**
 * Hook to subscribe to customer updates
 */
export function useCustomerUpdates() {
  const [updates, setUpdates] = useState<RealtimeEvent<CustomerPayload>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = subscribeToCustomers((customer, type) => {
      const newEvent: RealtimeEvent<CustomerPayload> = {
        type,
        data: customer,
        timestamp: new Date(),
      };
      
      setUpdates((prev) => [newEvent, ...prev].slice(0, 50));
      
      // Invalidate customer queries
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
    }

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        setIsConnected(false);
      }
    };
  }, [queryClient]);

  return { updates, isConnected };
}

/**
 * Hook to subscribe to intel updates for a specific customer
 */
export function useCustomerIntelUpdates(customerId: string | null) {
  const [intel, setIntel] = useState<RealtimeEvent<IntelItemPayload>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customerId) {
      setIsConnected(false);
      return;
    }

    const channel = subscribeToCustomerIntel(customerId, (item, type) => {
      const newEvent: RealtimeEvent<IntelItemPayload> = {
        type,
        data: item,
        timestamp: new Date(),
      };
      
      setIntel((prev) => [newEvent, ...prev].slice(0, 20));
      
      // Invalidate intel queries
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
    }

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        setIsConnected(false);
      }
    };
  }, [customerId, queryClient]);

  return { intel, isConnected };
}

/**
 * Combined realtime status hook
 * SSE is always available; Supabase is optional
 */
export function useRealtimeStatus() {
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase env vars are set
    const configured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setIsSupabaseConfigured(configured);
  }, []);

  // SSE is always available as it's built into our API
  return { 
    isSupabaseConfigured,
    isSSEAvailable: true, // SSE is always available
  };
}

// Helper to show browser notifications
function showNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/guardian-icon.png" });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body, icon: "/guardian-icon.png" });
      }
    });
  }
}
