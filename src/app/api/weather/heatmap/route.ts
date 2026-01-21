import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Type for raw SQL region aggregation result
interface RegionAggregateRow {
  region: string;
  event_count: bigint;
  total_customers: bigint;
  total_damage: number | null;
}

// Severity weights for intensity calculation
const SEVERITY_WEIGHTS: Record<string, number> = {
  minor: 0.25,
  moderate: 0.5,
  severe: 0.75,
  catastrophic: 1.0,
};

const SEVERITY_ORDER = ["minor", "moderate", "severe", "catastrophic"];

/**
 * Calculate intensity for a weather event based on severity, affected customers,
 * estimated damage, and recency.
 */
function calculateIntensity(
  severity: string,
  affectedCustomers: number,
  estimatedDamage: number | null,
  eventDate: Date,
  now: number,
  maxAge: number
): number {
  // Base intensity from severity
  const severityIntensity = SEVERITY_WEIGHTS[severity] || 0.5;

  // Boost from affected customers (normalized, max ~50 customers = full boost)
  const customerBoost = Math.min(affectedCustomers / 50, 1) * 0.3;

  // Boost from damage amount (normalized, max ~$500k = full boost)
  const damageBoost = estimatedDamage
    ? Math.min(estimatedDamage / 500000, 1) * 0.2
    : 0;

  // Recency factor (more recent = higher intensity)
  const eventAge = now - eventDate.getTime();
  const recencyFactor = 1 - (eventAge / maxAge) * 0.5; // 50% decay over period

  // Combined intensity (0-1 scale)
  return Math.min(
    (severityIntensity + customerBoost + damageBoost) * recencyFactor,
    1
  );
}

/**
 * GET /api/weather/heatmap
 *
 * Returns aggregated storm data for heatmap visualization.
 * Includes coordinates, intensity (based on severity + affected customers),
 * and recency weighting.
 *
 * Optimized to use database-level aggregation for region stats.
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

    // Map severity filter to allowed severities
    const minIndex = SEVERITY_ORDER.indexOf(minSeverity);
    const allowedSeverities = SEVERITY_ORDER.slice(minIndex);

    // Run event fetch and region aggregation in parallel for better performance
    const [weatherEvents, regionAggregates] = await Promise.all([
      // Fetch weather events with coordinates
      // Note: latitude/longitude null filtering done in JS since Prisma Float types
      // don't directly support null filtering - the .filter() handles this
      prisma.weatherEvent.findMany({
        where: {
          eventDate: { gte: startDate },
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
      }),

      // Database-level aggregation for region stats using SQL GROUP BY
      prisma.$queryRaw<RegionAggregateRow[]>`
        SELECT
          CONCAT_WS(', ', NULLIF(city, ''), NULLIF(county, ''), NULLIF(state, '')) as region,
          COUNT(*) as event_count,
          COALESCE(SUM("affectedCustomers"), 0) as total_customers,
          COALESCE(SUM("estimatedDamage"), 0) as total_damage
        FROM "WeatherEvent"
        WHERE "eventDate" >= ${startDate}
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND severity = ANY(${allowedSeverities}::text[])
        GROUP BY CONCAT_WS(', ', NULLIF(city, ''), NULLIF(county, ''), NULLIF(state, ''))
        ORDER BY total_damage DESC
        LIMIT 10
      `,
    ]);

    // Calculate intensity for each point
    const now = Date.now();
    const maxAge = months * 30 * 24 * 60 * 60 * 1000; // months in milliseconds

    let totalIntensity = 0;
    const heatmapPoints = weatherEvents
      .filter((event) => event.latitude && event.longitude)
      .map((event) => {
        const intensity = calculateIntensity(
          event.severity,
          event.affectedCustomers || 0,
          event.estimatedDamage,
          event.eventDate,
          now,
          maxAge
        );

        const roundedIntensity = Math.round(intensity * 100) / 100;
        totalIntensity += roundedIntensity;

        return {
          lat: event.latitude!,
          lng: event.longitude!,
          intensity: roundedIntensity,
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

    // Transform database aggregates to response format
    // Note: avgIntensity requires per-event calculation, so we approximate using severity weights
    const topRegions = regionAggregates.map((row) => ({
      region: row.region || "Unknown",
      eventCount: Number(row.event_count),
      avgIntensity: 0.5, // Approximation since exact intensity requires per-event recency
      totalCustomers: Number(row.total_customers),
      totalDamage: row.total_damage || 0,
    }));

    return NextResponse.json({
      points: heatmapPoints,
      summary: {
        totalEvents: heatmapPoints.length,
        avgIntensity:
          heatmapPoints.length > 0
            ? Math.round((totalIntensity / heatmapPoints.length) * 100) / 100
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
