/**
 * Admin Cache Management API
 *
 * GET /api/admin/cache - Get cache statistics
 * DELETE /api/admin/cache - Invalidate cache (by namespace or all)
 *
 * Query params for DELETE:
 * - namespace: "dashboard" | "streetView" | "weather" | "analytics" | "all"
 *
 * Security:
 * - Admin role required
 * - Rate limited
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getCacheStats,
  resetCacheStats,
  cacheInvalidateNamespace,
  isCacheRedisEnabled,
  CACHE_TTL,
  CACHE_NAMESPACES,
  type CacheNamespace,
} from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check - admin only
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        redisEnabled: isCacheRedisEnabled(),
        ttlConfig: CACHE_TTL,
        namespaces: {
          config: CACHE_NAMESPACES,
          stats: stats.namespaces,
        },
      },
    });
  } catch (error) {
    console.error("[API] GET /api/admin/cache error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cache stats" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check - admin only
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace") || "all";

    // Validate namespace
    const validNamespaces = [...Object.keys(CACHE_NAMESPACES), "all"];
    if (!validNamespaces.includes(namespace)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid namespace. Must be one of: ${validNamespaces.join(", ")}`
        },
        { status: 400 }
      );
    }

    // Invalidate cache
    if (namespace === "all") {
      // Invalidate all namespaces
      const results = await Promise.all(
        (Object.keys(CACHE_NAMESPACES) as CacheNamespace[]).map(async (ns) => {
          const success = await cacheInvalidateNamespace(ns);
          return { namespace: ns, success };
        })
      );

      // Reset stats when clearing all cache
      const resetStats = searchParams.get("resetStats") === "true";
      if (resetStats) {
        resetCacheStats();
      }

      return NextResponse.json({
        success: true,
        message: "All cache namespaces invalidated",
        results,
        statsReset: resetStats,
      });
    } else {
      // Invalidate specific namespace
      const success = await cacheInvalidateNamespace(namespace as CacheNamespace);

      return NextResponse.json({
        success,
        message: success
          ? `Cache namespace "${namespace}" invalidated`
          : `Failed to invalidate namespace "${namespace}"`,
        namespace,
      });
    }
  } catch (error) {
    console.error("[API] DELETE /api/admin/cache error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to invalidate cache" },
      { status: 500 }
    );
  }
}
