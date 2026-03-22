/**
 * Storms API
 *
 * GET /api/storms - List weather events with filtering and aggregated stats
 *
 * Query params:
 * - severity: minor | moderate | severe | catastrophic
 * - type: hail | wind | tornado | thunderstorm | hurricane | flood
 * - days: number (default 90) - how far back to look
 * - county: string - filter by county name
 *
 * Returns:
 * - events: WeatherEvent[] with computed stats per event
 * - alerts: recent severe/catastrophic events (last 48 hours)
 * - stats: aggregated totals (opportunity, affected customers, pending inspections)
 * - filterOptions: dynamic filter counts based on data
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cacheGet, cacheSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

const OPPORTUNITY_PER_CUSTOMER = 15000;

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const eventType = searchParams.get("type");
    const days = parseInt(searchParams.get("days") || "90", 10);
    const county = searchParams.get("county");

    // Check cache before running queries
    const cacheKey = buildCacheKey("storms", JSON.stringify({ severity, eventType, days, county }));
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    // Build where clause for main events query
    const where: Record<string, unknown> = {
      eventDate: { gte: startDate },
    };

    if (severity) {
      where.severity = severity;
    }
    if (eventType) {
      where.eventType = eventType;
    }
    if (county) {
      where.county = { contains: county, mode: "insensitive" };
    }

    // Fetch events with customer relation for opportunity calculation
    const events = await prisma.weatherEvent.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            profitPotential: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 200,
    });

    // Active alerts: severe/catastrophic events from the last 48 hours
    const alertCutoff = new Date();
    alertCutoff.setHours(alertCutoff.getHours() - 48);

    const alertEvents = await prisma.weatherEvent.findMany({
      where: {
        eventDate: { gte: alertCutoff },
        severity: { in: ["severe", "catastrophic"] },
      },
      include: {
        customer: {
          select: {
            id: true,
            profitPotential: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    // Group alert events by county + eventType to create alert summaries
    const alertGroups = new Map<
      string,
      {
        eventType: string;
        severity: string;
        county: string;
        state: string;
        areas: string[];
        affectedCustomers: number;
        estimatedOpportunity: number;
        onset: Date;
        expires: Date;
        hailSize: number | null;
        windSpeed: number | null;
      }
    >();

    for (const evt of alertEvents) {
      const key = `${evt.county || "Unknown"}-${evt.eventType}`;
      const existing = alertGroups.get(key);
      const customerOpportunity =
        evt.customer?.profitPotential || OPPORTUNITY_PER_CUSTOMER;

      if (existing) {
        existing.affectedCustomers += evt.affectedCustomers;
        existing.estimatedOpportunity +=
          evt.affectedCustomers * customerOpportunity;
        if (evt.hailSize && (!existing.hailSize || evt.hailSize > existing.hailSize)) {
          existing.hailSize = evt.hailSize;
        }
        if (evt.windSpeed && (!existing.windSpeed || evt.windSpeed > existing.windSpeed)) {
          existing.windSpeed = evt.windSpeed;
        }
        if (evt.eventDate < existing.onset) existing.onset = evt.eventDate;
        if (evt.eventDate > existing.expires) existing.expires = evt.eventDate;
      } else {
        const areaLabel = [evt.county, evt.state].filter(Boolean).join(" County, ");
        alertGroups.set(key, {
          eventType: evt.eventType,
          severity: evt.severity,
          county: evt.county || "Unknown",
          state: evt.state || "",
          areas: [areaLabel || "Unknown Area"],
          affectedCustomers: evt.affectedCustomers,
          estimatedOpportunity: evt.affectedCustomers * customerOpportunity,
          onset: evt.eventDate,
          expires: new Date(evt.eventDate.getTime() + 4 * 60 * 60 * 1000), // +4 hours
          hailSize: evt.hailSize,
          windSpeed: evt.windSpeed,
        });
      }
    }

    const alerts = Array.from(alertGroups.entries()).map(([key, group]) => {
      const hailDesc = group.hailSize
        ? `Large hail up to ${group.hailSize} inches expected. `
        : "";
      const windDesc = group.windSpeed
        ? `Damaging winds up to ${group.windSpeed} mph possible.`
        : "";
      const headline =
        group.eventType === "hail"
          ? "Severe Thunderstorm Warning"
          : group.eventType === "wind"
            ? "Wind Advisory"
            : group.eventType === "tornado"
              ? "Tornado Warning"
              : "Severe Weather Alert";

      return {
        id: `alert-${key}`,
        type: group.eventType,
        severity: group.severity,
        headline,
        description: `${hailDesc}${windDesc}`.trim() || "Severe weather conditions reported.",
        areas: group.areas,
        onset: group.onset.toISOString(),
        expires: group.expires.toISOString(),
        affectedCustomers: group.affectedCustomers,
        estimatedOpportunity: group.estimatedOpportunity,
      };
    });

    // Group events by location cluster for storm event cards
    // Each unique city+county+eventType+date combo becomes an event card
    const eventGroups = new Map<
      string,
      {
        id: string;
        type: string;
        date: Date;
        location: string;
        county: string;
        state: string;
        latitude: number;
        longitude: number;
        hailSize: number | null;
        windSpeed: number | null;
        severity: string;
        affectedCustomers: number;
        inspectionsPending: number;
        claimsFiled: number;
        opportunity: number;
      }
    >();

    for (const evt of events) {
      const dateKey = evt.eventDate.toISOString().split("T")[0];
      const locationLabel = [evt.city, evt.state].filter(Boolean).join(", ") || "Unknown";
      const key = `${locationLabel}-${evt.eventType}-${dateKey}`;
      const customerOpportunity =
        evt.customer?.profitPotential || OPPORTUNITY_PER_CUSTOMER;

      const existing = eventGroups.get(key);
      if (existing) {
        existing.affectedCustomers += evt.affectedCustomers;
        existing.inspectionsPending += !evt.inspectionDone && evt.damageReported ? 1 : 0;
        existing.claimsFiled += evt.claimFiled ? 1 : 0;
        existing.opportunity += evt.affectedCustomers * customerOpportunity;
        if (evt.hailSize && (!existing.hailSize || evt.hailSize > existing.hailSize)) {
          existing.hailSize = evt.hailSize;
        }
        if (evt.windSpeed && (!existing.windSpeed || evt.windSpeed > existing.windSpeed)) {
          existing.windSpeed = evt.windSpeed;
        }
        // Use higher severity
        const severityRank: Record<string, number> = { minor: 0, moderate: 1, severe: 2, catastrophic: 3 };
        if ((severityRank[evt.severity] || 0) > (severityRank[existing.severity] || 0)) {
          existing.severity = evt.severity;
        }
      } else {
        eventGroups.set(key, {
          id: evt.id,
          type: evt.eventType,
          date: evt.eventDate,
          location: locationLabel,
          county: evt.county || "Unknown",
          state: evt.state || "",
          latitude: evt.latitude,
          longitude: evt.longitude,
          hailSize: evt.hailSize,
          windSpeed: evt.windSpeed,
          severity: evt.severity,
          affectedCustomers: evt.affectedCustomers,
          inspectionsPending: !evt.inspectionDone && evt.damageReported ? 1 : 0,
          claimsFiled: evt.claimFiled ? 1 : 0,
          opportunity: evt.affectedCustomers * customerOpportunity,
        });
      }
    }

    const stormEvents = Array.from(eventGroups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aggregated stats
    const totalOpportunity = stormEvents.reduce((sum, e) => sum + e.opportunity, 0);
    const totalAffected = stormEvents.reduce((sum, e) => sum + e.affectedCustomers, 0);
    const totalPending = stormEvents.reduce((sum, e) => sum + e.inspectionsPending, 0);

    // Build dynamic filter options from the data
    const typeCounts = new Map<string, number>();
    const severityCounts = new Map<string, number>();
    const countyCounts = new Map<string, number>();

    for (const evt of stormEvents) {
      typeCounts.set(evt.type, (typeCounts.get(evt.type) || 0) + 1);
      severityCounts.set(evt.severity, (severityCounts.get(evt.severity) || 0) + 1);
      const countyKey = evt.county.toLowerCase();
      countyCounts.set(countyKey, (countyCounts.get(countyKey) || 0) + 1);
    }

    const filterOptions = {
      types: Array.from(typeCounts.entries()).map(([value, count]) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
        count,
      })),
      severities: Array.from(severityCounts.entries()).map(([value, count]) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
        count,
      })),
      counties: Array.from(countyCounts.entries()).map(([value, count]) => {
        // Find an event with this county to get the state
        const sample = stormEvents.find((e) => e.county.toLowerCase() === value);
        const label = sample
          ? `${sample.county} County, ${sample.state}`
          : value;
        return { value, label, count };
      }),
    };

    const responseData = {
      success: true,
      data: {
        events: stormEvents.map((e) => ({
          ...e,
          date: e.date.toISOString(),
        })),
        alerts,
        stats: {
          totalOpportunity,
          totalAffected,
          totalPending,
          alertCount: alerts.length,
        },
        filterOptions,
      },
    };

    await cacheSet(cacheKey, responseData, CACHE_TTL.storms);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Storms API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch storm data" },
      { status: 500 }
    );
  }
}
