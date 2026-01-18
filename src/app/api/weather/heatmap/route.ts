import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/weather/heatmap
 * 
 * Returns aggregated storm data for heatmap visualization.
 * Includes coordinates, intensity (based on severity + affected customers),
 * and recency weighting.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "6");
    const minSeverity = searchParams.get("minSeverity") || "minor";

    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Severity weights for intensity calculation
    const severityWeights: Record<string, number> = {
      minor: 0.25,
      moderate: 0.5,
      severe: 0.75,
      catastrophic: 1.0,
    };

    // Map severity filter to allowed severities
    const severityOrder = ["minor", "moderate", "severe", "catastrophic"];
    const minIndex = severityOrder.indexOf(minSeverity);
    const allowedSeverities = severityOrder.slice(minIndex);

    // Fetch weather events with coordinates
    const weatherEvents = await prisma.weatherEvent.findMany({
      where: {
        eventDate: { gte: startDate },
        latitude: { not: undefined },
        longitude: { not: undefined },
        severity: { in: allowedSeverities },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        eventType: true,
        eventDate: true,
        severity: true,
        hailSize: true,
        windSpeed: true,
        affectedCustomers: true,
        estimatedDamage: true,
        city: true,
        county: true,
        state: true,
      },
      orderBy: { eventDate: "desc" },
    });

    // Calculate intensity for each point
    const now = Date.now();
    const maxAge = months * 30 * 24 * 60 * 60 * 1000; // months in milliseconds

    const heatmapPoints = weatherEvents
      .filter((event) => event.latitude && event.longitude)
      .map((event) => {
        // Base intensity from severity
        const severityIntensity = severityWeights[event.severity] || 0.5;

        // Boost from affected customers (normalized, max ~50 customers = full boost)
        const customerBoost = Math.min((event.affectedCustomers || 0) / 50, 1) * 0.3;

        // Boost from damage amount (normalized, max ~$500k = full boost)
        const damageBoost = event.estimatedDamage
          ? Math.min(event.estimatedDamage / 500000, 1) * 0.2
          : 0;

        // Recency factor (more recent = higher intensity)
        const eventAge = now - new Date(event.eventDate).getTime();
        const recencyFactor = 1 - (eventAge / maxAge) * 0.5; // 50% decay over period

        // Combined intensity (0-1 scale)
        const intensity = Math.min(
          (severityIntensity + customerBoost + damageBoost) * recencyFactor,
          1
        );

        return {
          lat: event.latitude!,
          lng: event.longitude!,
          intensity: Math.round(intensity * 100) / 100,
          // Metadata for tooltips
          meta: {
            id: event.id,
            type: event.eventType,
            date: event.eventDate,
            severity: event.severity,
            location: [event.city, event.county, event.state]
              .filter(Boolean)
              .join(", "),
            hailSize: event.hailSize,
            windSpeed: event.windSpeed,
            affectedCustomers: event.affectedCustomers,
            estimatedDamage: event.estimatedDamage,
          },
        };
      });

    // Also aggregate by region for summary stats
    const regionStats: Record<string, {
      count: number;
      totalIntensity: number;
      totalCustomers: number;
      totalDamage: number;
    }> = {};

    heatmapPoints.forEach((point) => {
      const region = point.meta.location || "Unknown";
      if (!regionStats[region]) {
        regionStats[region] = {
          count: 0,
          totalIntensity: 0,
          totalCustomers: 0,
          totalDamage: 0,
        };
      }
      regionStats[region].count++;
      regionStats[region].totalIntensity += point.intensity;
      regionStats[region].totalCustomers += point.meta.affectedCustomers || 0;
      regionStats[region].totalDamage += point.meta.estimatedDamage || 0;
    });

    // Convert to sorted array
    const topRegions = Object.entries(regionStats)
      .map(([region, stats]) => ({
        region,
        eventCount: stats.count,
        avgIntensity: Math.round((stats.totalIntensity / stats.count) * 100) / 100,
        totalCustomers: stats.totalCustomers,
        totalDamage: stats.totalDamage,
      }))
      .sort((a, b) => b.totalDamage - a.totalDamage)
      .slice(0, 10);

    return NextResponse.json({
      points: heatmapPoints,
      summary: {
        totalEvents: heatmapPoints.length,
        avgIntensity:
          heatmapPoints.length > 0
            ? Math.round(
                (heatmapPoints.reduce((sum, p) => sum + p.intensity, 0) /
                  heatmapPoints.length) *
                  100
              ) / 100
            : 0,
        topRegions,
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[Heatmap API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
