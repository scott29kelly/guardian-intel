/**
 * Competitor Analytics API
 *
 * GET /api/competitors/analytics - Aggregated competitor intelligence dashboard data
 *
 * Returns overview metrics, competitor rankings, activity trends, territory
 * breakdown, pricing analysis, and win/loss analysis.
 *
 * Query params: startDate, endDate, state, competitorId
 *
 * Security: Rate limited, Auth required
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cacheGet, cacheSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";
import type { Prisma } from "@prisma/client";
import type {
  CompetitorAnalytics,
  CompetitorActivityData,
  OverviewMetrics,
  CompetitorRanking,
  ActivityTrend,
  TerritoryBreakdown,
  PricingAnalysis,
  WinLossAnalysis,
} from "@/lib/services/competitors/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/competitors/analytics
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const state = searchParams.get("state") || undefined;
    const competitorId = searchParams.get("competitorId") || undefined;

    // Check cache
    const cacheKey = buildCacheKey(
      "competitors",
      "analytics",
      JSON.stringify({ startDate, endDate, state, competitorId })
    );
    const cached = await cacheGet<{ success: boolean; data: CompetitorAnalytics }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // Build where clause for activities
    const where: Prisma.CompetitorActivityWhereInput = {};

    if (competitorId) {
      where.competitorId = competitorId;
    }

    if (state) {
      where.state = { equals: state, mode: "insensitive" };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    // Fetch all data in parallel
    const [
      allActivities,
      competitors,
      totalCompetitors,
      thirtyDaysAgo,
    ] = await Promise.all([
      prisma.competitorActivity.findMany({
        where,
        include: {
          competitor: {
            select: {
              id: true,
              name: true,
              displayName: true,
              pricingTier: true,
            },
          },
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.competitor.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          displayName: true,
          pricingTier: true,
        },
      }),
      prisma.competitor.count(),
      Promise.resolve(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    ]);

    // --- Overview Metrics ---
    const activitiesThisMonth = allActivities.filter(
      (a) => a.createdAt >= thirtyDaysAgo
    );
    const activeCompetitorIds = new Set(
      activitiesThisMonth.map((a) => a.competitorId)
    );

    const wonDeals = allActivities.filter((a) => a.activityType === "won_deal");
    const lostDeals = allActivities.filter((a) => a.activityType === "lost_deal");
    const totalDeals = wonDeals.length + lostDeals.length;
    const winRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;

    const quotedPrices = allActivities
      .filter((a) => a.quotedPrice !== null)
      .map((a) => a.quotedPrice!);
    const avgCompetitorPrice =
      quotedPrices.length > 0
        ? Math.round(quotedPrices.reduce((a, b) => a + b, 0) / quotedPrices.length)
        : null;

    // Most active competitor (by activity count)
    const activityByCompetitor = new Map<string, number>();
    for (const a of allActivities) {
      activityByCompetitor.set(
        a.competitorId,
        (activityByCompetitor.get(a.competitorId) || 0) + 1
      );
    }
    let mostActiveId: string | null = null;
    let mostActiveCount = 0;
    for (const [id, count] of activityByCompetitor) {
      if (count > mostActiveCount) {
        mostActiveId = id;
        mostActiveCount = count;
      }
    }
    const mostActiveCompetitor = mostActiveId
      ? competitors.find((c) => c.id === mostActiveId)?.name || null
      : null;

    // Biggest threat (most lost deals)
    const lostByCompetitor = new Map<string, number>();
    for (const a of lostDeals) {
      lostByCompetitor.set(
        a.competitorId,
        (lostByCompetitor.get(a.competitorId) || 0) + 1
      );
    }
    let biggestThreatId: string | null = null;
    let biggestThreatCount = 0;
    for (const [id, count] of lostByCompetitor) {
      if (count > biggestThreatCount) {
        biggestThreatId = id;
        biggestThreatCount = count;
      }
    }
    const biggestThreat = biggestThreatId
      ? competitors.find((c) => c.id === biggestThreatId)?.name || null
      : null;

    const overview: OverviewMetrics = {
      totalCompetitors,
      activeCompetitors: activeCompetitorIds.size,
      totalActivities: allActivities.length,
      activitiesThisMonth: activitiesThisMonth.length,
      winRate,
      avgCompetitorPrice,
      mostActiveCompetitor,
      biggestThreat,
    };

    // --- Competitor Rankings ---
    const competitorRankings: CompetitorRanking[] = competitors.map((comp) => {
      const compActivities = allActivities.filter(
        (a) => a.competitorId === comp.id
      );
      const sightings = compActivities.filter(
        (a) => a.activityType === "sighting"
      ).length;
      const quotes = compActivities.filter(
        (a) => a.activityType === "quote" || a.activityType === "price_intel"
      ).length;
      const compWon = compActivities.filter(
        (a) => a.activityType === "won_deal"
      ).length;
      const compLost = compActivities.filter(
        (a) => a.activityType === "lost_deal"
      ).length;
      const compTotalDeals = compWon + compLost;
      const compWinRate =
        compTotalDeals > 0 ? Math.round((compWon / compTotalDeals) * 100) : 0;

      const compQuotedPrices = compActivities
        .filter((a) => a.quotedPrice !== null)
        .map((a) => a.quotedPrice!);
      const compAvgPrice =
        compQuotedPrices.length > 0
          ? Math.round(
              compQuotedPrices.reduce((a, b) => a + b, 0) /
                compQuotedPrices.length
            )
          : null;

      const lastActivity = compActivities.length > 0 ? compActivities[0].createdAt : null;

      // Threat level based on activity volume and lost deals
      let threatLevel: "low" | "medium" | "high" = "low";
      if (compLost >= 3 || compActivities.length >= 10) {
        threatLevel = "high";
      } else if (compLost >= 1 || compActivities.length >= 5) {
        threatLevel = "medium";
      }

      return {
        id: comp.id,
        name: comp.name,
        displayName: comp.displayName,
        pricingTier: (comp.pricingTier || "mid") as CompetitorRanking["pricingTier"],
        activityCount: compActivities.length,
        sightings,
        quotes,
        wonAgainst: compWon,
        lostTo: compLost,
        winRate: compWinRate,
        avgQuotedPrice: compAvgPrice,
        lastSeen: lastActivity,
        threatLevel,
      };
    });

    // Sort by activity count desc
    competitorRankings.sort((a, b) => b.activityCount - a.activityCount);

    // --- Activity Trends (daily aggregation) ---
    const trendMap = new Map<
      string,
      { total: number; sightings: number; quotes: number; wonDeals: number; lostDeals: number }
    >();
    for (const a of allActivities) {
      const dateKey = a.createdAt.toISOString().split("T")[0];
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          total: 0,
          sightings: 0,
          quotes: 0,
          wonDeals: 0,
          lostDeals: 0,
        });
      }
      const entry = trendMap.get(dateKey)!;
      entry.total++;
      if (a.activityType === "sighting") entry.sightings++;
      if (a.activityType === "quote" || a.activityType === "price_intel")
        entry.quotes++;
      if (a.activityType === "won_deal") entry.wonDeals++;
      if (a.activityType === "lost_deal") entry.lostDeals++;
    }

    const activityTrends: ActivityTrend[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Territory Breakdown ---
    const territoryMap = new Map<
      string,
      {
        totalActivities: number;
        competitorCounts: Map<string, number>;
        won: number;
        lost: number;
      }
    >();
    for (const a of allActivities) {
      const actState = a.state || "Unknown";
      if (!territoryMap.has(actState)) {
        territoryMap.set(actState, {
          totalActivities: 0,
          competitorCounts: new Map(),
          won: 0,
          lost: 0,
        });
      }
      const entry = territoryMap.get(actState)!;
      entry.totalActivities++;
      entry.competitorCounts.set(
        a.competitorId,
        (entry.competitorCounts.get(a.competitorId) || 0) + 1
      );
      if (a.activityType === "won_deal") entry.won++;
      if (a.activityType === "lost_deal") entry.lost++;
    }

    const territoryBreakdown: TerritoryBreakdown[] = Array.from(
      territoryMap.entries()
    ).map(([st, data]) => {
      let topCompetitorId: string | null = null;
      let topCount = 0;
      for (const [id, count] of data.competitorCounts) {
        if (count > topCount) {
          topCompetitorId = id;
          topCount = count;
        }
      }
      const totalTerritoryDeals = data.won + data.lost;
      return {
        state: st,
        totalActivities: data.totalActivities,
        topCompetitor: topCompetitorId
          ? competitors.find((c) => c.id === topCompetitorId)?.name || null
          : null,
        topCompetitorActivities: topCount,
        winRate:
          totalTerritoryDeals > 0
            ? Math.round((data.won / totalTerritoryDeals) * 100)
            : 0,
        lostDeals: data.lost,
      };
    });

    // --- Pricing Analysis ---
    const quotesWithPrice = allActivities.filter(
      (a) => a.quotedPrice !== null
    );

    const tierPricing = new Map<string, { total: number; count: number }>();
    const competitorPricing = new Map<
      string,
      {
        name: string;
        total: number;
        count: number;
        comparisons: Map<string, number>;
      }
    >();

    for (const a of quotesWithPrice) {
      const tier = a.competitor.pricingTier || "mid";
      if (!tierPricing.has(tier)) {
        tierPricing.set(tier, { total: 0, count: 0 });
      }
      const te = tierPricing.get(tier)!;
      te.total += a.quotedPrice!;
      te.count++;

      if (!competitorPricing.has(a.competitorId)) {
        competitorPricing.set(a.competitorId, {
          name: a.competitor.name,
          total: 0,
          count: 0,
          comparisons: new Map(),
        });
      }
      const ce = competitorPricing.get(a.competitorId)!;
      ce.total += a.quotedPrice!;
      ce.count++;
      if (a.priceComparison) {
        ce.comparisons.set(
          a.priceComparison,
          (ce.comparisons.get(a.priceComparison) || 0) + 1
        );
      }
    }

    const pricingAnalysis: PricingAnalysis = {
      avgCompetitorPrice,
      avgOurPrice: null, // We don't store our own prices in competitor activities
      priceGap: null,
      priceGapPercent: null,
      byTier: Array.from(tierPricing.entries()).map(([tier, data]) => ({
        tier: tier as PricingAnalysis["byTier"][number]["tier"],
        avgPrice: data.count > 0 ? Math.round(data.total / data.count) : null,
        quoteCount: data.count,
      })),
      byCompetitor: Array.from(competitorPricing.entries()).map(
        ([compId, data]) => {
          // Find the most common price comparison
          let mostCommonComparison: string | null = null;
          let maxCompCount = 0;
          for (const [comp, count] of data.comparisons) {
            if (count > maxCompCount) {
              mostCommonComparison = comp;
              maxCompCount = count;
            }
          }
          return {
            competitorId: compId,
            competitorName: data.name,
            avgPrice:
              data.count > 0 ? Math.round(data.total / data.count) : null,
            quoteCount: data.count,
            priceComparison: mostCommonComparison as PricingAnalysis["byCompetitor"][number]["priceComparison"],
          };
        }
      ),
    };

    // --- Win/Loss Analysis ---
    const wonValue = wonDeals.reduce((sum, a) => sum + (a.dealValue || 0), 0);
    const lostValue = lostDeals.reduce((sum, a) => sum + (a.dealValue || 0), 0);

    const wlByCompetitor = new Map<
      string,
      {
        name: string;
        won: number;
        lost: number;
        wonValue: number;
        lostValue: number;
      }
    >();
    for (const a of [...wonDeals, ...lostDeals]) {
      if (!wlByCompetitor.has(a.competitorId)) {
        wlByCompetitor.set(a.competitorId, {
          name: a.competitor.name,
          won: 0,
          lost: 0,
          wonValue: 0,
          lostValue: 0,
        });
      }
      const entry = wlByCompetitor.get(a.competitorId)!;
      if (a.activityType === "won_deal") {
        entry.won++;
        entry.wonValue += a.dealValue || 0;
      } else {
        entry.lost++;
        entry.lostValue += a.dealValue || 0;
      }
    }

    // Loss reasons
    const lossReasonCounts = new Map<string, number>();
    for (const a of lostDeals) {
      const reason = a.outcomeReason || "Unknown";
      lossReasonCounts.set(reason, (lossReasonCounts.get(reason) || 0) + 1);
    }
    const topLossReasons = Array.from(lossReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Win reasons
    const winReasonCounts = new Map<string, number>();
    for (const a of wonDeals) {
      const reason = a.outcomeReason || "Unknown";
      winReasonCounts.set(reason, (winReasonCounts.get(reason) || 0) + 1);
    }
    const topWinReasons = Array.from(winReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const winLossAnalysis: WinLossAnalysis = {
      totalDeals,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      winRate,
      wonValue,
      lostValue,
      byCompetitor: Array.from(wlByCompetitor.entries()).map(
        ([compId, data]) => {
          const compTotal = data.won + data.lost;
          return {
            competitorId: compId,
            competitorName: data.name,
            wonAgainst: data.won,
            lostTo: data.lost,
            winRate:
              compTotal > 0 ? Math.round((data.won / compTotal) * 100) : 0,
            wonValue: data.wonValue,
            lostValue: data.lostValue,
          };
        }
      ),
      topLossReasons,
      topWinReasons,
    };

    // --- Recent Activity (last 10) ---
    const recentActivity = allActivities.slice(0, 10).map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      competitorId: a.competitorId,
      competitorName: a.competitor.displayName || a.competitor.name,
      customerId: a.customerId,
      customerName: a.customer
        ? `${a.customer.firstName} ${a.customer.lastName}`
        : null,
      reportedById: a.reportedById,
      reportedByName: "",
      activityType: a.activityType as CompetitorActivityData["activityType"],
      address: a.address,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
      description: a.description,
      quotedPrice: a.quotedPrice,
      priceComparison: a.priceComparison as CompetitorActivityData["priceComparison"],
      outcome: a.outcome,
      outcomeReason: a.outcomeReason,
      dealValue: a.dealValue,
      hasPhoto: a.hasPhoto,
      photoUrl: a.photoUrl,
      isVerified: a.isVerified,
    }));

    const analytics: CompetitorAnalytics = {
      overview,
      competitorRankings,
      activityTrends,
      territoryBreakdown,
      pricingAnalysis,
      winLossAnalysis,
      recentActivity,
    };

    const responseData = { success: true, data: analytics };
    await cacheSet(cacheKey, responseData, CACHE_TTL.competitors);

    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitor analytics" },
      { status: 500 }
    );
  }
}
