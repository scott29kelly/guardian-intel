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
  PricingTier,
} from "./types";

// =============================================================================
// MAIN ANALYTICS FUNCTION
// =============================================================================

export async function getCompetitorAnalytics(
  params: AnalyticsQueryParams = {}
): Promise<CompetitorAnalytics> {
  const { startDate, endDate, state, competitorId } = params;

  // Default to last 90 days if no date range specified
  const start = startDate 
    ? new Date(startDate) 
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Build base filters
  const dateFilter = {
    createdAt: {
      gte: start,
      lte: end,
    },
  };

  const stateFilter = state ? { state } : {};
  const competitorFilter = competitorId ? { competitorId } : {};

  // Fetch all required data in parallel
  const [
    overview,
    rankings,
    trends,
    territory,
    pricing,
    winLoss,
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
    competitorRankings: rankings,
    activityTrends: trends,
    territoryBreakdown: territory,
    pricingAnalysis: pricing,
    winLossAnalysis: winLoss,
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
    activeCompetitors,
    totalActivities,
    activitiesThisMonth,
    winLossStats,
    priceStats,
    mostActiveResult,
    biggestThreatResult,
  ] = await Promise.all([
    // Total competitors
    prisma.competitor.count({ where: { isActive: true } }),
    
    // Active in last 30 days
    prisma.competitor.count({
      where: {
        isActive: true,
        activities: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
            ...stateFilter,
          },
        },
      },
    }),
    
    // Total activities in range
    prisma.competitorActivity.count({
      where: {
        createdAt: { gte: start, lte: end },
        ...stateFilter,
      },
    }),
    
    // Activities this month
    prisma.competitorActivity.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...stateFilter,
      },
    }),
    
    // Win/loss stats
    prisma.competitorActivity.groupBy({
      by: ["activityType"],
      where: {
        activityType: { in: ["won_deal", "lost_deal"] },
        createdAt: { gte: start, lte: end },
        ...stateFilter,
      },
      _count: true,
    }),
    
    // Average competitor price
    prisma.competitorActivity.aggregate({
      where: {
        quotedPrice: { not: null },
        createdAt: { gte: start, lte: end },
        ...stateFilter,
      },
      _avg: { quotedPrice: true },
    }),
    
    // Most active competitor
    prisma.competitorActivity.groupBy({
      by: ["competitorId"],
      where: {
        createdAt: { gte: start, lte: end },
        ...stateFilter,
      },
      _count: true,
      orderBy: { _count: { competitorId: "desc" } },
      take: 1,
    }),
    
    // Biggest threat (most lost deals)
    prisma.competitorActivity.groupBy({
      by: ["competitorId"],
      where: {
        activityType: "lost_deal",
        createdAt: { gte: start, lte: end },
        ...stateFilter,
      },
      _count: true,
      orderBy: { _count: { competitorId: "desc" } },
      take: 1,
    }),
  ]);

  // Calculate win rate
  const wonDeals = winLossStats.find(s => s.activityType === "won_deal")?._count || 0;
  const lostDeals = winLossStats.find(s => s.activityType === "lost_deal")?._count || 0;
  const totalDeals = wonDeals + lostDeals;
  const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

  // Get competitor names
  let mostActiveCompetitor: string | null = null;
  let biggestThreat: string | null = null;

  if (mostActiveResult.length > 0) {
    const competitor = await prisma.competitor.findUnique({
      where: { id: mostActiveResult[0].competitorId },
      select: { name: true, displayName: true },
    });
    mostActiveCompetitor = competitor?.displayName || competitor?.name || null;
  }

  if (biggestThreatResult.length > 0) {
    const competitor = await prisma.competitor.findUnique({
      where: { id: biggestThreatResult[0].competitorId },
      select: { name: true, displayName: true },
    });
    biggestThreat = competitor?.displayName || competitor?.name || null;
  }

  return {
    totalCompetitors,
    activeCompetitors,
    totalActivities,
    activitiesThisMonth,
    winRate: Math.round(winRate * 10) / 10,
    avgCompetitorPrice: priceStats._avg.quotedPrice 
      ? Math.round(priceStats._avg.quotedPrice) 
      : null,
    mostActiveCompetitor,
    biggestThreat,
  };
}

