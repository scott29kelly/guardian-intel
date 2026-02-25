/**
 * Competitor Analytics API
 *
 * GET /api/competitors/analytics - Get comprehensive competitor analytics
 *
 * Query params:
 * - startDate:    ISO date string (default: 90 days ago)
 * - endDate:      ISO date string (default: now)
 * - state:        Filter activities by state
 * - competitorId: Filter to a specific competitor
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompetitorAnalytics } from "@/lib/services/competitors/analytics";
import type { AnalyticsQueryParams } from "@/lib/services/competitors/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/competitors/analytics
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const params: AnalyticsQueryParams = {};

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const state = searchParams.get("state");
    const competitorId = searchParams.get("competitorId");

    if (startDate) {
      // Validate date format
      const d = new Date(startDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid startDate format" },
          { status: 400 }
        );
      }
      params.startDate = startDate;
    }

    if (endDate) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid endDate format" },
          { status: 400 }
        );
      }
      params.endDate = endDate;
    }

    if (state) {
      params.state = state;
    }

    if (competitorId) {
      params.competitorId = competitorId;
    }

    const analytics = await getCompetitorAnalytics(params);

    return NextResponse.json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
