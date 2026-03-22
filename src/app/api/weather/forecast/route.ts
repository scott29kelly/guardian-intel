import { NextResponse } from "next/server";
import { noaaWeatherService } from "@/lib/services/weather/noaa-service";
import { cacheGet, cacheSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "lat and lon must be valid numbers" },
      { status: 400 }
    );
  }

  try {
    // Round to 2 decimal places for cache key (~1.1km precision)
    const cacheKey = buildCacheKey("weatherForecast", `${latitude.toFixed(2)}_${longitude.toFixed(2)}`);
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const forecast = await noaaWeatherService.getForecast(latitude, longitude);

    if (!forecast) {
      return NextResponse.json(
        { error: "Unable to fetch forecast for this location" },
        { status: 404 }
      );
    }

    // Transform dates to ISO strings for JSON serialization
    const serializedForecast = {
      ...forecast,
      periods: forecast.periods.map((period) => ({
        ...period,
        startTime: period.startTime.toISOString(),
        endTime: period.endTime.toISOString(),
      })),
      alerts: forecast.alerts.map((alert) => ({
        ...alert,
        onset: alert.onset.toISOString(),
        expires: alert.expires.toISOString(),
      })),
    };

    await cacheSet(cacheKey, serializedForecast, CACHE_TTL.weatherForecast);

    return NextResponse.json(serializedForecast);
  } catch (error) {
    console.error("[Weather API] Forecast error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather forecast" },
      { status: 500 }
    );
  }
}
