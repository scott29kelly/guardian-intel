/**
 * Supabase Client
 * 
 * Provides client-side access to Supabase for:
 * - Realtime subscriptions (live updates)
 * - Storage (file uploads)
 * 
 * The main database operations still go through Prisma.
 * This is specifically for Supabase-native features.
 */

import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client (singleton)
 * Returns null if Supabase is not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    // Don't create client on server side for realtime
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Client not configured - realtime features disabled");
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  console.log("[Supabase] Client initialized for realtime");
  return supabaseClient;
}

/**
 * Database table types for Supabase Realtime
 */
export type RealtimePayload<T> = {
  commit_timestamp: string;
  errors: null | string[];
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T | null;
  schema: string;
  table: string;
};

export type WeatherEventPayload = {
  id: string;
  eventType: string;
  severity: string;
  city: string;
  state: string;
  county: string;
  zipCode: string;
  eventDate: string;
  createdAt: string;
  hailSize: number | null;
  windSpeed: number | null;
};

export type IntelItemPayload = {
  id: string;
  customerId: string;
  category: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
};

export type CustomerPayload = {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  leadScore: number;
  status: string;
  updatedAt: string;
};

/**
 * Subscribe to realtime events on a table
 */
export function subscribeToTable<T>(
  tableName: string,
  callback: (payload: RealtimePayload<T>) => void,
  filter?: { column: string; value: string | number }
): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  let channel = client.channel(`${tableName}_changes`);

  const subscriptionConfig: any = {
    event: "*",
    schema: "public",
    table: tableName,
  };

  if (filter) {
    subscriptionConfig.filter = `${filter.column}=eq.${filter.value}`;
  }

  channel = channel.on(
    "postgres_changes",
    subscriptionConfig,
    (payload) => {
      callback(payload as RealtimePayload<T>);
    }
  );

  channel.subscribe((status) => {
    console.log(`[Supabase Realtime] ${tableName} subscription:`, status);
  });

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel | null): Promise<void> {
  if (!channel) return;
  
  const client = getSupabaseClient();
  if (!client) return;

  await client.removeChannel(channel);
  console.log("[Supabase Realtime] Channel removed");
}

/**
 * Subscribe to storm alerts (weather events)
 */
export function subscribeToStormAlerts(
  callback: (event: WeatherEventPayload, type: "INSERT" | "UPDATE" | "DELETE") => void
): RealtimeChannel | null {
  return subscribeToTable<WeatherEventPayload>("WeatherEvent", (payload) => {
    callback(payload.new, payload.eventType);
  });
}

/**
 * Subscribe to intel items for a specific customer
 */
export function subscribeToCustomerIntel(
  customerId: string,
  callback: (intel: IntelItemPayload, type: "INSERT" | "UPDATE" | "DELETE") => void
): RealtimeChannel | null {
  return subscribeToTable<IntelItemPayload>(
    "IntelItem",
    (payload) => {
      callback(payload.new, payload.eventType);
    },
    { column: "customerId", value: customerId }
  );
}

/**
 * Subscribe to customer updates
 */
export function subscribeToCustomers(
  callback: (customer: CustomerPayload, type: "INSERT" | "UPDATE" | "DELETE") => void
): RealtimeChannel | null {
  return subscribeToTable<CustomerPayload>("Customer", (payload) => {
    callback(payload.new, payload.eventType);
  });
}
