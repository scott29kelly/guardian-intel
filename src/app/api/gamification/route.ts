/**
 * Gamification API
 *
 * GET - Fetch user's gamification state (derived from real Interaction + Customer data)
 * POST - Record an action (creates an Interaction) and earn XP
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENTS,
  XP_REWARDS,
  calculateLevel,
  getLevelTitle,
  DAILY_GOALS_TEMPLATES,
  type UserStats,
  type DailyGoal,
  type Achievement,
} from "@/lib/gamification/types";
import { cacheGet, cacheSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Interaction type values that count as "calls" */
const CALL_TYPES = ["call", "phone_call", "voicemail"];
/** Interaction type values that count as "emails" */
const EMAIL_TYPES = ["email"];
/** Interaction type values that count as "visits" */
const VISIT_TYPES = ["visit", "site_visit", "appointment"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute the current consecutive-day streak from Interaction records.
 * Walks backwards day-by-day from today; each day with >= 1 interaction
 * extends the streak.
 */
async function computeStreak(userId: string): Promise<{ current: number; longest: number }> {
  // Fetch distinct dates (descending) where this user had interactions
  const rows = await prisma.$queryRaw<{ d: Date }[]>`
    SELECT DISTINCT DATE("createdAt") as d
    FROM "Interaction"
    WHERE "userId" = ${userId}
    ORDER BY d DESC
  `;

  if (rows.length === 0) return { current: 0, longest: 0 };

  const dates = rows.map((r) => {
    const dt = new Date(r.d);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime();
  });

  const todayMs = startOfToday().getTime();
  const oneDayMs = 86_400_000;

  // Current streak: must include today or yesterday to be active
  let current = 0;
  let expected = todayMs;

  // Allow streak to start from today or yesterday
  if (dates[0] === todayMs) {
    expected = todayMs;
  } else if (dates[0] === todayMs - oneDayMs) {
    expected = todayMs - oneDayMs;
  } else {
    // Last activity was more than 1 day ago — streak is 0
    current = 0;
  }

  if (dates[0] === expected) {
    for (const dateMs of dates) {
      if (dateMs === expected) {
        current++;
        expected -= oneDayMs;
      } else if (dateMs < expected) {
        break;
      }
    }
  }

  // Longest streak (walk through all dates)
  let longest = 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i - 1] - dates[i] === oneDayMs) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak, current);

  return { current, longest };
}

/**
 * Compute total XP from a user's interaction and deal history.
 * Each interaction type earns its base XP. Closed-won deals earn closeDeal XP.
 */
function computeXP(stats: UserStats): number {
  let xp = 0;
  xp += stats.totalCalls * (XP_REWARDS.call as number);
  xp += stats.totalEmails * (XP_REWARDS.email as number);
  xp += stats.totalVisits * (XP_REWARDS.visit as number);
  xp += stats.totalDeals * (XP_REWARDS.closeDeal as number);

  // Add achievement XP for unlocked achievements
  for (const achievement of ACHIEVEMENTS) {
    if (stats.unlockedAchievements.includes(achievement.id)) {
      xp += achievement.xpReward;
    }
  }

  // Add streak bonus
  if (stats.currentStreak > 0) {
    const streakFn = XP_REWARDS.streakBonus as (days: number) => number;
    xp += streakFn(stats.currentStreak);
  }

  return xp;
}

/**
 * Determine which achievements are unlocked given current stats.
 */
function deriveUnlockedAchievements(stats: {
  totalCalls: number;
  totalDeals: number;
  totalRevenue: number;
  currentStreak: number;
}): string[] {
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    let isUnlocked = false;
    switch (achievement.category) {
      case "calls":
        isUnlocked = stats.totalCalls >= achievement.requirement;
        break;
      case "deals":
        isUnlocked = stats.totalDeals >= achievement.requirement;
        break;
      case "revenue":
        isUnlocked = stats.totalRevenue >= achievement.requirement;
        break;
      case "streak":
        isUnlocked = stats.currentStreak >= achievement.requirement;
        break;
    }
    if (isUnlocked) {
      unlocked.push(achievement.id);
    }
  }
  return unlocked;
}

/**
 * Build a complete UserStats object from real database data.
 */
