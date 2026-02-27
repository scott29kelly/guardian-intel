/**
 * Gamification Leaderboard API
 *
 * GET - Fetch team leaderboard from real database data
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLevel, XP_REWARDS, ACHIEVEMENTS } from "@/lib/gamification/types";
import type { LeaderboardEntry } from "@/lib/gamification/types";

export const dynamic = "force-dynamic";

/** Interaction types that count as calls */
const CALL_TYPES = ["call", "phone_call", "voicemail"];
/** Interaction types that count as emails */
const EMAIL_TYPES = ["email"];
/** Interaction types that count as visits / site inspections */
const VISIT_TYPES = ["visit", "site_visit", "appointment"];

/**
 * Compute a date filter for the requested leaderboard period.
 */
function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "all-time":
    default:
      return null;
  }
}

/**
 * Build stats for a single user, optionally constrained by a period start date.
 */
async function getUserLeaderboardStats(
  userId: string,
  periodStart: Date | null
) {
  const dateFilter = periodStart ? { gte: periodStart } : undefined;
  const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

  const [callCount, emailCount, visitCount, dealAgg] = await Promise.all([
    prisma.interaction.count({
      where: { userId, type: { in: CALL_TYPES }, ...createdAtFilter },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: EMAIL_TYPES }, ...createdAtFilter },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: VISIT_TYPES }, ...createdAtFilter },
    }),
    prisma.customer.aggregate({
      where: {
        assignedRepId: userId,
        status: "closed-won",
        ...(periodStart ? { updatedAt: { gte: periodStart } } : {}),
      },
      _count: { id: true },
      _sum: { estimatedJobValue: true, profitPotential: true },
    }),
  ]);

  const totalDeals = dealAgg._count.id;
  const totalRevenue =
    (dealAgg._sum.profitPotential ?? 0) || (dealAgg._sum.estimatedJobValue ?? 0);
  const totalInteractions = callCount + emailCount + visitCount;

  // Compute XP
  let xp = 0;
  xp += callCount * (XP_REWARDS.call as number);
  xp += emailCount * (XP_REWARDS.email as number);
  xp += visitCount * (XP_REWARDS.visit as number);
  xp += totalDeals * (XP_REWARDS.closeDeal as number);

  // Add achievement XP
  for (const achievement of ACHIEVEMENTS) {
    let isUnlocked = false;
    switch (achievement.category) {
      case "calls":
        isUnlocked = callCount >= achievement.requirement;
        break;
      case "deals":
        isUnlocked = totalDeals >= achievement.requirement;
        break;
      case "revenue":
        isUnlocked = totalRevenue >= achievement.requirement;
        break;
    }
    if (isUnlocked) {
      xp += achievement.xpReward;
    }
  }

  return { totalDeals, totalRevenue, totalInteractions, xp };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "demo-user";
    const userName = session?.user?.name || "You";

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const metric = searchParams.get("metric") || "revenue"; // revenue, deals, xp
    const limit = parseInt(searchParams.get("limit") || "10");

    const periodStart = getPeriodStart(period);

    // Fetch all active reps/managers
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["rep", "manager"] },
      },
      select: { id: true, name: true, image: true },
    });

    // Aggregate stats for each user in parallel
    const statsPromises = users.map(async (user) => {
      const stats = await getUserLeaderboardStats(user.id, periodStart);
      return { user, stats };
    });

    const allStats = await Promise.all(statsPromises);

    // Determine score based on requested metric
    const scored = allStats.map(({ user, stats }) => {
      let score = 0;
      switch (metric) {
        case "revenue":
          score = stats.totalRevenue;
          break;
        case "deals":
          score = stats.totalDeals;
          break;
        case "xp":
          score = stats.xp;
          break;
        default:
          score = stats.totalRevenue;
      }

      const levelInfo = calculateLevel(stats.xp);
      return {
        userId: user.id,
        name: user.name,
        avatar: user.image || undefined,
        score,
        level: levelInfo.level,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Assign ranks
    const ranked: LeaderboardEntry[] = scored.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: entry.name,
      avatar: entry.avatar,
      score: Math.round(entry.score * 100) / 100,
      change: 0, // Position change tracking would require historical data
      level: entry.level,
    }));

    // Ensure current user is represented even if not in the active rep list
    let currentUser = ranked.find((e) => e.userId === userId);
    if (!currentUser) {
      // Current user is not in the rep/manager list — add them with their real stats
      const currentStats = await getUserLeaderboardStats(userId, periodStart);
      let currentScore = 0;
      switch (metric) {
        case "revenue":
          currentScore = currentStats.totalRevenue;
          break;
        case "deals":
          currentScore = currentStats.totalDeals;
          break;
        case "xp":
          currentScore = currentStats.xp;
          break;
        default:
          currentScore = currentStats.totalRevenue;
      }

      const currentLevelInfo = calculateLevel(currentStats.xp);
      currentUser = {
        rank: ranked.length + 1,
        userId,
        name: userName,
        score: Math.round(currentScore * 100) / 100,
        change: 0,
        level: currentLevelInfo.level,
      };
    }

    // Apply limit for top entries
    const topEntries = ranked.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        entries: topEntries,
        currentUser,
        period,
        metric,
        totalParticipants: ranked.length,
      },
    });
  } catch (error) {
    console.error("[Leaderboard] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
