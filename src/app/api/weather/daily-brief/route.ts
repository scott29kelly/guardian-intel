/**
 * GET /api/weather/daily-brief
 * 
 * Get the morning storm intel brief for sales team
 * Combines alerts, opportunities, and canvassing recommendations
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

    const brief = await stormIntelService.generateDailyBrief(state);

    return NextResponse.json({
      success: true,
      brief,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Daily brief error:", error);
    return NextResponse.json(
      { error: "Failed to generate daily brief" },
      { status: 500 }
    );
  }
}
