/**
 * Caching Service
 * 
 * Provides a unified caching layer using Upstash Redis.
 * Falls back to in-memory cache for development without Redis.
 */

import { Redis } from "@upstash/redis";

// Configuration
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Namespaces for cache key organization
export const CACHE_NAMESPACES = {
  dashboard: "guardian:cache:dashboard",
  streetView: "guardian:cache:streetview",
  weather: "guardian:cache:weather",
  analytics: "guardian:cache:analytics",
} as const;

export type CacheNamespace = keyof typeof CACHE_NAMESPACES;

// Default TTLs in seconds
export const CACHE_TTL = {
  dashboard: 30,        // 30 seconds - frequently changing data
  streetView: 3600,     // 1 hour - static image URLs
  weather: 300,         // 5 minutes - weather data
  analytics: 60,        // 1 minute - analytics aggregations
} as const;

// In-memory cache for development
const inMemoryCache = new Map<string, { value: unknown; expiresAt: number }>();

// Redis client singleton
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!USE_REDIS) return null;
  
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  
  return redisClient;
}

/**
 * Build a namespaced cache key
 */
export function buildCacheKey(namespace: CacheNamespace, ...parts: string[]): string {
  const prefix = CACHE_NAMESPACES[namespace];
  return [prefix, ...parts].join(":");
}

/**
 * Generate a hash for a string (used for address-based keys)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  
  if (redis) {
    try {
      const value = await redis.get<T>(key);
      return value;
    } catch (error) {
      console.error("[Cache] Redis GET error:", error);
      return null;
    }
  }
  
  // Fallback to in-memory cache
  const entry = inMemoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    inMemoryCache.delete(key);
    return null;
  }
  
  return entry.value as T;
}

/**
 * Set a value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return true;
    } catch (error) {
      console.error("[Cache] Redis SET error:", error);
      return false;
    }
  }
  
  // Fallback to in-memory cache
  inMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
  return true;
}

/**
 * Delete a value from cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  const redis = getRedisClient();
  
  if (redis) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error("[Cache] Redis DEL error:", error);
      return false;
    }
  }
  
  // Fallback to in-memory cache
  inMemoryCache.delete(key);
  return true;
}

/**
 * Delete all keys matching a pattern (namespace invalidation)
 */
export async function cacheInvalidateNamespace(namespace: CacheNamespace): Promise<boolean> {
  const prefix = CACHE_NAMESPACES[namespace];
  const redis = getRedisClient();
  
  if (redis) {
    try {
      // Scan and delete all keys with the namespace prefix
      let cursor = "0";
      do {
        const result: [string, string[]] = await redis.scan(cursor, { match: `${prefix}:*`, count: 100 });
        cursor = String(result[0]);
        const keys = result[1];
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
      return true;
    } catch (error) {
      console.error("[Cache] Redis namespace invalidation error:", error);
      return false;
    }
  }
  
  // Fallback to in-memory cache
  for (const key of inMemoryCache.keys()) {
    if (key.startsWith(prefix)) {
      inMemoryCache.delete(key);
    }
  }
  return true;
}

/**
 * Get or set pattern - fetch from cache or compute and cache
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Compute the value
  const value = await fetcher();
  
  // Cache the result
  await cacheSet(key, value, ttlSeconds);
  
  return value;
}

/**
 * Check if Redis is available
 */
export function isCacheRedisEnabled(): boolean {
  return USE_REDIS;
}

/**
 * Get cache stats (for debugging)
 */
export async function getCacheStats(): Promise<{
  type: "redis" | "memory";
  keys?: number;
}> {
  const redis = getRedisClient();
  
  if (redis) {
    try {
      const info = await redis.dbsize();
      return { type: "redis", keys: info };
    } catch {
      return { type: "redis" };
    }
  }
  
  return { type: "memory", keys: inMemoryCache.size };
}

// ============================================
// Convenience functions for specific caches
// ============================================

/**
 * Invalidate dashboard cache
 * Call this after mutations that affect dashboard data (customers, weather events, etc.)
 */
export async function invalidateDashboardCache(): Promise<boolean> {
  const key = buildCacheKey("dashboard", "main");
  return cacheDel(key);
}