// =============================================================================
// COMPETITOR RANKINGS
// =============================================================================

async function calculateCompetitorRankings(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<CompetitorRanking[]> {
  // Get all active competitors with activity stats
  const competitors = await prisma.competitor.findMany({
    where: { isActive: true },
    include: {
      activities: {
        where: {
          createdAt: { gte: start, lte: end },
          ...stateFilter,
        },
        select: {
          activityType: true,
          quotedPrice: true,
          createdAt: true,
        },
      },
    },
  });

  return competitors.map(comp => {
    const activities = comp.activities;
    const sightings = activities.filter(a => a.activityType === "sighting").length;
    const quotes = activities.filter(a => a.activityType === "quote").length;
    const wonAgainst = activities.filter(a => a.activityType === "won_deal").length;
    const lostTo = activities.filter(a => a.activityType === "lost_deal").length;
    
    const totalDeals = wonAgainst + lostTo;
    const winRate = totalDeals > 0 ? (wonAgainst / totalDeals) * 100 : 0;
    
    const quotedPrices = activities
      .filter(a => a.quotedPrice !== null)
      .map(a => a.quotedPrice as number);
    const avgQuotedPrice = quotedPrices.length > 0
      ? quotedPrices.reduce((a, b) => a + b, 0) / quotedPrices.length
      : null;
    
    const lastActivity = activities.length > 0
      ? activities.reduce((latest, a) => 
          a.createdAt > latest ? a.createdAt : latest, 
          activities[0].createdAt
        )
      : null;

    // Calculate threat level
    let threatLevel: "low" | "medium" | "high" = "low";
    if (lostTo >= 5 || (totalDeals >= 3 && winRate < 40)) {
      threatLevel = "high";
    } else if (lostTo >= 2 || activities.length >= 10) {
      threatLevel = "medium";
    }

    return {
      id: comp.id,
      name: comp.name,
      displayName: comp.displayName,
      pricingTier: comp.pricingTier as PricingTier,
      activityCount: activities.length,
      sightings,
      quotes,
      wonAgainst,
      lostTo,
      winRate: Math.round(winRate * 10) / 10,
      avgQuotedPrice: avgQuotedPrice ? Math.round(avgQuotedPrice) : null,
      lastSeen: lastActivity,
      threatLevel,
    };
  }).sort((a, b) => b.activityCount - a.activityCount);
}

// =============================================================================
// ACTIVITY TRENDS
// =============================================================================

async function calculateActivityTrends(
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
    select: {
      createdAt: true,
      activityType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const trendMap = new Map<string, ActivityTrend>();

  for (const activity of activities) {
    const date = activity.createdAt.toISOString().split("T")[0];
    
    if (!trendMap.has(date)) {
      trendMap.set(date, {
        date,
        total: 0,
        sightings: 0,
        quotes: 0,
        wonDeals: 0,
        lostDeals: 0,
      });
    }

    const trend = trendMap.get(date)!;
    trend.total++;
    
    switch (activity.activityType) {
      case "sighting":
      case "canvassing":
        trend.sightings++;
        break;
      case "quote":
      case "price_intel":
        trend.quotes++;
        break;
      case "won_deal":
        trend.wonDeals++;
        break;
      case "lost_deal":
        trend.lostDeals++;
        break;
    }
  }

  return Array.from(trendMap.values());
}

// =============================================================================
// TERRITORY BREAKDOWN
// =============================================================================

async function calculateTerritoryBreakdown(
  start: Date,
  end: Date
): Promise<TerritoryBreakdown[]> {
  const states = ["PA", "NJ", "DE", "MD", "VA", "NY"];
  const breakdowns: TerritoryBreakdown[] = [];

  for (const state of states) {
    const [
      totalActivities,
      topCompetitorResult,
      winLossStats,
    ] = await Promise.all([
      prisma.competitorActivity.count({
        where: {
          state,
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.competitorActivity.groupBy({
        by: ["competitorId"],
        where: {
          state,
          createdAt: { gte: start, lte: end },
        },
        _count: true,
        orderBy: { _count: { competitorId: "desc" } },
        take: 1,
      }),
      prisma.competitorActivity.groupBy({
        by: ["activityType"],
        where: {
          state,
          activityType: { in: ["won_deal", "lost_deal"] },
          createdAt: { gte: start, lte: end },
        },
        _count: true,
      }),
    ]);

    let topCompetitor: string | null = null;
    let topCompetitorActivities = 0;

    if (topCompetitorResult.length > 0) {
      const competitor = await prisma.competitor.findUnique({
        where: { id: topCompetitorResult[0].competitorId },
        select: { name: true, displayName: true },
      });
      topCompetitor = competitor?.displayName || competitor?.name || null;
      topCompetitorActivities = topCompetitorResult[0]._count;
    }

    const wonDeals = winLossStats.find(s => s.activityType === "won_deal")?._count || 0;
    const lostDeals = winLossStats.find(s => s.activityType === "lost_deal")?._count || 0;
    const totalDeals = wonDeals + lostDeals;
    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    breakdowns.push({
      state,
      totalActivities,
      topCompetitor,
      topCompetitorActivities,
      winRate: Math.round(winRate * 10) / 10,
      lostDeals,
    });
  }

  return breakdowns.sort((a, b) => b.totalActivities - a.totalActivities);
}

// =============================================================================
// PRICING ANALYSIS
// =============================================================================

async function calculatePricingAnalysis(
  start: Date,
  end: Date,
  stateFilter: Record<string, unknown>
): Promise<PricingAnalysis> {
  // Get competitor quotes with pricing
  const quotesWithPricing = await prisma.competitorActivity.findMany({
    where: {
      quotedPrice: { not: null },
      createdAt: { gte: start, lte: end },
      ...stateFilter,
    },
    include: {
      competitor: {
        select: {
          id: true,
          name: true,
          displayName: true,
          pricingTier: true,
        },
      },
    },
  });

  // Calculate overall average
  const avgCompetitorPrice = quotesWithPricing.length > 0
    ? quotesWithPricing.reduce((sum, q) => sum + (q.quotedPrice || 0), 0) / quotesWithPricing.length
    : null;

  // Get our average deal value for comparison
  const ourDeals = await prisma.proposal.aggregate({
    where: {
      status: "accepted",
      createdAt: { gte: start, lte: end },
    },
    _avg: { totalPrice: true },
  });
  const avgOurPrice = ourDeals._avg.totalPrice;

  // Price gap
  const priceGap = avgOurPrice && avgCompetitorPrice 
    ? avgOurPrice - avgCompetitorPrice 
    : null;
  const priceGapPercent = avgOurPrice && avgCompetitorPrice
    ? ((avgOurPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100
    : null;

  // By tier
  const tiers: PricingTier[] = ["budget", "mid", "premium", "luxury"];
  const byTier = tiers.map(tier => {
    const tierQuotes = quotesWithPricing.filter(q => q.competitor.pricingTier === tier);
    const avgPrice = tierQuotes.length > 0
      ? tierQuotes.reduce((sum, q) => sum + (q.quotedPrice || 0), 0) / tierQuotes.length
      : null;
    return {
      tier,
      avgPrice: avgPrice ? Math.round(avgPrice) : null,
      quoteCount: tierQuotes.length,
    };
  });

  // By competitor
  const competitorMap = new Map<string, { 
    name: string; 
    prices: number[]; 
    comparisons: string[];
  }>();

  for (const quote of quotesWithPricing) {
    const id = quote.competitor.id;
    if (!competitorMap.has(id)) {
      competitorMap.set(id, {
        name: quote.competitor.displayName || quote.competitor.name,
        prices: [],
        comparisons: [],
      });
    }
    const entry = competitorMap.get(id)!;
    if (quote.quotedPrice) entry.prices.push(quote.quotedPrice);
    if (quote.priceComparison) entry.comparisons.push(quote.priceComparison);
  }

  const byCompetitor = Array.from(competitorMap.entries()).map(([id, data]) => {
    const avgPrice = data.prices.length > 0
      ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      : null;
    
    // Most common comparison
    const comparisonCounts = data.comparisons.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommon = Object.entries(comparisonCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as "lower" | "similar" | "higher" | undefined;

    return {
      competitorId: id,
      competitorName: data.name,
      avgPrice: avgPrice ? Math.round(avgPrice) : null,
      quoteCount: data.prices.length,
      priceComparison: mostCommon || null,
    };
  }).sort((a, b) => b.quoteCount - a.quoteCount);

  return {
    avgCompetitorPrice: avgCompetitorPrice ? Math.round(avgCompetitorPrice) : null,
    avgOurPrice: avgOurPrice ? Math.round(avgOurPrice) : null,
    priceGap: priceGap ? Math.round(priceGap) : null,
    priceGapPercent: priceGapPercent ? Math.round(priceGapPercent * 10) / 10 : null,
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
  const deals = await prisma.competitorActivity.findMany({
    where: {
      activityType: { in: ["won_deal", "lost_deal"] },
      createdAt: { gte: start, lte: end },
      ...stateFilter,
    },
    include: {
      competitor: {
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      },
    },
  });

  const wonDeals = deals.filter(d => d.activityType === "won_deal");
  const lostDeals = deals.filter(d => d.activityType === "lost_deal");

  const wonValue = wonDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const lostValue = lostDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

  const totalDeals = deals.length;
  const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

  // By competitor
  const competitorMap = new Map<string, {
    name: string;
    wonAgainst: number;
    lostTo: number;
    wonValue: number;
    lostValue: number;
  }>();

  for (const deal of deals) {
    const id = deal.competitor.id;
    if (!competitorMap.has(id)) {
      competitorMap.set(id, {
        name: deal.competitor.displayName || deal.competitor.name,
        wonAgainst: 0,
        lostTo: 0,
        wonValue: 0,
        lostValue: 0,
      });
    }
    const entry = competitorMap.get(id)!;
    if (deal.activityType === "won_deal") {
      entry.wonAgainst++;
      entry.wonValue += deal.dealValue || 0;
    } else {
      entry.lostTo++;
      entry.lostValue += deal.dealValue || 0;
    }
  }

  const byCompetitor = Array.from(competitorMap.entries()).map(([id, data]) => {
    const total = data.wonAgainst + data.lostTo;
    return {
      competitorId: id,
      competitorName: data.name,
      wonAgainst: data.wonAgainst,
      lostTo: data.lostTo,
      winRate: total > 0 ? Math.round((data.wonAgainst / total) * 1000) / 10 : 0,
      wonValue: Math.round(data.wonValue),
      lostValue: Math.round(data.lostValue),
    };
  }).sort((a, b) => (b.wonAgainst + b.lostTo) - (a.wonAgainst + a.lostTo));

  // Loss reasons
  const lossReasonCounts: Record<string, number> = {};
  const winReasonCounts: Record<string, number> = {};

  for (const deal of deals) {
    if (deal.outcomeReason) {
      if (deal.activityType === "lost_deal") {
        lossReasonCounts[deal.outcomeReason] = (lossReasonCounts[deal.outcomeReason] || 0) + 1;
      } else {
        winReasonCounts[deal.outcomeReason] = (winReasonCounts[deal.outcomeReason] || 0) + 1;
      }
    }
  }

  const topLossReasons = Object.entries(lossReasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topWinReasons = Object.entries(winReasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDeals,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    winRate: Math.round(winRate * 10) / 10,
    wonValue: Math.round(wonValue),
    lostValue: Math.round(lostValue),
    byCompetitor,
    topLossReasons,
    topWinReasons,
  };
}

// =============================================================================
// RECENT ACTIVITY
// =============================================================================

async function getRecentActivity(
  limit: number,
  stateFilter: Record<string, unknown>,
  competitorFilter: Record<string, unknown>
): Promise<CompetitorActivityData[]> {
  const activities = await prisma.competitorActivity.findMany({
    where: {
      ...stateFilter,
      ...competitorFilter,
    },
    include: {
      competitor: {
        select: {
          name: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return activities.map(a => ({
    id: a.id,
    createdAt: a.createdAt,
    competitorId: a.competitorId,
    competitorName: a.competitor.displayName || a.competitor.name,
    customerId: a.customerId,
    customerName: null, // Would need to join customer
    reportedById: a.reportedById,
    reportedByName: "", // Would need to join user
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
