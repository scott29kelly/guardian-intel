/**
 * Predictive Storm Alerts API
 * 
 * GET /api/weather/predictions - Get storm predictions for next 72 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { predictiveStormService } from "@/lib/services/weather/predictive-storm-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || undefined;
    const hoursAhead = parseInt(searchParams.get("hours") || "72");
    const summary = searchParams.get("summary") === "true";
    const minSeverity = searchParams.get("minSeverity") as any;

    if (summary) {
      // Return summary for dashboard
      const data = await predictiveStormService.getPredictionSummary();
      return NextResponse.json({
        success: true,
        data,
      });
    }

    // Return full predictions
    const predictions = await predictiveStormService.getPredictions({
      state,
      hoursAhead,
      minSeverity,
    });

    return NextResponse.json({
      success: true,
      data: predictions,
      meta: {
        totalPredictions: predictions.length,
        hoursAhead,
        state: state || "all",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Predictions API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}
