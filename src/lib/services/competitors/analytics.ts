/**
 * Competitor Analytics Service
 *
 * Generates insights and analytics from competitor activity data.
 */

import { prisma } from "@/lib/prisma";
import type {
  CompetitorAnalytics,
  OverviewMetrics,
  CompetitorRanking,
  ActivityTrend,
  TerritoryBreakdown,
  PricingAnalysis,
  WinLossAnalysis,
  AnalyticsQueryParams,
  CompetitorActivityData,
} from "./types";

// =============================================================================
// HELPERS
// =============================================================================

function getDateRange(params: AnalyticsQueryParams): { start: Date; end: Date } {
  const end = params.endDate ? new Date(params.endDate) : new Date();
  const start = params.startDate
    ? new Date(params.startDate)
    : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); // default 90 days
  return { start, end };
}

function buildStateFilter(state?: string) {
  return state ? { state: { equals: state, mode: "insensitive" as const } } : {};
}

function buildCompetitorFilter(competitorId?: string) {
  return competitorId ? { competitorId } : {};
}

// =============================================================================
// MAIN ANALYTICS FUNCTION
// =============================================================================

export async function getCompetitorAnalytics(
  params: AnalyticsQueryParams = {}
): Promise<CompetitorAnalytics> {
  const { start, end } = getDateRange(params);
  const stateFilter = buildStateFilter(params.state);
  const competitorFilter = buildCompetitorFilter(params.competitorId);

  const [
    overview,
    competitorRankings,
    activityTrends,
    territoryBreakdown,
    pricingAnalysis,
    winLossAnalysis,
    recentActivity,
  ] = await Promise.all([
    calculateOverviewMetrics(start, end, stateFilter),
    calculateCompetitorRankings(start, end, stateFilter),
    calculateActivityTrends(start, end, stateFilter, competitorFilter),
    calculateTerritoryBreakdown(start, end),
    calculatePricingAnalysis(start, end, stateFilter),
    calculateWinLossAnalysis(start, end, stateFilter),
    getRecentActivity(10, stateFilter, competitorFilter),
  ]);

  return {
    overview,
    competitorRankings,
    activityTrends,
    territoryBreakdown,
    pricingAnalysis,
    winLossAnalysis,
    recentActivity,
  };
}

// =============================================================================
// OVERVIEW METRICS
// =============================================================================