async function buildUserStats(userId: string): Promise<UserStats> {
  const todayStart = startOfToday();

  // Run all counts in parallel
  const [
    totalCalls,
    totalEmails,
    totalVisits,
    callsToday,
    emailsToday,
    visitsToday,
    closedWonCustomers,
    closedWonToday,
    streak,
  ] = await Promise.all([
    // Total counts (all time)
    prisma.interaction.count({
      where: { userId, type: { in: CALL_TYPES } },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: EMAIL_TYPES } },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: VISIT_TYPES } },
    }),
    // Today counts
    prisma.interaction.count({
      where: { userId, type: { in: CALL_TYPES }, createdAt: { gte: todayStart } },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: EMAIL_TYPES }, createdAt: { gte: todayStart } },
    }),
    prisma.interaction.count({
      where: { userId, type: { in: VISIT_TYPES }, createdAt: { gte: todayStart } },
    }),
    // Closed-won deals (all time) — revenue aggregation
    prisma.customer.aggregate({
      where: { assignedRepId: userId, status: "closed-won" },
      _count: { id: true },
      _sum: { estimatedJobValue: true, profitPotential: true },
    }),
    // Closed-won deals today
    prisma.customer.aggregate({
      where: {
        assignedRepId: userId,
        status: "closed-won",
        updatedAt: { gte: todayStart },
      },
      _count: { id: true },
      _sum: { estimatedJobValue: true, profitPotential: true },
    }),
    // Streak
    computeStreak(userId),
  ]);

  const totalDeals = closedWonCustomers._count.id;
  const totalRevenue =
    (closedWonCustomers._sum.profitPotential ?? 0) ||
    (closedWonCustomers._sum.estimatedJobValue ?? 0);

  const dealsToday = closedWonToday._count.id;
  const revenueToday =
    (closedWonToday._sum.profitPotential ?? 0) ||
    (closedWonToday._sum.estimatedJobValue ?? 0);

  // Get last active date
  const lastInteraction = await prisma.interaction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastActiveDate = lastInteraction
    ? lastInteraction.createdAt.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // Derive achievements and XP
  const unlockedAchievements = deriveUnlockedAchievements({
    totalCalls,
    totalDeals,
    totalRevenue,
    currentStreak: streak.current,
  });

  const partialStats: UserStats = {
    totalCalls,
    totalEmails,
    totalVisits,
    totalDeals,
    totalRevenue,
    callsToday,
    emailsToday,
    visitsToday,
    dealsToday,
    revenueToday,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    lastActiveDate,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    unlockedAchievements,
  };

  // Compute XP from activity
  const xp = computeXP(partialStats);
  const levelInfo = calculateLevel(xp);

  partialStats.xp = xp;
  partialStats.level = levelInfo.level;
  partialStats.xpToNextLevel = levelInfo.xpToNextLevel - levelInfo.xpInLevel;

  return partialStats;
}

// ---------------------------------------------------------------------------
// Daily Goals
// ---------------------------------------------------------------------------

function getDailyGoals(stats: UserStats): DailyGoal[] {
  return DAILY_GOALS_TEMPLATES.map((template) => {
    let current = 0;
    switch (template.id) {
      case "calls-goal":
        current = stats.callsToday;
        break;
      case "emails-goal":
        current = stats.emailsToday;
        break;
      case "appointments-goal":
        current = Math.min(stats.visitsToday, template.target);
        break;
      case "log-goal":
        current = Math.min(stats.callsToday + stats.emailsToday, template.target);
        break;
    }
    return {
      ...template,
      current,
      completed: current >= template.target,
    };
  });
}

// ---------------------------------------------------------------------------
// Achievements with progress
// ---------------------------------------------------------------------------

function getAchievementsWithProgress(stats: UserStats): (Achievement & { progress: number; isUnlocked: boolean })[] {
  return ACHIEVEMENTS.map((achievement) => {
    let progress = 0;
    switch (achievement.category) {
      case "calls":
        progress = Math.min(100, (stats.totalCalls / achievement.requirement) * 100);
        break;
      case "deals":
        progress = Math.min(100, (stats.totalDeals / achievement.requirement) * 100);
        break;
      case "revenue":
        progress = Math.min(100, (stats.totalRevenue / achievement.requirement) * 100);
        break;
      case "streak":
        progress = Math.min(100, (stats.currentStreak / achievement.requirement) * 100);
        break;
      default:
        progress = 0;
    }

    return {
      ...achievement,
      progress,
      isUnlocked: stats.unlockedAchievements.includes(achievement.id),
    };
  });
}

