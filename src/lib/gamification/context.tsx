"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import {
  UserStats,
  Achievement,
  DailyGoal,
  CelebrationEvent,
  ACHIEVEMENTS,
  DAILY_GOALS_TEMPLATES,
  XP_REWARDS,
  calculateLevel,
} from "./types";

interface GamificationContextType {
  // User stats
  stats: UserStats;
  
  // Daily goals
  dailyGoals: DailyGoal[];
  
  // Actions
  addXP: (amount: number, reason?: string) => void;
  recordAction: (action: keyof typeof XP_REWARDS) => void;
  checkAchievements: () => Achievement[];
  updateDailyGoal: (goalId: string, progress: number) => void;
  
  // Celebration queue
  celebrationQueue: CelebrationEvent[];
  dismissCelebration: () => void;
  triggerCelebration: (event: CelebrationEvent) => void;
  
  // Status
  isLoaded: boolean;
}

const defaultStats: UserStats = {
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

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize daily goals
  useEffect(() => {
    const goals = DAILY_GOALS_TEMPLATES.map((template) => ({
      ...template,
      current: template.id === "calls-goal" ? stats.callsToday : 
               template.id === "emails-goal" ? stats.emailsToday :
               template.id === "log-goal" ? Math.min(3, stats.callsToday + stats.emailsToday) : 0,
      completed: false,
    }));
    
    // Mark completed goals
    goals.forEach((goal) => {
      if (goal.current >= goal.target) {
        goal.completed = true;
      }
    });
    
    setDailyGoals(goals);
    setIsLoaded(true);
  }, [stats.callsToday, stats.emailsToday]);

  // Check streak on load
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    if (stats.lastActiveDate !== today && stats.lastActiveDate !== yesterday) {
      // Streak broken
      setStats((prev) => ({ ...prev, currentStreak: 0 }));
    }
  }, [stats.lastActiveDate]);

  const addXP = useCallback((amount: number, reason?: string) => {
    setStats((prev) => {
      const newXP = prev.xp + amount;
      const levelInfo = calculateLevel(newXP);
      
      // Check for level up
      if (levelInfo.level > prev.level) {
        // Queue level up celebration
        setCelebrationQueue((queue) => [
          ...queue,
          {
            type: "levelUp",
            title: `Level ${levelInfo.level}!`,
            subtitle: `You've reached a new level`,
            xpEarned: amount,
            icon: "🎖️",
          },
        ]);
      }
      
      return {
        ...prev,
        xp: newXP,
        level: levelInfo.level,
        xpToNextLevel: levelInfo.xpToNextLevel - levelInfo.xpInLevel,
      };
    });
  }, []);

  const recordAction = useCallback((action: keyof typeof XP_REWARDS) => {
    const today = new Date().toISOString().split("T")[0];
    const xpReward = typeof XP_REWARDS[action] === "function" 
      ? (XP_REWARDS[action] as (n: number) => number)(stats.currentStreak)
      : XP_REWARDS[action];
    
    setStats((prev) => {
      const isFirstActionToday = prev.lastActiveDate !== today;
      const newStats = { ...prev };
      
      // Update totals based on action
      switch (action) {
        case "call":
          newStats.totalCalls++;
          newStats.callsToday++;
          break;
        case "email":
          newStats.totalEmails++;
          newStats.emailsToday++;
          break;
        case "visit":
          newStats.totalVisits++;
          newStats.visitsToday++;
          break;
        case "closeDeal":
          newStats.totalDeals++;
          newStats.dealsToday++;
          break;
      }
      
      // Update streak
      if (isFirstActionToday) {
        newStats.currentStreak++;
        newStats.lastActiveDate = today;
        if (newStats.currentStreak > newStats.longestStreak) {
          newStats.longestStreak = newStats.currentStreak;
        }
      }
      
      return newStats;
    });
    
    // Add XP
    addXP(xpReward, action);
    
    // Add first action bonus
    if (stats.lastActiveDate !== today) {
      addXP(XP_REWARDS.firstActionOfDay, "First action of the day");
    }
  }, [addXP, stats.currentStreak, stats.lastActiveDate]);

  const checkAchievements = useCallback((): Achievement[] => {
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
        newAchievements.push(achievement);
        
        // Queue celebration
        setCelebrationQueue((queue) => [
          ...queue,
          {
            type: "achievement",
            title: achievement.name,
            subtitle: achievement.description,
            xpEarned: achievement.xpReward,
            icon: achievement.icon,
            tier: achievement.tier,
          },
        ]);
        
        // Update stats
        setStats((prev) => ({
          ...prev,
          unlockedAchievements: [...prev.unlockedAchievements, achievement.id],
        }));
        
        // Add XP
        addXP(achievement.xpReward, `Achievement: ${achievement.name}`);
      }
    });
    
    return newAchievements;
  }, [stats, addXP]);

  const updateDailyGoal = useCallback((goalId: string, progress: number) => {
    setDailyGoals((prev) => {
      return prev.map((goal) => {
        if (goal.id !== goalId) return goal;
        
        const newCurrent = goal.current + progress;
        const justCompleted = !goal.completed && newCurrent >= goal.target;
        
        if (justCompleted) {
          // Queue celebration
          setCelebrationQueue((queue) => [
            ...queue,
            {
              type: "dailyGoal",
              title: `${goal.name} Complete!`,
              subtitle: "Daily goal achieved",
              xpEarned: goal.xpReward,
              icon: goal.icon,
            },
          ]);
          
          // Add XP
          addXP(goal.xpReward, `Daily goal: ${goal.name}`);
        }
        
        return {
          ...goal,
          current: newCurrent,
          completed: newCurrent >= goal.target,
        };
      });
    });
  }, [addXP]);

  const dismissCelebration = useCallback(() => {
    setCelebrationQueue((prev) => prev.slice(1));
  }, []);

  const triggerCelebration = useCallback((event: CelebrationEvent) => {
    setCelebrationQueue((prev) => [...prev, event]);
  }, []);

  return (
    <GamificationContext.Provider
      value={{
        stats,
        dailyGoals,
        addXP,
        recordAction,
        checkAchievements,
        updateDailyGoal,
        celebrationQueue,
        dismissCelebration,
        triggerCelebration,
        isLoaded,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}
