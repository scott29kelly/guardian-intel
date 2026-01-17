"use client";

import { motion } from "framer-motion";
import { Zap, Trophy, Target, ChevronRight } from "lucide-react";
import { useGamification } from "@/lib/gamification/context";
import { getLevelTitle } from "@/lib/gamification/types";
import { AnimatedCounter, StreakCounter } from "./animated-counter";

interface SidebarWidgetProps {
  isCollapsed?: boolean;
  onOpenAchievements?: () => void;
}

export function SidebarEngagementWidget({ isCollapsed = false, onOpenAchievements }: SidebarWidgetProps) {
  const { stats, dailyGoals, isLoaded } = useGamification();
  
  if (!isLoaded) return null;

  const levelProgress = ((stats.xp % 1000) / 1000) * 100; // Simplified
  const completedGoals = dailyGoals.filter((g) => g.completed).length;

  if (isCollapsed) {
    // Compact vertical layout for collapsed sidebar
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        {/* Streak indicator */}
        <motion.div
          className="relative w-10 h-10 rounded-lg bg-surface-secondary border border-border flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          title={`${stats.currentStreak} day streak`}
        >
          <span className="text-lg">🔥</span>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-primary text-[10px] font-bold flex items-center justify-center text-white">
            {stats.currentStreak}
          </span>
        </motion.div>
        
        {/* Level indicator */}
        <motion.div
          className="relative w-10 h-10 rounded-lg bg-surface-secondary border border-border flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          title={`Level ${stats.level} - ${getLevelTitle(stats.level)}`}
        >
          <span className="text-sm font-bold text-accent-primary">{stats.level}</span>
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-accent-primary"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: levelProgress / 100 }}
              style={{ strokeDasharray: "113.1", strokeDashoffset: 0 }}
            />
          </svg>
        </motion.div>
        
        {/* Daily goals indicator */}
        <motion.div
          className="relative w-10 h-10 rounded-lg bg-surface-secondary border border-border flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          title={`${completedGoals}/${dailyGoals.length} daily goals`}
        >
          <Target className="w-4 h-4 text-text-muted" />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-success text-[10px] font-bold flex items-center justify-center text-white">
            {completedGoals}
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Level & XP */}
      <div className="px-3 py-2.5 bg-surface-secondary/50 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-accent-primary">{stats.level}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-primary">
                {getLevelTitle(stats.level)}
              </p>
              <p className="text-[10px] text-text-muted">
                Level {stats.level}
              </p>
            </div>
          </div>
          <StreakCounter streak={stats.currentStreak} className="scale-75 origin-right" />
        </div>
        
        {/* XP Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">Next Level</span>
            <span className="text-accent-primary font-medium">
              <AnimatedCounter value={stats.xpToNextLevel} duration={300} /> XP
            </span>
          </div>
          <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${100 - (stats.xpToNextLevel / (stats.xp + stats.xpToNextLevel)) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </div>
      
      {/* Daily Goals Summary */}
      <div className="px-3 py-2 bg-surface-secondary/50 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Today's Goals</span>
          <div className="flex items-center gap-1">
            {dailyGoals.slice(0, 4).map((goal) => (
              <motion.div
                key={goal.id}
                className={`
                  w-5 h-5 rounded flex items-center justify-center text-[10px]
                  ${goal.completed 
                    ? "bg-accent-success/20 text-accent-success" 
                    : "bg-surface-secondary text-text-muted"
                  }
                `}
                whileHover={{ scale: 1.1 }}
                title={`${goal.name}: ${goal.current}/${goal.target}`}
              >
                {goal.completed ? "✓" : goal.icon}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Achievements Button */}
      <button
        onClick={onOpenAchievements}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary/50 rounded-lg border border-border hover:bg-surface-hover hover:border-border-hover transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-text-secondary group-hover:text-text-primary">
            Achievements
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-text-primary">
            {stats.unlockedAchievements.length}
          </span>
          <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-text-primary transition-colors" />
        </div>
      </button>
    </div>
  );
}

// Quick stats bar for header
export function QuickStatsBar() {
  const { stats, dailyGoals, isLoaded } = useGamification();
  
  if (!isLoaded) return null;
  
  const completedGoals = dailyGoals.filter((g) => g.completed).length;

  return (
    <div className="flex items-center gap-4">
      {/* Streak */}
      <motion.div 
        className="flex items-center gap-1.5"
        whileHover={{ scale: 1.05 }}
      >
        <span className="text-base">🔥</span>
        <span className="text-sm font-semibold text-text-primary">{stats.currentStreak}</span>
      </motion.div>
      
      {/* Level */}
      <motion.div 
        className="flex items-center gap-1.5"
        whileHover={{ scale: 1.05 }}
      >
        <Zap className="w-4 h-4 text-accent-primary" />
        <span className="text-sm font-semibold text-text-primary">Lv.{stats.level}</span>
      </motion.div>
      
      {/* Daily Progress */}
      <div className="flex items-center gap-1.5">
        <Target className="w-4 h-4 text-accent-success" />
        <span className="text-sm font-semibold text-text-primary">
          {completedGoals}/{dailyGoals.length}
        </span>
      </div>
    </div>
  );
}
