"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Trophy, Medal, Award, Crown } from "lucide-react";
import { LeaderboardEntry } from "@/lib/gamification/types";
import { AnimatedCounter } from "./animated-counter";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  title?: string;
  metric?: string;
  compact?: boolean;
}

// Mock leaderboard data
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "1", name: "Marcus Johnson", score: 127500, change: 0, level: 12 },
  { rank: 2, userId: "2", name: "Sarah Mitchell", score: 98200, change: 1, level: 10 },
  { rank: 3, userId: "3", name: "James Wilson", score: 87650, change: -1, level: 9 },
  { rank: 4, userId: "4", name: "Emily Chen", score: 76400, change: 2, level: 8 },
  { rank: 5, userId: "5", name: "David Park", score: 65200, change: 0, level: 7 },
  { rank: 6, userId: "current", name: "You", score: 54800, change: 1, level: 5 },
  { rank: 7, userId: "7", name: "Lisa Rodriguez", score: 48900, change: -2, level: 6 },
  { rank: 8, userId: "8", name: "Mike Thompson", score: 42100, change: 0, level: 5 },
];

export function Leaderboard({
  entries = MOCK_LEADERBOARD,
  currentUserId = "current",
  title = "Team Leaderboard",
  metric = "Revenue",
  compact = false,
}: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-accent-success">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs">{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-accent-danger">
          <TrendingDown className="w-3 h-3" />
          <span className="text-xs">{Math.abs(change)}</span>
        </div>
      );
    }
    return <Minus className="w-3 h-3 text-text-muted" />;
  };

  if (compact) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Trophy className="w-4 h-4 text-accent-warning" />
          <span className="text-sm font-medium text-text-primary">{title}</span>
        </div>
        <div className="divide-y divide-border">
          {entries.slice(0, 5).map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-3 px-4 py-2.5
                ${entry.userId === currentUserId ? "bg-accent-primary/5" : ""}
              `}
            >
              {/* Rank */}
              <div className="w-6 text-center">
                {getRankIcon(entry.rank) || (
                  <span className="text-sm font-bold text-text-muted">{entry.rank}</span>
                )}
              </div>
              
              {/* Name */}
              <span className={`
                flex-1 text-sm truncate
                ${entry.userId === currentUserId ? "font-semibold text-accent-primary" : "text-text-secondary"}
              `}>
                {entry.name}
              </span>
              
              {/* Score */}
              <span className="text-sm font-medium text-text-primary">
                ${(entry.score / 1000).toFixed(0)}K
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Trophy className="w-4 h-4 text-accent-warning" />
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="ml-auto text-xs text-text-muted">This Month • {metric}</span>
      </div>
      
      {/* Top 3 podium */}
      <div className="p-4 border-b border-border">
        <div className="flex items-end justify-center gap-4">
          {/* 2nd place */}
          {entries[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-lg font-bold text-white mb-2">
                {entries[1].name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="w-20 h-16 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 text-center truncate max-w-20">
                {entries[1].name.split(" ")[0]}
              </p>
              <p className="text-xs font-medium text-text-primary">
                ${(entries[1].score / 1000).toFixed(0)}K
              </p>
            </motion.div>
          )}
          
          {/* 1st place */}
          {entries[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center -mb-4"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-2xl mb-1"
              >
                👑
              </motion.div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xl font-bold text-white mb-2 shadow-lg shadow-yellow-500/30">
                {entries[0].name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="w-24 h-20 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 text-center truncate max-w-24">
                {entries[0].name.split(" ")[0]}
              </p>
              <p className="text-sm font-bold text-accent-success">
                ${(entries[0].score / 1000).toFixed(0)}K
              </p>
            </motion.div>
          )}
          
          {/* 3rd place */}
          {entries[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-lg font-bold text-white mb-2">
                {entries[2].name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="w-20 h-12 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 text-center truncate max-w-20">
                {entries[2].name.split(" ")[0]}
              </p>
              <p className="text-xs font-medium text-text-primary">
                ${(entries[2].score / 1000).toFixed(0)}K
              </p>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Rest of leaderboard */}
      <div className="divide-y divide-border">
        {entries.slice(3).map((entry, index) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className={`
              flex items-center gap-4 px-4 py-3 transition-colors
              ${entry.userId === currentUserId 
                ? "bg-accent-primary/10 border-l-2 border-l-accent-primary" 
                : "hover:bg-surface-hover"
              }
            `}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              <span className={`
                text-lg font-bold
                ${entry.userId === currentUserId ? "text-accent-primary" : "text-text-muted"}
              `}>
                {entry.rank}
              </span>
            </div>
            
            {/* Change indicator */}
            <div className="w-8">
              {getChangeIndicator(entry.change)}
            </div>
            
            {/* Avatar */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              ${entry.userId === currentUserId 
                ? "bg-accent-primary/20 text-accent-primary" 
                : "bg-surface-secondary text-text-secondary"
              }
            `}>
              {entry.name.split(" ").map((n) => n[0]).join("")}
            </div>
            
            {/* Name & Level */}
            <div className="flex-1">
              <p className={`
                text-sm font-medium
                ${entry.userId === currentUserId ? "text-accent-primary" : "text-text-primary"}
              `}>
                {entry.name}
              </p>
              <p className="text-xs text-text-muted">Level {entry.level}</p>
            </div>
            
            {/* Score */}
            <div className="text-right">
              <p className="text-sm font-semibold text-text-primary">
                <AnimatedCounter
                  value={entry.score}
                  duration={800}
                  formatFn={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Mini leaderboard for sidebar
export function MiniLeaderboard({
  entries = MOCK_LEADERBOARD,
  currentUserId = "current",
}: {
  entries?: LeaderboardEntry[];
  currentUserId?: string;
}) {
  const currentUserEntry = entries.find((e) => e.userId === currentUserId);
  const topThree = entries.slice(0, 3);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>Team Rank</span>
        <span>This Month</span>
      </div>
      
      {topThree.map((entry, index) => (
        <motion.div
          key={entry.userId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded-lg
            ${entry.userId === currentUserId ? "bg-accent-primary/10" : ""}
          `}
        >
          <span className="text-sm">
            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
          </span>
          <span className={`
            flex-1 text-xs truncate
            ${entry.userId === currentUserId ? "text-accent-primary font-medium" : "text-text-secondary"}
          `}>
            {entry.name.split(" ")[0]}
          </span>
          <span className="text-xs font-medium text-text-primary">
            ${(entry.score / 1000).toFixed(0)}K
          </span>
        </motion.div>
      ))}
      
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <>
          <div className="text-center text-text-muted text-xs">⋮</div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent-primary/10"
          >
            <span className="text-sm font-bold text-text-muted">#{currentUserEntry.rank}</span>
            <span className="flex-1 text-xs text-accent-primary font-medium truncate">
              You
            </span>
            <span className="text-xs font-medium text-text-primary">
              ${(currentUserEntry.score / 1000).toFixed(0)}K
            </span>
          </motion.div>
        </>
      )}
    </div>
  );
}