async function calculateOverviewMetrics(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<OverviewMetrics> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalCompetitors,
    totalActivities,
    activitiesThisMonth,
    wonDeals,
    lostDeals,
    avgPrice,
  ] = await Promise.all([
    prisma.competitor.count({ where: { isActive: true } }),
    prisma.competitorActivity.count({
      where: { createdAt: { gte: start, lte: end }, ...stateFilter },
    }),
    prisma.competitorActivity.count({
      where: { createdAt: { gte: thirtyDaysAgo }, ...stateFilter },
    }),
    prisma.competitorActivity.count({
      where: {
        createdAt: { gte: start, lte: end },
        activityType: "won_deal",
        ...stateFilter,
      },
    }),
    prisma.competitorActivity.count({
      where: {
        createdAt: { gte: start, lte: end },
        activityType: "lost_deal",
        ...stateFilter,
      },
    }),
    prisma.competitorActivity.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        quotedPrice: { not: null },
        ...stateFilter,
      },
      _avg: { quotedPrice: true },
    }),
  ]);

  // Find most active competitor
  const mostActive = await prisma.competitorActivity.groupBy({
    by: ["competitorId"],
    where: { createdAt: { gte: thirtyDaysAgo }, ...stateFilter },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let mostActiveCompetitor: string | null = null;
  if (mostActive.length > 0) {
    const comp = await prisma.competitor.findUnique({
      where: { id: mostActive[0].competitorId },
      select: { name: true },
    });
    mostActiveCompetitor = comp?.name || null;
  }

  // Find biggest threat (most lost deals)
  const biggestThreatData = await prisma.competitorActivity.groupBy({
    by: ["competitorId"],
    where: {
      createdAt: { gte: start, lte: end },
      activityType: "lost_deal",
      ...stateFilter,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let biggestThreat: string | null = null;
  if (biggestThreatData.length > 0) {
    const comp = await prisma.competitor.findUnique({
      where: { id: biggestThreatData[0].competitorId },
      select: { name: true },
    });
    biggestThreat = comp?.name || null;
  }

  // Active competitors = seen in last 30 days
  const activeCompetitorIds = await prisma.competitorActivity.groupBy({
    by: ["competitorId"],
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const totalDeals = wonDeals + lostDeals;
  const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

  return {
    totalCompetitors,
    activeCompetitors: activeCompetitorIds.length,
    totalActivities,
    activitiesThisMonth,
    winRate,
    avgCompetitorPrice: avgPrice._avg.quotedPrice || null,
    mostActiveCompetitor,
    biggestThreat,
  };
}

// =============================================================================
// COMPETITOR RANKINGS
// =============================================================================

export async function calculateCompetitorRankings(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<CompetitorRanking[]> {
  const competitors = await prisma.competitor.findMany({
    where: { isActive: true },
    include: {
      activities: {
        where: { createdAt: { gte: start, lte: end }, ...stateFilter },
      },
    },
  });

  return competitors
    .map((comp) => {
      const activities = comp.activities;
      const sightings = activities.filter((a) => a.activityType === "sighting").length;
      const quotes = activities.filter((a) => a.activityType === "quote" || a.activityType === "price_intel").length;
      const wonAgainst = activities.filter((a) => a.activityType === "won_deal").length;
      const lostTo = activities.filter((a) => a.activityType === "lost_deal").length;
      const totalDeals = wonAgainst + lostTo;
      const winRate = totalDeals > 0 ? Math.round((wonAgainst / totalDeals) * 100) : 0;

      const priceActivities = activities.filter((a) => a.quotedPrice !== null);
      const avgQuotedPrice =
        priceActivities.length > 0
          ? priceActivities.reduce((sum, a) => sum + (a.quotedPrice || 0), 0) / priceActivities.length
          : null;

      const lastActivity = activities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      const threatLevel: "low" | "medium" | "high" =
        lostTo >= 5 ? "high" : lostTo >= 2 ? "medium" : "low";

      return {
        id: comp.id,
        name: comp.name,
        displayName: comp.displayName,
        pricingTier: (comp.pricingTier || "mid") as CompetitorRanking["pricingTier"],
        activityCount: activities.length,
        sightings,
        quotes,
        wonAgainst,
        lostTo,
        winRate,
        avgQuotedPrice,
        lastSeen: lastActivity ? lastActivity.createdAt : null,
        threatLevel,
      };
    })
    .sort((a, b) => b.activityCount - a.activityCount);
}

// =============================================================================
// ACTIVITY TRENDS
// =============================================================================

export async function calculateActivityTrends(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>,
  competitorFilter: Record<string, unknown>
): Promise<ActivityTrend[]> {
  const activities = await prisma.competitorActivity.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...stateFilter,
      ...competitorFilter,
    },
    select: { createdAt: true, activityType: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const byDate = new Map<string, ActivityTrend>();

  for (const a of activities) {
    const dateKey = a.createdAt.toISOString().split("T")[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        date: dateKey,
        total: 0,
        sightings: 0,
        quotes: 0,
        wonDeals: 0,
        lostDeals: 0,
      });
    }
    const entry = byDate.get(dateKey)!;
    entry.total++;
    if (a.activityType === "sighting" || a.activityType === "canvassing") entry.sightings++;
    if (a.activityType === "quote" || a.activityType === "price_intel") entry.quotes++;
    if (a.activityType === "won_deal") entry.wonDeals++;
    if (a.activityType === "lost_deal") entry.lostDeals++;
  }

  return Array.from(byDate.values());
}

// =============================================================================
// TERRITORY BREAKDOWN
// =============================================================================

export async function calculateTerritoryBreakdown(
  start: Date,
  end: Date
): Promise<TerritoryBreakdown[]> {
  const activities = await prisma.competitorActivity.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      state: { not: null },
    },
    select: { state: true, competitorId: true, activityType: true },
  });

  const byState = new Map<string, { activities: typeof activities }>();

  for (const a of activities) {
    const state = a.state || "Unknown";
    if (!byState.has(state)) byState.set(state, { activities: [] });
    byState.get(state)!.activities.push(a);
  }

  const result: TerritoryBreakdown[] = [];

  for (const [state, data] of byState) {
    const total = data.activities.length;
    const won = data.activities.filter((a) => a.activityType === "won_deal").length;
    const lost = data.activities.filter((a) => a.activityType === "lost_deal").length;
    const totalDeals = won + lost;

    // Find top competitor by activity count
    const compCounts = new Map<string, number>();
    for (const a of data.activities) {
      compCounts.set(a.competitorId, (compCounts.get(a.competitorId) || 0) + 1);
    }
    let topCompetitorId: string | null = null;
    let topCount = 0;
    for (const [id, count] of compCounts) {
      if (count > topCount) {
        topCompetitorId = id;
        topCount = count;
      }
    }

    let topCompetitor: string | null = null;
    if (topCompetitorId) {
      const comp = await prisma.competitor.findUnique({
        where: { id: topCompetitorId },
        select: { name: true },
      });
      topCompetitor = comp?.name || null;
    }

    result.push({
      state,
      totalActivities: total,
      topCompetitor,
      topCompetitorActivities: topCount,
      winRate: totalDeals > 0 ? Math.round((won / totalDeals) * 100) : 0,
      lostDeals: lost,
    });
  }

  return result.sort((a, b) => b.totalActivities - a.totalActivities);
}

// =============================================================================
// PRICING ANALYSIS
// =============================================================================

async function calculatePricingAnalysis(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<PricingAnalysis> {
  const priceActivities = await prisma.competitorActivity.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      quotedPrice: { not: null },
      ...stateFilter,
    },
    include: {
      competitor: { select: { id: true, name: true, pricingTier: true } },
    },
  });

  const avgCompetitorPrice =
    priceActivities.length > 0
      ? priceActivities.reduce((sum, a) => sum + (a.quotedPrice || 0), 0) / priceActivities.length
      : null;

  // Group by pricing tier
  const tierMap = new Map<string, { total: number; count: number }>();
  for (const a of priceActivities) {
    const tier = a.competitor.pricingTier || "mid";
    if (!tierMap.has(tier)) tierMap.set(tier, { total: 0, count: 0 });
    const entry = tierMap.get(tier)!;
    entry.total += a.quotedPrice || 0;
    entry.count++;
  }

  const byTier = (["budget", "mid", "premium", "luxury"] as const).map((tier) => {
    const data = tierMap.get(tier);
    return {
      tier,
      avgPrice: data && data.count > 0 ? Math.round(data.total / data.count) : null,
      quoteCount: data?.count || 0,
    };
  });

  // Group by competitor
  const compMap = new Map<string, { name: string; total: number; count: number; comparisons: string[] }>();
  for (const a of priceActivities) {
    const id = a.competitor.id;
    if (!compMap.has(id))
      compMap.set(id, { name: a.competitor.name, total: 0, count: 0, comparisons: [] });
    const entry = compMap.get(id)!;
    entry.total += a.quotedPrice || 0;
    entry.count++;
    if (a.priceComparison) entry.comparisons.push(a.priceComparison);
  }

  const byCompetitor = Array.from(compMap.entries()).map(([id, data]) => {
    // Most common price comparison
    const compCounts = new Map<string, number>();
    for (const c of data.comparisons) {
      compCounts.set(c, (compCounts.get(c) || 0) + 1);
    }
    let mostCommon: string | null = null;
    let maxCount = 0;
    for (const [comp, count] of compCounts) {
      if (count > maxCount) {
        mostCommon = comp;
        maxCount = count;
      }
    }

    return {
      competitorId: id,
      competitorName: data.name,
      avgPrice: data.count > 0 ? Math.round(data.total / data.count) : null,
      quoteCount: data.count,
      priceComparison: mostCommon as "lower" | "similar" | "higher" | null,
    };
  });

  return {
    avgCompetitorPrice: avgCompetitorPrice ? Math.round(avgCompetitorPrice) : null,
    avgOurPrice: null, // Would need our own deal data
    priceGap: null,
    priceGapPercent: null,
    byTier,
    byCompetitor,
  };
}

