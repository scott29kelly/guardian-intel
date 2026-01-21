/**
 * Competitor Analytics Service
 *
 * Generates insights and analytics from competitor activity data.
 *
 * NOTE: This service is stubbed pending Competitor and CompetitorActivity Prisma models.
 */

// import { prisma } from "@/lib/prisma"; // TODO: Re-enable when Competitor model exists
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
// MAIN ANALYTICS FUNCTION (STUBBED)
// =============================================================================

export async function getCompetitorAnalytics(
  _params: AnalyticsQueryParams = {}
): Promise<CompetitorAnalytics> {
  // TODO: Implement when Competitor and CompetitorActivity models exist
  return {
    overview: getStubOverviewMetrics(),
    competitorRankings: [],
    activityTrends: [],
    territoryBreakdown: [],
    pricingAnalysis: getStubPricingAnalysis(),
    winLossAnalysis: getStubWinLossAnalysis(),
    recentActivity: [],
  };
}

// =============================================================================
// STUB DATA GENERATORS
// =============================================================================

function getStubOverviewMetrics(): OverviewMetrics {
  return {
    totalCompetitors: 0,
    activeCompetitors: 0,
    totalActivities: 0,
    activitiesThisMonth: 0,
    winRate: 0,
    avgCompetitorPrice: null,
    mostActiveCompetitor: null,
    biggestThreat: null,
  };
}

function getStubPricingAnalysis(): PricingAnalysis {
  return {
    avgCompetitorPrice: null,
    avgOurPrice: null,
    priceGap: null,
    priceGapPercent: null,
    byTier: [
      { tier: "budget", avgPrice: null, quoteCount: 0 },
      { tier: "mid", avgPrice: null, quoteCount: 0 },
      { tier: "premium", avgPrice: null, quoteCount: 0 },
      { tier: "luxury", avgPrice: null, quoteCount: 0 },
    ],
    byCompetitor: [],
  };
}

function getStubWinLossAnalysis(): WinLossAnalysis {
  return {
    totalDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    winRate: 0,
    wonValue: 0,
    lostValue: 0,
    byCompetitor: [],
    topLossReasons: [],
    topWinReasons: [],
  };
}

// =============================================================================
// EXPORT ADDITIONAL STUBBED FUNCTIONS
// =============================================================================

export async function calculateCompetitorRankings(
  _start: Date,
  _end: Date,
  _stateFilter: Record<string, unknown>
): Promise<CompetitorRanking[]> {
  // TODO: Implement when Competitor model exists
  return [];
}

export async function calculateActivityTrends(
  _start: Date,
  _end: Date,
  _stateFilter: Record<string, unknown>,
  _competitorFilter: Record<string, unknown>
): Promise<ActivityTrend[]> {
  // TODO: Implement when CompetitorActivity model exists
  return [];
}

export async function calculateTerritoryBreakdown(
  _start: Date,
  _end: Date
): Promise<TerritoryBreakdown[]> {
  // TODO: Implement when CompetitorActivity model exists
  return [];
}

export async function getRecentActivity(
  _limit: number,
  _stateFilter: Record<string, unknown>,
  _competitorFilter: Record<string, unknown>
): Promise<CompetitorActivityData[]> {
  // TODO: Implement when CompetitorActivity model exists
  return [];
}
