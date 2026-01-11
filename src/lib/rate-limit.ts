/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for API routes to prevent abuse.
 * Uses in-memory store by default, can be configured for Redis/Upstash in production.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Configuration
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// In-memory store for development (resets on server restart)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // AI Chat - expensive operation
  ai: { requests: 20, window: "1m" as const },
  
  // Auth endpoints - prevent brute force
  auth: { requests: 5, window: "1m" as const },
  
  // General API - standard protection
  api: { requests: 100, window: "1m" as const },
  
  // Weather lookups - external API calls
  weather: { requests: 30, window: "1m" as const },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Create Upstash rate limiter (for production with Redis)
 */
function createUpstashLimiter(type: RateLimitType) {
  if (!USE_REDIS) return null;
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const config = RATE_LIMITS[type];
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `guardian:ratelimit:${type}`,
  });
}

/**
 * In-memory rate limiter for development
 */
function checkInMemoryLimit(
  identifier: string,
  type: RateLimitType
): { success: boolean; remaining: number; reset: number } {
  const config = RATE_LIMITS[type];
  const windowMs = parseWindow(config.window);
  const now = Date.now();
  const key = `${type}:${identifier}`;
  
  const existing = inMemoryStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    // New window
    inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: config.requests - 1, reset: now + windowMs };
  }
  
  if (existing.count >= config.requests) {
    // Rate limited
    return { success: false, remaining: 0, reset: existing.resetTime };
  }
  
  // Increment
  existing.count++;
  return { success: true, remaining: config.requests - existing.count, reset: existing.resetTime };
}

function parseWindow(window: string): number {
  const unit = window.slice(-1);
  const value = parseInt(window.slice(0, -1));
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 60 * 1000; // Default 1 minute
  }
}

/**
 * Rate limit check for API routes
 * 
 * @param request - The incoming request
 * @param type - The type of rate limit to apply
 * @returns null if allowed, NextResponse if rate limited
 */
export async function rateLimit(
  request: Request,
  type: RateLimitType = "api"
): Promise<NextResponse | null> {
  if (!RATE_LIMIT_ENABLED) {
    return null;
  }

  // Get identifier (IP address or user ID)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  const identifier = ip;

  let result: { success: boolean; remaining: number; reset: number };

  if (USE_REDIS) {
    const limiter = createUpstashLimiter(type);
    if (limiter) {
      const upstashResult = await limiter.limit(identifier);
      result = {
        success: upstashResult.success,
        remaining: upstashResult.remaining,
        reset: upstashResult.reset,
      };
    } else {
      result = checkInMemoryLimit(identifier, type);
    }
  } else {
    result = checkInMemoryLimit(identifier, type);
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMITS[type].requests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.reset),
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // Return null to indicate request is allowed
  // Headers will be set by the API route if needed
  return null;
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  type: RateLimitType,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMITS[type].requests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };
}
