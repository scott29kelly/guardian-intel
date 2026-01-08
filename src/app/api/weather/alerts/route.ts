/**
 * GET /api/weather/alerts
 * 
 * Fetch active weather alerts from NOAA
 * 
 * Query params:
 * - state: Two-letter state code (required, e.g., "OH")
 * - lat/lon: Specific coordinates (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { noaaWeatherService } from "@/lib/services/weather/noaa-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!state && (!lat || !lon)) {
      return NextResponse.json(
        { error: "Either 'state' or 'lat'/'lon' parameters are required" },
        { status: 400 }
      );
    }

    let alerts;
    
    if (lat && lon) {
      // Get alerts for specific location
      alerts = await noaaWeatherService.getAlertsForLocation(
        parseFloat(lat),
        parseFloat(lon)
      );
    } else {
      // Get alerts for state
      alerts = await noaaWeatherService.getActiveAlerts(state!);
    }

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts,
      timestamp: new Date().toISOString(),
      source: "NOAA/NWS",
    });
  } catch (error) {
    console.error("[API] Weather alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather alerts" },
      { status: 500 }
    );
  }
}
