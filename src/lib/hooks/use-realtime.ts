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
import { useQueryClient } from "@tanstack/react-query";

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
      // Note: Browser also logs net::ERR_CONNECTION_REFUSED - this is expected during dev startup
      eventSource.close();
      
      setConnectionState((prev) => {
        const nextAttempt = prev.reconnectAttempt + 1;
        
        if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
          console.warn("[Dashboard SSE] Connection failed after max retries. Click 'Retry' in the status indicator to reconnect.");
          return {
            status: "error",
            lastHeartbeat: prev.lastHeartbeat,
            reconnectAttempt: nextAttempt,
            error: "Max reconnection attempts reached",
          };
        }
        
        // Schedule reconnection with exponential backoff
        const delay = calculateBackoff(nextAttempt);
        // Only log after first few attempts to reduce noise
        if (nextAttempt <= 3) {
          console.log(`[Dashboard SSE] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${nextAttempt})`);
        }
        
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
  
  // Auto-connect on mount (with small delay to let dev server stabilize)
  useEffect(() => {
    const initialDelay = setTimeout(() => {
      connect();
    }, 500);
    return () => {
      clearTimeout(initialDelay);
      disconnect();
    };
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
