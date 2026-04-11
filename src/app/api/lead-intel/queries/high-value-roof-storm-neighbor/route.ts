/**
 * GET /api/lead-intel/queries/high-value-roof-storm-neighbor
 *
 * The LG-09 saved compound query: roof age 15-25, 3+ storms in 36mo,
 * Guardian neighbor closed-won in 12mo within 1 mile. Requires NextAuth.
 *
 * Query params (optional):
 *   neighborRadiusMiles (default 1)
 *   stormWindowMonths (default 36)
 *   neighborWindowMonths (default 12)
 *   limit (default 100, max 500)
 *
 * Security: NextAuth session required, Input validated (T-08-03-05)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { highValueRoofStormNeighbor } from "@/lib/services/lead-intel";

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
    const neighborRadiusMiles = sp.get("neighborRadiusMiles") != null ? Number(sp.get("neighborRadiusMiles")) : undefined;
    const stormWindowMonths = sp.get("stormWindowMonths") != null ? Number(sp.get("stormWindowMonths")) : undefined;
    const neighborWindowMonths = sp.get("neighborWindowMonths") != null ? Number(sp.get("neighborWindowMonths")) : undefined;
    const limit = sp.get("limit") != null ? Number(sp.get("limit")) : undefined;

    if (
      (neighborRadiusMiles !== undefined && isNaN(neighborRadiusMiles)) ||
      (stormWindowMonths !== undefined && isNaN(stormWindowMonths)) ||
      (neighborWindowMonths !== undefined && isNaN(neighborWindowMonths)) ||
      (limit !== undefined && isNaN(limit))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: "neighborRadiusMiles, stormWindowMonths, neighborWindowMonths, and limit must be valid numbers",
        },
        { status: 400 },
      );
    }

    const rows = await highValueRoofStormNeighbor({
      neighborRadiusMiles,
      stormWindowMonths,
      neighborWindowMonths,
      limit,
    });
    return NextResponse.json({ success: true, queryId: "high-value-roof-storm-neighbor", rows });
  } catch (error) {
    console.error("[API] GET /api/lead-intel/queries/high-value-roof-storm-neighbor error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
