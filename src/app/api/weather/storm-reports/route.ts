/**
 * GET /api/weather/storm-reports
 * 
 * Fetch today's storm reports from NOAA Storm Prediction Center
 * Returns hail, wind, and tornado reports
 * 
 * Query params:
 * - date: Optional date in YYYY-MM-DD format (defaults to today)
 * - state: Optional two-letter state code to filter results
 */

import { NextRequest, NextResponse } from "next/server";
import { noaaWeatherService } from "@/lib/services/weather/noaa-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const state = searchParams.get("state");

    let reports;

    if (dateStr) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      reports = await noaaWeatherService.getStormReportsForDate(date);
    } else {
      reports = await noaaWeatherService.getTodaysStormReports();
    }

    // Filter by state if provided
    if (state) {
      reports = {
        hail: reports.hail.filter((r) => r.state === state),
        wind: reports.wind.filter((r) => r.state === state),
        tornado: reports.tornado.filter((r) => r.state === state),
      };
    }

    return NextResponse.json({
      success: true,
      date: dateStr || new Date().toISOString().split("T")[0],
      state: state || "all",
      counts: {
        hail: reports.hail.length,
        wind: reports.wind.length,
        tornado: reports.tornado.length,
        total: reports.hail.length + reports.wind.length + reports.tornado.length,
      },
      reports,
      timestamp: new Date().toISOString(),
      source: "NOAA Storm Prediction Center",
    });
  } catch (error) {
    console.error("[API] Storm reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch storm reports" },
      { status: 500 }
    );
  }
}
