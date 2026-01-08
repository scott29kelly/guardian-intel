/**
 * GET /api/weather/check-address
 * 
 * Check if a specific address may have been affected by recent storms
 * Uses NOAA data to identify potential storm damage opportunities
 * 
 * Query params:
 * - lat: Latitude (required)
 * - lon: Longitude (required)
 * - radius: Search radius in miles (optional, default 10)
 */

import { NextRequest, NextResponse } from "next/server";
import { noaaWeatherService } from "@/lib/services/weather/noaa-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const radius = searchParams.get("radius");

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "'lat' and 'lon' parameters are required" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 }
      );
    }

    const radiusMiles = radius ? parseFloat(radius) : 10;

    const result = await noaaWeatherService.checkAddressForStormDamage(
      latitude,
      longitude,
      radiusMiles
    );

    return NextResponse.json({
      success: true,
      location: {
        latitude,
        longitude,
        radiusMiles,
      },
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Check address error:", error);
    return NextResponse.json(
      { error: "Failed to check address for storm damage" },
      { status: 500 }
    );
  }
}
