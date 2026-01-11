/**
 * Realtime Hooks
 * 
 * React hooks for Supabase Realtime subscriptions.
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

  return { isSupabaseConfigured };
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
