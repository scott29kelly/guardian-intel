/**
 * GET /api/lead-intel/properties
 *
 * Paginated list of TrackedProperty rows with filters. Requires NextAuth
 * session (any authenticated user). Rep-ownership filtering is DEFERRED
 * per LG-02 / Phase 7 D-06 — see .planning/STATE.md ### Discovered TODOs.
 *
 * Query params:
 *   minScore, maxScore        — score range
 *   signalTypes               — comma-separated signal-type list
 *   hasPendingResolution      — "true"/"false"
 *   zipCode, state
 *   limit (default 50, max 200), offset
 *
 * Security: NextAuth session required, Input validated (T-08-03-04, T-08-03-06)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTrackedProperties } from "@/lib/services/lead-intel";
import type { PropertyListFilters } from "@/lib/services/lead-intel";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const sp = request.nextUrl.searchParams;

    // Parse and validate numeric query parameters to prevent NaN propagation
    const minScore = sp.get("minScore") != null ? Number(sp.get("minScore")) : undefined;
    const maxScore = sp.get("maxScore") != null ? Number(sp.get("maxScore")) : undefined;
    const limit = sp.get("limit") != null ? Number(sp.get("limit")) : undefined;
    const offset = sp.get("offset") != null ? Number(sp.get("offset")) : undefined;

    if (
      (minScore !== undefined && isNaN(minScore)) ||
      (maxScore !== undefined && isNaN(maxScore)) ||
      (limit !== undefined && isNaN(limit)) ||
      (offset !== undefined && isNaN(offset))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: "minScore, maxScore, limit, and offset must be valid numbers",
        },
        { status: 400 },
      );
    }

    const filters: PropertyListFilters = {
      minScore,
      maxScore,
      signalTypes: sp.get("signalTypes")?.split(",").filter(Boolean),
      hasPendingResolution: sp.get("hasPendingResolution") === "true",
      zipCode: sp.get("zipCode") ?? undefined,
      state: sp.get("state") ?? undefined,
      limit,
      offset,
    };

    const result = await listTrackedProperties(filters);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[API] GET /api/lead-intel/properties error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "List failed" },
      { status: 500 },
    );
  }
}
