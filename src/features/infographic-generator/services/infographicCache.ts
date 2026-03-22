/**
 * Infographic Cache Service
 *
 * Wraps the existing Upstash Redis cache layer with infographic-specific
 * key formats, audience-aware TTLs, and customer-level invalidation.
 *
 * - Standard infographics: 24hr TTL (86400s)
 * - Customer-facing leave-behinds: 7-day TTL (604800s)
 * - Key format: guardian:cache:infographic:{customerId}:{presetId}:{YYYY-MM-DD}
 */

import { Redis } from "@upstash/redis";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";
import type { InfographicCacheEntry, InfographicAudience } from "../types/infographic.types";

// Cache namespace (self-contained, not added to CACHE_NAMESPACES in cache.ts)
const INFOGRAPHIC_CACHE_NAMESPACE = "guardian:cache:infographic";

/** TTL constants in seconds */
export const INFOGRAPHIC_CACHE_TTL = {
  /** 24 hours for standard internal infographics */
  standard: 86400,
  /** 7 days for customer-facing leave-behinds */
  leaveBehinds: 604800,
} as const;

// Local key tracking for in-memory fallback invalidation
const trackedKeys = new Set<string>();

/**
 * Build a cache key for an infographic entry.
 * Format: guardian:cache:infographic:{customerId}:{presetId}:{YYYY-MM-DD}
 */
function buildInfographicKey(customerId: string, presetId: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return `${INFOGRAPHIC_CACHE_NAMESPACE}:${customerId}:${presetId}:${dateStr}`;
}

/**
 * Retrieve a cached infographic for the given customer and preset.
 * Uses today's date as the cache key date component.
 *
 * @returns The cached entry if found and not expired, or null
 */
export async function getCached(
  customerId: string,
  presetId: string,
): Promise<InfographicCacheEntry | null> {
  const key = buildInfographicKey(customerId, presetId, new Date());
  const entry = await cacheGet<InfographicCacheEntry>(key);
  return entry;
}

/**
 * Cache an infographic result with audience-aware TTL.
 *
 * - "customer-facing" audience gets 7-day TTL (leave-behinds)
 * - "internal" audience gets 24hr TTL (standard)
 *
 * @returns true if the cache write succeeded
 */
export async function cacheResult(
  entry: InfographicCacheEntry,
  audience: InfographicAudience,
): Promise<boolean> {
  const ttl = audience === "customer-facing"
    ? INFOGRAPHIC_CACHE_TTL.leaveBehinds
    : INFOGRAPHIC_CACHE_TTL.standard;

  const generatedDate = entry.generatedAt instanceof Date
    ? entry.generatedAt
    : new Date(entry.generatedAt);

  const key = buildInfographicKey(entry.customerId, entry.presetId, generatedDate);

  // Track key for in-memory fallback invalidation
  trackedKeys.add(key);

  return cacheSet(key, entry, ttl);
}

/**
 * Invalidate all cached infographics for a given customer.
 *
 * Uses Redis SCAN with pattern matching when Redis is available.
 * Falls back to local key tracking for in-memory cache invalidation.
 *
 * @returns true if invalidation succeeded
 */
export async function invalidateForCustomer(customerId: string): Promise<boolean> {
  const pattern = `${INFOGRAPHIC_CACHE_NAMESPACE}:${customerId}:*`;
  const useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  if (useRedis) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Scan-and-delete pattern (matches cacheInvalidateNamespace in cache.ts)
      let cursor = "0";
      do {
        const result: [string, string[]] = await redis.scan(cursor, {
          match: pattern,
          count: 100,
        });
        cursor = String(result[0]);
        const keys = result[1];
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");

      return true;
    } catch (error) {
      console.error("[InfographicCache] Redis invalidation error:", error);
      return false;
    }
  }

  // In-memory fallback: use tracked keys to find and delete matching entries
  const prefix = `${INFOGRAPHIC_CACHE_NAMESPACE}:${customerId}:`;
  const keysToDelete: string[] = [];

  for (const key of trackedKeys) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }

  try {
    for (const key of keysToDelete) {
      await cacheDel(key);
      trackedKeys.delete(key);
    }
    return true;
  } catch (error) {
    console.error("[InfographicCache] In-memory invalidation error:", error);
    return false;
  }
}
