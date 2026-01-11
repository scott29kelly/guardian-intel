import { NextResponse } from "next/server";
import { noaaWeatherService } from "@/lib/services/weather/noaa-service";

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

    return NextResponse.json(serializedForecast);
  } catch (error) {
    console.error("[Weather API] Forecast error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather forecast" },
      { status: 500 }
    );
  }
}