// ---------------------------------------------------------------------------
// GET — fetch gamification state
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "demo-user";

    // Check cache first
    const cacheKey = buildCacheKey("gamification", userId);
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const stats = await buildUserStats(userId);
    const levelInfo = calculateLevel(stats.xp);
    const dailyGoals = getDailyGoals(stats);
    const achievements = getAchievementsWithProgress(stats);

    const responseData = {
      success: true,
      data: {
        stats: {
          ...stats,
          level: levelInfo.level,
          xpToNextLevel: levelInfo.xpToNextLevel - levelInfo.xpInLevel,
          levelTitle: getLevelTitle(levelInfo.level),
          levelProgress: (levelInfo.xpInLevel / levelInfo.xpToNextLevel) * 100,
        },
        dailyGoals,
        achievements,
        unlockedCount: stats.unlockedAchievements.length,
        totalAchievements: ACHIEVEMENTS.length,
      },
    };

    // Cache the response
    await cacheSet(cacheKey, responseData, CACHE_TTL.gamification);

    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("[Gamification] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gamification data" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — record an action
// ---------------------------------------------------------------------------

/** Map gamification action names to Interaction type values */
const ACTION_TO_INTERACTION_TYPE: Record<string, string> = {
  call: "call",
  email: "email",
  visit: "site_visit",
  closeDeal: "call", // deal-closing is typically associated with a call/meeting
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "demo-user";
    const body = await request.json();

    const { action, metadata } = body as {
      action: keyof typeof XP_REWARDS;
      metadata?: Record<string, unknown>;
    };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    // Get stats before the action (to detect first-action-of-day + streak changes)
    const statsBefore = await buildUserStats(userId);
    const today = new Date().toISOString().split("T")[0];
    const isFirstActionToday = statsBefore.lastActiveDate !== today;

    // Create a real Interaction record for call/email/visit actions
    const interactionType = ACTION_TO_INTERACTION_TYPE[action as string];
    if (interactionType && action !== "closeDeal") {
      const customerId = metadata?.customerId as string | undefined;

      // If a customerId was provided, use it. Otherwise pick the user's first customer.
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId) {
        const firstCustomer = await prisma.customer.findFirst({
          where: { assignedRepId: userId },
          select: { id: true },
        });
        resolvedCustomerId = firstCustomer?.id;
      }

      if (resolvedCustomerId) {
        await prisma.interaction.create({
          data: {
            customerId: resolvedCustomerId,
            userId,
            type: interactionType,
            direction: "outbound",
            subject: `${String(action)} logged via gamification`,
            content: (metadata?.notes as string) || `${String(action)} action recorded`,
            outcome: (metadata?.outcome as string) || undefined,
          },
        });
      }
    }

    // Handle closeDeal — update customer status
    if (action === "closeDeal") {
      const customerId = metadata?.customerId as string | undefined;
      if (customerId) {
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            status: "closed-won",
            stage: "closed",
            estimatedJobValue: (metadata?.revenue as number) || undefined,
          },
        });

        // Also record an interaction for the deal close
        await prisma.interaction.create({
          data: {
            customerId,
            userId,
            type: "call",
            direction: "outbound",
            subject: "Deal closed",
            content: `Deal closed for $${metadata?.revenue || 0}`,
            outcome: "closed_won",
          },
        });
      }
    }

    // Recompute stats from the database after the action
    const statsAfter = await buildUserStats(userId);

    // Calculate XP earned = difference
    const xpEarned = statsAfter.xp - statsBefore.xp;

    // Detect level-up
    const levelBefore = calculateLevel(statsBefore.xp);
    const levelAfter = calculateLevel(statsAfter.xp);
    const leveledUp = levelAfter.level > levelBefore.level;

    // Detect newly unlocked achievements
    const newAchievementIds = statsAfter.unlockedAchievements.filter(
      (id) => !statsBefore.unlockedAchievements.includes(id)
    );
    const newAchievements = ACHIEVEMENTS.filter((a) => newAchievementIds.includes(a.id));

    return NextResponse.json({
      success: true,
      data: {
        xpEarned,
        totalXP: statsAfter.xp,
        level: levelAfter.level,
        leveledUp,
        newAchievements,
        currentStreak: statsAfter.currentStreak,
        isFirstActionToday,
      },
    });
  } catch (error) {
    console.error("[Gamification] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record action" },
      { status: 500 }
    );
  }
}
