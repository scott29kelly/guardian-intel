/**
 * Competitor Intelligence Types
 * 
 * Types for tracking and analyzing competitor activity.
 */

// =============================================================================
// COMPETITOR TYPES
// =============================================================================

export type PricingTier = "budget" | "mid" | "premium" | "luxury";

export type ActivityType = 
  | "sighting"      // Saw their truck/crew
  | "quote"         // Customer mentioned their quote
  | "won_deal"      // We won against them
  | "lost_deal"     // We lost to them
  | "canvassing"    // Saw them canvassing area
  | "marketing"     // Saw their marketing materials
  | "price_intel";  // Got pricing intelligence

export type PriceComparison = "lower" | "similar" | "higher";

// =============================================================================
// ACTIVITY TYPES
// =============================================================================

export interface CompetitorActivityData {
  id: string;
  createdAt: Date;
  competitorId: string;
  competitorName: string;
  customerId: string | null;
  customerName: string | null;
  reportedById: string;
  reportedByName: string;
  activityType: ActivityType;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  description: string | null;
  quotedPrice: number | null;
  priceComparison: PriceComparison | null;
  outcome: string | null;
  outcomeReason: string | null;
  dealValue: number | null;
  hasPhoto: boolean;
  photoUrl: string | null;
  isVerified: boolean;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface CompetitorAnalytics {
  overview: OverviewMetrics;
  competitorRankings: CompetitorRanking[];
  activityTrends: ActivityTrend[];
  territoryBreakdown: TerritoryBreakdown[];
  pricingAnalysis: PricingAnalysis;
  winLossAnalysis: WinLossAnalysis;
  recentActivity: CompetitorActivityData[];
}

export interface OverviewMetrics {
  totalCompetitors: number;
  activeCompetitors: number; // Seen in last 30 days
  totalActivities: number;
  activitiesThisMonth: number;
  winRate: number; // % of deals won against competitors
  avgCompetitorPrice: number | null;
  mostActiveCompetitor: string | null;
  biggestThreat: string | null; // Competitor with most lost deals
}

export interface CompetitorRanking {
  id: string;
  name: string;
  displayName: string | null;
  pricingTier: PricingTier;
  activityCount: number;
  sightings: number;
  quotes: number;
  wonAgainst: number;
  lostTo: number;
  winRate: number;
  avgQuotedPrice: number | null;
  lastSeen: Date | null;
  threatLevel: "low" | "medium" | "high";
}

export interface ActivityTrend {
  date: string; // YYYY-MM-DD
  total: number;
  sightings: number;
  quotes: number;
  wonDeals: number;
  lostDeals: number;
}

export interface TerritoryBreakdown {
  state: string;
  totalActivities: number;
  topCompetitor: string | null;
  topCompetitorActivities: number;
  winRate: number;
  lostDeals: number;
}

export interface PricingAnalysis {
  avgCompetitorPrice: number | null;
  avgOurPrice: number | null;
  priceGap: number | null; // + means we're higher
  priceGapPercent: number | null;
  byTier: {
    tier: PricingTier;
    avgPrice: number | null;
    quoteCount: number;
  }[];
  byCompetitor: {
    competitorId: string;
    competitorName: string;
    avgPrice: number | null;
    quoteCount: number;
    priceComparison: PriceComparison | null; // Most common
  }[];
}

export interface WinLossAnalysis {
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  wonValue: number;
  lostValue: number;
  byCompetitor: {
    competitorId: string;
    competitorName: string;
    wonAgainst: number;
    lostTo: number;
    winRate: number;
    wonValue: number;
    lostValue: number;
  }[];
  topLossReasons: {
    reason: string;
    count: number;
  }[];
  topWinReasons: {
    reason: string;
    count: number;
  }[];
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface CompetitorQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  pricingTier?: PricingTier;
  isActive?: boolean;
  sortBy?: "name" | "activityCount" | "winRate" | "lastSeen";
  sortOrder?: "asc" | "desc";
}

export interface ActivityQueryParams {
  page?: number;
  limit?: number;
  competitorId?: string;
  customerId?: string;
  activityType?: ActivityType;
  state?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "createdAt" | "dealValue";
  sortOrder?: "asc" | "desc";
}

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  state?: string;
  competitorId?: string;
}
