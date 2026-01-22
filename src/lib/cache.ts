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

// Hit/miss tracking for debugging (per-namespace)
interface CacheStatEntry {
  hits: number;
  misses: number;
  lastReset: number;
}

const cacheStats = new Map<CacheNamespace | "global", CacheStatEntry>();

function initStatsEntry(): CacheStatEntry {
  return { hits: 0, misses: 0, lastReset: Date.now() };
}

function trackHit(namespace?: CacheNamespace): void {
  // Track global stats
  if (!cacheStats.has("global")) {
    cacheStats.set("global", initStatsEntry());
  }
  cacheStats.get("global")!.hits++;

  // Track namespace-specific stats
  if (namespace) {
    if (!cacheStats.has(namespace)) {
      cacheStats.set(namespace, initStatsEntry());
    }
    cacheStats.get(namespace)!.hits++;
  }
}

function trackMiss(namespace?: CacheNamespace): void {
  // Track global stats
  if (!cacheStats.has("global")) {
    cacheStats.set("global", initStatsEntry());
  }
  cacheStats.get("global")!.misses++;

  // Track namespace-specific stats
  if (namespace) {
    if (!cacheStats.has(namespace)) {
      cacheStats.set(namespace, initStatsEntry());
    }
    cacheStats.get(namespace)!.misses++;
  }
}

function getNamespaceFromKey(key: string): CacheNamespace | undefined {
  for (const [ns, prefix] of Object.entries(CACHE_NAMESPACES)) {
    if (key.startsWith(prefix)) {
      return ns as CacheNamespace;
    }
  }
  return undefined;
}

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
  const namespace = getNamespaceFromKey(key);

  if (redis) {
    try {
      const value = await redis.get<T>(key);
      if (value !== null) {
        trackHit(namespace);
      } else {
        trackMiss(namespace);
      }
      return value;
    } catch (error) {
      console.error("[Cache] Redis GET error:", error);
      trackMiss(namespace);
      return null;
    }
  }

  // Fallback to in-memory cache
  const entry = inMemoryCache.get(key);
  if (!entry) {
    trackMiss(namespace);
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    inMemoryCache.delete(key);
    trackMiss(namespace);
    return null;
  }

  trackHit(namespace);
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
  const keysToDelete: string[] = [];
  inMemoryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => inMemoryCache.delete(key));
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
export interface CacheStatsResult {
  type: "redis" | "memory";
  keys?: number;
  global: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    lastReset: number;
  };
  namespaces: Record<string, {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
  }>;
}

export async function getCacheStats(): Promise<CacheStatsResult> {
  const redis = getRedisClient();

  // Get global stats
  const globalStats = cacheStats.get("global") || initStatsEntry();
  const globalTotal = globalStats.hits + globalStats.misses;

  // Get namespace-specific stats
  const namespaceStats: CacheStatsResult["namespaces"] = {};
  for (const ns of Object.keys(CACHE_NAMESPACES) as CacheNamespace[]) {
    const stats = cacheStats.get(ns);
    if (stats) {
      const total = stats.hits + stats.misses;
      namespaceStats[ns] = {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: total > 0 ? Math.round((stats.hits / total) * 100) : 0,
        totalRequests: total,
      };
    }
  }

  const baseResult = {
    global: {
      hits: globalStats.hits,
      misses: globalStats.misses,
      hitRate: globalTotal > 0 ? Math.round((globalStats.hits / globalTotal) * 100) : 0,
      totalRequests: globalTotal,
      lastReset: globalStats.lastReset,
    },
    namespaces: namespaceStats,
  };

  if (redis) {
    try {
      const keyCount = await redis.dbsize();
      return { type: "redis", keys: keyCount, ...baseResult };
    } catch {
      return { type: "redis", ...baseResult };
    }
  }

  return { type: "memory", keys: inMemoryCache.size, ...baseResult };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats.clear();
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
