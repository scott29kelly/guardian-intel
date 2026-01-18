/**
 * Gamification API
 * 
 * GET - Fetch user's gamification state
 * POST - Record an action and earn XP
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

// Mock data store (in production, this would be Prisma)
const mockUserStats: Record<string, UserStats> = {};

function getOrCreateUserStats(userId: string): UserStats {
  if (!mockUserStats[userId]) {
    mockUserStats[userId] = {
      totalCalls: 42,
      totalEmails: 128,
      totalVisits: 23,
      totalDeals: 8,
      totalRevenue: 127500,
      callsToday: 12,
      emailsToday: 5,
      visitsToday: 2,
      dealsToday: 1,
      revenueToday: 15000,
      currentStreak: 7,
      longestStreak: 14,
      lastActiveDate: new Date().toISOString().split("T")[0],
      level: 5,
      xp: 1250,
      xpToNextLevel: 500,
      unlockedAchievements: ["first-call", "call-10", "first-deal", "revenue-10k", "streak-3", "streak-7"],
    };
  }
  return mockUserStats[userId];
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "demo-user";
    
    const stats = getOrCreateUserStats(userId);
    const levelInfo = calculateLevel(stats.xp);
    const dailyGoals = getDailyGoals(stats);
    const achievements = getAchievementsWithProgress(stats);
    
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("[Gamification] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gamification data" },
      { status: 500 }
    );
  }
}

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
    
    const stats = getOrCreateUserStats(userId);
    const today = new Date().toISOString().split("T")[0];
    const isFirstActionToday = stats.lastActiveDate !== today;
    
    // Calculate XP reward
    let xpEarned = typeof XP_REWARDS[action] === "function"
      ? (XP_REWARDS[action] as (n: number) => number)(stats.currentStreak)
      : (XP_REWARDS[action] as number) || 5;
    
    // First action of day bonus
    if (isFirstActionToday) {
      xpEarned += XP_REWARDS.firstActionOfDay;
    }
    
    // Update stats based on action
    switch (action) {
      case "call":
        stats.totalCalls++;
        stats.callsToday++;
        break;
      case "email":
        stats.totalEmails++;
        stats.emailsToday++;
        break;
      case "visit":
        stats.totalVisits++;
        stats.visitsToday++;
        break;
      case "closeDeal":
        stats.totalDeals++;
        stats.dealsToday++;
        if (metadata?.revenue) {
          stats.totalRevenue += metadata.revenue as number;
          stats.revenueToday += metadata.revenue as number;
        }
        break;
    }
    
    // Update streak
    if (isFirstActionToday) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (stats.lastActiveDate === yesterday) {
        stats.currentStreak++;
      } else if (stats.lastActiveDate !== today) {
        stats.currentStreak = 1;
      }
      stats.lastActiveDate = today;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    }
    
    // Add XP
    stats.xp += xpEarned;
    const levelInfo = calculateLevel(stats.xp);
    const leveledUp = levelInfo.level > stats.level;
    stats.level = levelInfo.level;
    stats.xpToNextLevel = levelInfo.xpToNextLevel - levelInfo.xpInLevel;
    
    // Check for new achievements
    const newAchievements: Achievement[] = [];
    ACHIEVEMENTS.forEach((achievement) => {
      if (stats.unlockedAchievements.includes(achievement.id)) return;
      
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
        stats.unlockedAchievements.push(achievement.id);
        stats.xp += achievement.xpReward;
        xpEarned += achievement.xpReward;
        newAchievements.push(achievement);
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        xpEarned,
        totalXP: stats.xp,
        level: levelInfo.level,
        leveledUp,
        newAchievements,
        currentStreak: stats.currentStreak,
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
