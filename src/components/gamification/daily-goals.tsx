"use client";

import { motion } from "framer-motion";
import { Check, Zap, Target } from "lucide-react";
import { DailyGoal } from "@/lib/gamification/types";
import { AnimatedCounter } from "./animated-counter";

interface DailyGoalsWidgetProps {
  goals: DailyGoal[];
  compact?: boolean;
}

export function DailyGoalsWidget({ goals, compact = false }: DailyGoalsWidgetProps) {
  const completedCount = goals.filter((g) => g.completed).length;
  const totalXP = goals.reduce((sum, g) => sum + (g.completed ? g.xpReward : 0), 0);
  const potentialXP = goals.reduce((sum, g) => sum + g.xpReward, 0);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {goals.map((goal, index) => (
          <DailyGoalPill key={goal.id} goal={goal} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Target className="w-4 h-4 text-accent-primary" />
        <span className="text-sm font-medium text-text-primary">Daily Goals</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {completedCount}/{goals.length}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-primary/10 rounded text-accent-primary">
            <Zap className="w-3 h-3" />
            <span className="text-xs font-medium">{totalXP}/{potentialXP} XP</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {goals.map((goal, index) => (
          <DailyGoalItem key={goal.id} goal={goal} index={index} />
        ))}
      </div>
    </div>
  );
}

function DailyGoalItem({ goal, index }: { goal: DailyGoal; index: number }) {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative p-3 rounded-lg border transition-all
        ${goal.completed 
          ? "bg-accent-success/5 border-accent-success/30" 
          : "bg-surface-secondary/50 border-border hover:border-border-hover"
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-xl
          ${goal.completed ? "bg-accent-success/20" : "bg-surface-secondary"}
        `}>
          {goal.completed ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Check className="w-5 h-5 text-accent-success" />
            </motion.div>
          ) : (
            goal.icon
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-sm font-medium ${goal.completed ? "text-accent-success" : "text-text-primary"}`}>
              {goal.name}
            </span>
            <span className="text-xs text-text-muted">
              <AnimatedCounter value={goal.current} duration={300} />
              <span className="mx-0.5">/</span>
              {goal.target}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                goal.completed 
                  ? "bg-accent-success" 
                  : "bg-gradient-to-r from-accent-primary to-accent-secondary"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        
        {/* XP reward */}
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs
          ${goal.completed 
            ? "bg-accent-success/20 text-accent-success" 
            : "bg-surface-secondary text-text-muted"
          }
        `}>
          <Zap className="w-3 h-3" />
          {goal.xpReward}
        </div>
      </div>
    </motion.div>
  );
}

function DailyGoalPill({ goal, index }: { goal: DailyGoal; index: number }) {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-full border
        ${goal.completed 
          ? "bg-accent-success/10 border-accent-success/30" 
          : "bg-surface-secondary border-border"
        }
      `}
      title={`${goal.name}: ${goal.current}/${goal.target}`}
    >
      {goal.completed ? (
        <Check className="w-3.5 h-3.5 text-accent-success" />
      ) : (
        <span className="text-sm">{goal.icon}</span>
      )}
      
      <span className={`text-xs font-medium ${goal.completed ? "text-accent-success" : "text-text-secondary"}`}>
        {goal.current}/{goal.target}
      </span>
      
      {/* Mini progress indicator */}
      {!goal.completed && (
        <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-surface-hover rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

// Header stats bar with all daily progress
export function DailyProgressBar({ goals }: { goals: DailyGoal[] }) {
  const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.current, g.target), 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const percentage = Math.round((totalProgress / totalTarget) * 100);
  const completedCount = goals.filter((g) => g.completed).length;
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Today</span>
        <div className="flex items-center gap-1">
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              className={`
                w-6 h-6 rounded-md flex items-center justify-center text-xs
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
      
      <div className="flex-1 max-w-32">
        <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-success"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
      
      <span className="text-sm font-medium text-text-primary">
        {completedCount}/{goals.length} <span className="text-text-muted">goals</span>
      </span>
    </div>
  );
}
