/**
 * Daily Metrics Aggregation Service
 *
 * Aggregates daily statistics from raw data into DailyMetrics records.
 * Designed to run as a scheduled job (Vercel Cron or manual trigger).
 */

import { prisma } from "@/lib/prisma";

export interface AggregationResult {
  success: boolean;
  date: string;
  userId: string | null;
  metrics: DailyMetricsData | null;
  error?: string;
}

export interface DailyMetricsData {
  newLeads: number;
  qualifiedLeads: number;
  contactedLeads: number;
  callsMade: number;
  callsConnected: number;
  emailsSent: number;
  textsSent: number;
  visitsMade: number;
  proposalsSent: number;
  proposalValue: number;
  dealsClosed: number;
  revenueWon: number;
  revenueLost: number;
  avgDealSize: number;
  weatherAlerts: number;
  stormLeads: number;
  leadToContactRate: number;
  contactToQualRate: number;
  qualToProposalRate: number;
  proposalToCloseRate: number;
}

/**
 * Get the start and end of a given date (UTC)
 */
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Aggregate metrics for a specific user on a specific date
 */
async function aggregateUserMetrics(
  userId: string | null,
  date: Date
): Promise<DailyMetricsData> {
  const { start, end } = getDayBounds(date);

  // Build user filter (null = company-wide)
  const userFilter = userId ? { assignedRepId: userId } : {};
  const interactionUserFilter = userId ? { userId } : {};

  // ─────────────────────────────────────────────────────────────
  // Lead Metrics
  // ─────────────────────────────────────────────────────────────

  // New leads created today
  const newLeads = await prisma.customer.count({
    where: {
      ...userFilter,
      createdAt: { gte: start, lte: end },
      status: "lead",
    },
  });

  // Leads that moved to "qualified" stage today
  const qualifiedLeads = await prisma.customer.count({
    where: {
      ...userFilter,
      stage: "qualified",
      updatedAt: { gte: start, lte: end },
    },
  });

  // Leads that moved to "contacted" stage today
  const contactedLeads = await prisma.customer.count({
    where: {
      ...userFilter,
      stage: "contacted",
      updatedAt: { gte: start, lte: end },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // Activity Metrics (from Interactions)
  // ─────────────────────────────────────────────────────────────

  const interactions = await prisma.interaction.groupBy({
    by: ["type", "outcome"],
    _count: { id: true },
    where: {
      ...interactionUserFilter,
      createdAt: { gte: start, lte: end },
    },
  });

  // Aggregate interaction counts by type
  const callsMade = interactions
    .filter((i) => i.type === "call")
    .reduce((sum, i) => sum + i._count.id, 0);

  const callsConnected = interactions
    .filter((i) => i.type === "call" && i.outcome === "connected")
    .reduce((sum, i) => sum + i._count.id, 0);

  const emailsSent = interactions
    .filter((i) => i.type === "email")
    .reduce((sum, i) => sum + i._count.id, 0);

  const textsSent = interactions
    .filter((i) => i.type === "text")
    .reduce((sum, i) => sum + i._count.id, 0);

  const visitsMade = interactions
    .filter((i) => i.type === "visit")
    .reduce((sum, i) => sum + i._count.id, 0);

  // ─────────────────────────────────────────────────────────────
  // Pipeline Metrics
  // ─────────────────────────────────────────────────────────────

  // Proposals sent (customers entering proposal stage today)
  const proposalsData = await prisma.customer.aggregate({
    _count: { id: true },
    _sum: { estimatedJobValue: true },
    where: {
      ...userFilter,
      stage: "proposal",
      updatedAt: { gte: start, lte: end },
    },
  });

  const proposalsSent = proposalsData._count.id || 0;
  const proposalValue = proposalsData._sum.estimatedJobValue || 0;

  // ─────────────────────────────────────────────────────────────
  // Revenue Metrics
  // ─────────────────────────────────────────────────────────────

  // Deals closed-won today
  const closedWonData = await prisma.customer.aggregate({
    _count: { id: true },
    _sum: { estimatedJobValue: true },
    where: {
      ...userFilter,
      status: "closed-won",
      updatedAt: { gte: start, lte: end },
    },
  });

  const dealsClosed = closedWonData._count.id || 0;
  const revenueWon = closedWonData._sum.estimatedJobValue || 0;
  const avgDealSize = dealsClosed > 0 ? revenueWon / dealsClosed : 0;

  // Deals closed-lost today
  const closedLostData = await prisma.customer.aggregate({
    _sum: { estimatedJobValue: true },
    where: {
      ...userFilter,
      status: "closed-lost",
      updatedAt: { gte: start, lte: end },
    },
  });

  const revenueLost = closedLostData._sum.estimatedJobValue || 0;

  // ─────────────────────────────────────────────────────────────
  // Weather Intel
  // ─────────────────────────────────────────────────────────────

  const weatherAlerts = await prisma.weatherEvent.count({
    where: {
      createdAt: { gte: start, lte: end },
    },
  });

  // Storm-sourced leads
  const stormLeads = await prisma.customer.count({
    where: {
      ...userFilter,
      leadSource: "storm",
      createdAt: { gte: start, lte: end },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // Conversion Rates (calculated from day's totals)
  // ─────────────────────────────────────────────────────────────

  // Lead to Contact rate
  const leadToContactRate =
    newLeads > 0 ? (contactedLeads / newLeads) * 100 : 0;

  // Contact to Qualified rate
  const contactToQualRate =
    contactedLeads > 0 ? (qualifiedLeads / contactedLeads) * 100 : 0;

  // Qualified to Proposal rate
  const qualToProposalRate =
    qualifiedLeads > 0 ? (proposalsSent / qualifiedLeads) * 100 : 0;

  // Proposal to Close rate
  const proposalToCloseRate =
    proposalsSent > 0 ? (dealsClosed / proposalsSent) * 100 : 0;

  return {
    newLeads,
    qualifiedLeads,
    contactedLeads,
    callsMade,
    callsConnected,
    emailsSent,
    textsSent,
    visitsMade,
    proposalsSent,
    proposalValue,
    dealsClosed,
    revenueWon,
    revenueLost,
    avgDealSize,
    weatherAlerts,
    stormLeads,
    leadToContactRate: Math.round(leadToContactRate * 10) / 10,
    contactToQualRate: Math.round(contactToQualRate * 10) / 10,
    qualToProposalRate: Math.round(qualToProposalRate * 10) / 10,
    proposalToCloseRate: Math.round(proposalToCloseRate * 10) / 10,
  };
}

/**
 * Upsert a DailyMetrics record
 *
 * Note: Prisma composite unique with nullable fields requires special handling.
 * We use a manual find + create/update pattern for reliability.
 */
async function upsertDailyMetrics(
  date: Date,
  userId: string | null,
  metrics: DailyMetricsData
): Promise<void> {
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  // Find existing record - handle null userId specially
  const existing = await prisma.dailyMetrics.findFirst({
    where: {
      date: normalizedDate,
      userId: userId,
    },
  });

  if (existing) {
    await prisma.dailyMetrics.update({
      where: { id: existing.id },
      data: metrics,
    });
  } else {
    await prisma.dailyMetrics.create({
      data: {
        date: normalizedDate,
        userId: userId,
        ...metrics,
      },
    });
  }
}

/**
 * Run aggregation for a single date and optional user
 */
export async function aggregateForDate(
  date: Date,
  userId?: string
): Promise<AggregationResult> {
  const dateStr = date.toISOString().split("T")[0];

  try {
    const metrics = await aggregateUserMetrics(userId ?? null, date);
    await upsertDailyMetrics(date, userId ?? null, metrics);

    return {
      success: true,
      date: dateStr,
      userId: userId ?? null,
      metrics,
    };
  } catch (error) {
    console.error(`[Aggregation] Error for ${dateStr}, user=${userId}:`, error);
    return {
      success: false,
      date: dateStr,
      userId: userId ?? null,
      metrics: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run full daily aggregation:
 * 1. Company-wide metrics (userId = null)
 * 2. Per-user metrics for all active users
 */
export async function runDailyAggregation(
  date: Date = new Date()
): Promise<AggregationResult[]> {
  const results: AggregationResult[] = [];

  console.log(`[Aggregation] Starting for date: ${date.toISOString().split("T")[0]}`);

  // 1. Aggregate company-wide metrics
  const companyResult = await aggregateForDate(date);
  results.push(companyResult);

  // 2. Get all active users and aggregate per-user
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const user of activeUsers) {
    const userResult = await aggregateForDate(date, user.id);
    results.push(userResult);
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Aggregation] Complete: ${successCount}/${results.length} successful`
  );

  return results;
}

/**
 * Backfill historical data for a date range
 */
export async function backfillMetrics(
  startDate: Date,
  endDate: Date
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const results = await runDailyAggregation(new Date(current));
    processed += results.filter((r) => r.success).length;
    errors += results.filter((r) => !r.success).length;

    current.setDate(current.getDate() + 1);
  }

  return { processed, errors };
}
