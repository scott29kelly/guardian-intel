"use client";

import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { Achievement, TIER_COLORS, getAchievementProgress } from "@/lib/gamification/types";
import type { UserStats } from "@/lib/gamification/types";

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  stats?: UserStats;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  onClick?: () => void;
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  stats,
  size = "md",
  showProgress = true,
  onClick,
}: AchievementBadgeProps) {
  const tierColors = TIER_COLORS[achievement.tier];
  const progress = stats ? getAchievementProgress(achievement, stats) : 0;
  
  const sizeClasses = {
    sm: { container: "w-12 h-12", icon: "text-xl", text: "text-[10px]" },
    md: { container: "w-16 h-16", icon: "text-2xl", text: "text-xs" },
    lg: { container: "w-24 h-24", icon: "text-4xl", text: "text-sm" },
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-1.5 cursor-pointer group
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {/* Badge */}
      <div
        className={`
          ${sizeClasses[size].container}
          rounded-xl flex items-center justify-center relative overflow-hidden
          ${isUnlocked 
            ? `${tierColors.bg} ${tierColors.border} border-2 shadow-lg ${tierColors.glow}` 
            : "bg-surface-secondary/50 border border-border/50"
          }
          transition-all duration-300
          ${isUnlocked ? "group-hover:shadow-xl" : ""}
        `}
      >
        {/* Icon or Lock */}
        {isUnlocked ? (
          <motion.span
            className={sizeClasses[size].icon}
            initial={false}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {achievement.icon}
          </motion.span>
        ) : (
          <Lock className={`w-5 h-5 text-text-muted/50`} />
        )}
        
        {/* Progress ring for locked achievements */}
        {!isUnlocked && showProgress && progress > 0 && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-border"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={tierColors.text}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                strokeDasharray: "289.03",
                strokeDashoffset: 0,
              }}
            />
          </svg>
        )}
        
        {/* Unlocked checkmark */}
        {isUnlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
              bg-accent-success text-white shadow-lg
            `}
          >
            <Check className="w-3 h-3" />
          </motion.div>
        )}
      </div>
      
      {/* Label */}
      <div className="text-center">
        <p className={`font-medium ${sizeClasses[size].text} ${isUnlocked ? "text-text-primary" : "text-text-muted"}`}>
          {achievement.name}
        </p>
        {size !== "sm" && (
          <p className="text-[10px] text-text-muted">
            {isUnlocked ? `+${achievement.xpReward} XP` : `${Math.round(progress)}%`}
          </p>
        )}
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className={`
          px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl
          ${isUnlocked ? `${tierColors.bg} ${tierColors.border} border` : "bg-surface-primary border border-border"}
        `}>
          <p className={`font-medium ${isUnlocked ? tierColors.text : "text-text-primary"}`}>
            {achievement.name}
          </p>
          <p className="text-text-muted">{achievement.description}</p>
          {!isUnlocked && (
            <p className="text-accent-primary mt-1">
              {Math.round(progress)}% complete
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Achievement showcase row
export function AchievementRow({
  achievements,
  unlockedIds,
  stats,
  maxVisible = 5,
}: {
  achievements: Achievement[];
  unlockedIds: string[];
  stats: UserStats;
  maxVisible?: number;
}) {
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedIds.includes(a.id);
    const bUnlocked = unlockedIds.includes(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return getAchievementProgress(b, stats) - getAchievementProgress(a, stats);
  });

  const visible = sortedAchievements.slice(0, maxVisible);
  const hidden = sortedAchievements.length - maxVisible;

  return (
    <div className="flex items-center gap-3">
      {visible.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          isUnlocked={unlockedIds.includes(achievement.id)}
          stats={stats}
          size="sm"
        />
      ))}
      
      {hidden > 0 && (
        <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-border flex items-center justify-center">
          <span className="text-sm font-medium text-text-muted">
            +{hidden}
          </span>
        </div>
      )}
    </div>
  );
}

// Full achievements grid
export function AchievementsGrid({
  achievements,
  unlockedIds,
  stats,
  onAchievementClick,
}: {
  achievements: Achievement[];
  unlockedIds: string[];
  stats: UserStats;
  onAchievementClick?: (achievement: Achievement) => void;
}) {
  // Group by category
  const grouped = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryLabels: Record<string, string> = {
    calls: "📞 Calls",
    deals: "🤝 Deals",
    revenue: "💰 Revenue",
    streak: "🔥 Streaks",
    speed: "⚡ Speed",
    storm: "🌪️ Storm Response",
    team: "👥 Team",
    volume: "📊 Volume",
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryAchievements]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {categoryAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                isUnlocked={unlockedIds.includes(achievement.id)}
                stats={stats}
                size="md"
                onClick={() => onAchievementClick?.(achievement)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