// =============================================================================
// WIN/LOSS ANALYSIS
// =============================================================================

async function calculateWinLossAnalysis(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<WinLossAnalysis> {
  const dealActivities = await prisma.competitorActivity.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      activityType: { in: ["won_deal", "lost_deal"] },
      ...stateFilter,
    },
    include: {
      competitor: { select: { id: true, name: true } },
    },
  });

  const wonDeals = dealActivities.filter((a) => a.activityType === "won_deal");
  const lostDeals = dealActivities.filter((a) => a.activityType === "lost_deal");
  const totalDeals = dealActivities.length;

  const wonValue = wonDeals.reduce((sum, a) => sum + (a.dealValue || 0), 0);
  const lostValue = lostDeals.reduce((sum, a) => sum + (a.dealValue || 0), 0);

  // By competitor
  const compMap = new Map<
    string,
    { name: string; won: number; lost: number; wonValue: number; lostValue: number }
  >();
  for (const a of dealActivities) {
    const id = a.competitor.id;
    if (!compMap.has(id))
      compMap.set(id, { name: a.competitor.name, won: 0, lost: 0, wonValue: 0, lostValue: 0 });
    const entry = compMap.get(id)!;
    if (a.activityType === "won_deal") {
      entry.won++;
      entry.wonValue += a.dealValue || 0;
    } else {
      entry.lost++;
      entry.lostValue += a.dealValue || 0;
    }
  }

  const byCompetitor = Array.from(compMap.entries()).map(([id, data]) => ({
    competitorId: id,
    competitorName: data.name,
    wonAgainst: data.won,
    lostTo: data.lost,
    winRate:
      data.won + data.lost > 0
        ? Math.round((data.won / (data.won + data.lost)) * 100)
        : 0,
    wonValue: data.wonValue,
    lostValue: data.lostValue,
  }));

  // Loss/win reasons
  const lossReasons = new Map<string, number>();
  const winReasons = new Map<string, number>();
  for (const a of dealActivities) {
    if (a.outcomeReason) {
      const map = a.activityType === "lost_deal" ? lossReasons : winReasons;
      map.set(a.outcomeReason, (map.get(a.outcomeReason) || 0) + 1);
    }
  }

  const topLossReasons = Array.from(lossReasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topWinReasons = Array.from(winReasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDeals,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    winRate:
      totalDeals > 0
        ? Math.round((wonDeals.length / totalDeals) * 100)
        : 0,
    wonValue,
    lostValue,
    byCompetitor,
    topLossReasons,
    topWinReasons,
  };
}

// =============================================================================
// RECENT ACTIVITY
// =============================================================================

export async function getRecentActivity(
  limit: number,
  stateFilter: Record<string, unknown>,
  competitorFilter: Record<string, unknown>
): Promise<CompetitorActivityData[]> {
  const activities = await prisma.competitorActivity.findMany({
    where: { ...stateFilter, ...competitorFilter },
    include: {
      competitor: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
      reportedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return activities.map((a) => ({
    id: a.id,
    createdAt: a.createdAt,
    competitorId: a.competitorId,
    competitorName: a.competitor.name,
    customerId: a.customerId,
    customerName: a.customer
      ? `${a.customer.firstName} ${a.customer.lastName}`
      : null,
    reportedById: a.reportedById,
    reportedByName: a.reportedBy.name,
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
}
