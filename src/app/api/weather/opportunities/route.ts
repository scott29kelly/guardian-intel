/**
 * GET /api/weather/opportunities
 * 
 * Get storm damage opportunities - calculates potential roofing leads
 * based on recent storm activity in an area
 * 
 * Query params:
 * - state: Two-letter state code (required, e.g., "OH")
 */

import { NextRequest, NextResponse } from "next/server";
import { stormIntelService } from "@/lib/services/weather/storm-intel-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");

    if (!state) {
      return NextResponse.json(
        { error: "'state' parameter is required" },
        { status: 400 }
      );
    }

    const opportunities = await stormIntelService.getStormOpportunities(state);

    // Calculate summary stats
    const totalValue = opportunities.reduce(
      (sum, o) => sum + o.estimatedOpportunityValue,
      0
    );
    const totalHomes = opportunities.reduce(
      (sum, o) => sum + o.estimatedAffectedHomes,
      0
    );
    const criticalCount = opportunities.filter(
      (o) => o.severity === "critical"
    ).length;

    return NextResponse.json({
      success: true,
      state,
      summary: {
        totalOpportunities: opportunities.length,
        criticalOpportunities: criticalCount,
        estimatedAffectedHomes: totalHomes,
        estimatedTotalValue: totalValue,
        estimatedTotalValueFormatted: `$${(totalValue / 1000).toFixed(0)}K`,
      },
      opportunities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Storm opportunities error:", error);
    return NextResponse.json(
      { error: "Failed to calculate storm opportunities" },
      { status: 500 }
    );
  }
}
