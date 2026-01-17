// Gamification System Types

export type AchievementCategory = 
  | "calls" 
  | "deals" 
  | "revenue" 
  | "streak" 
  | "speed" 
  | "volume"
  | "storm"
  | "team";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string; // emoji
  requirement: number;
  xpReward: number;
  unlockedAt?: Date;
}

export interface UserStats {
  // Core metrics
  totalCalls: number;
  totalEmails: number;
  totalVisits: number;
  totalDeals: number;
  totalRevenue: number;
  
  // Today's activity
  callsToday: number;
  emailsToday: number;
  visitsToday: number;
  dealsToday: number;
  revenueToday: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  
  // Gamification
  level: number;
  xp: number;
  xpToNextLevel: number;
  unlockedAchievements: string[];
}

export interface DailyGoal {
  id: string;
  name: string;
  icon: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  change: number; // position change from yesterday
  level: number;
}

export interface CelebrationEvent {
  type: "achievement" | "levelUp" | "streak" | "deal" | "milestone" | "dailyGoal";
  title: string;
  subtitle?: string;
  xpEarned?: number;
  icon?: string;
  tier?: AchievementTier;
}

// XP rewards for actions
export const XP_REWARDS = {
  call: 10,
  email: 5,
  visit: 25,
  qualifyLead: 15,
  scheduleAppointment: 20,
  closeDeal: 100,
  logActivity: 5,
  completePlaybook: 30,
  stormResponse: 50,
  firstActionOfDay: 25,
  streakBonus: (days: number) => Math.min(days * 5, 50),
} as const;

// Level thresholds (XP required for each level)
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  1750,   // Level 6
  2750,   // Level 7
  4000,   // Level 8
  5500,   // Level 9
  7500,   // Level 10
  10000,  // Level 11
  13000,  // Level 12
  16500,  // Level 13
  20500,  // Level 14
  25000,  // Level 15
  30000,  // Level 16
  36000,  // Level 17
  43000,  // Level 18
  51000,  // Level 19
  60000,  // Level 20
];

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Call achievements
  { id: "first-call", name: "First Contact", description: "Make your first call", category: "calls", tier: "bronze", icon: "📞", requirement: 1, xpReward: 25 },
  { id: "call-10", name: "Phone Warrior", description: "Make 10 calls", category: "calls", tier: "bronze", icon: "📱", requirement: 10, xpReward: 50 },
  { id: "call-50", name: "Dial Master", description: "Make 50 calls", category: "calls", tier: "silver", icon: "☎️", requirement: 50, xpReward: 100 },
  { id: "call-100", name: "Call Center Pro", description: "Make 100 calls", category: "calls", tier: "gold", icon: "🎧", requirement: 100, xpReward: 200 },
  { id: "call-500", name: "Legendary Caller", description: "Make 500 calls", category: "calls", tier: "platinum", icon: "💎", requirement: 500, xpReward: 500 },
  
  // Deal achievements
  { id: "first-deal", name: "First Win", description: "Close your first deal", category: "deals", tier: "bronze", icon: "🎉", requirement: 1, xpReward: 50 },
  { id: "deal-5", name: "Closer", description: "Close 5 deals", category: "deals", tier: "silver", icon: "🤝", requirement: 5, xpReward: 150 },
  { id: "deal-25", name: "Deal Machine", description: "Close 25 deals", category: "deals", tier: "gold", icon: "🏆", requirement: 25, xpReward: 400 },
  { id: "deal-100", name: "Sales Legend", description: "Close 100 deals", category: "deals", tier: "platinum", icon: "👑", requirement: 100, xpReward: 1000 },
  
  // Revenue achievements
  { id: "revenue-10k", name: "First $10K", description: "Earn $10,000 in revenue", category: "revenue", tier: "bronze", icon: "💵", requirement: 10000, xpReward: 100 },
  { id: "revenue-50k", name: "High Roller", description: "Earn $50,000 in revenue", category: "revenue", tier: "silver", icon: "💰", requirement: 50000, xpReward: 250 },
  { id: "revenue-100k", name: "Six Figure Club", description: "Earn $100,000 in revenue", category: "revenue", tier: "gold", icon: "🏦", requirement: 100000, xpReward: 500 },
  { id: "revenue-500k", name: "Half Million Hero", description: "Earn $500,000 in revenue", category: "revenue", tier: "platinum", icon: "💎", requirement: 500000, xpReward: 1500 },
  { id: "revenue-1m", name: "Millionaire", description: "Earn $1,000,000 in revenue", category: "revenue", tier: "diamond", icon: "🌟", requirement: 1000000, xpReward: 5000 },
  
  // Streak achievements
  { id: "streak-3", name: "Getting Started", description: "3-day activity streak", category: "streak", tier: "bronze", icon: "🔥", requirement: 3, xpReward: 30 },
  { id: "streak-7", name: "Week Warrior", description: "7-day activity streak", category: "streak", tier: "silver", icon: "⚡", requirement: 7, xpReward: 75 },
  { id: "streak-14", name: "Fortnight Fighter", description: "14-day activity streak", category: "streak", tier: "gold", icon: "🌟", requirement: 14, xpReward: 150 },
  { id: "streak-30", name: "Monthly Master", description: "30-day activity streak", category: "streak", tier: "platinum", icon: "🏅", requirement: 30, xpReward: 400 },
  { id: "streak-100", name: "Unstoppable", description: "100-day activity streak", category: "streak", tier: "diamond", icon: "💫", requirement: 100, xpReward: 2000 },
  
  // Speed achievements
  { id: "speed-first-hour", name: "Early Bird", description: "Log activity before 8 AM", category: "speed", tier: "bronze", icon: "🌅", requirement: 1, xpReward: 25 },
  { id: "speed-10-calls-hour", name: "Speed Demon", description: "Make 10 calls in one hour", category: "speed", tier: "gold", icon: "⚡", requirement: 10, xpReward: 100 },
  { id: "speed-same-day-close", name: "Lightning Close", description: "Close a deal same day as first contact", category: "speed", tier: "platinum", icon: "🌩️", requirement: 1, xpReward: 250 },
  
  // Storm achievements  
  { id: "storm-responder", name: "Storm Chaser", description: "Respond to 5 storm alerts", category: "storm", tier: "silver", icon: "🌪️", requirement: 5, xpReward: 100 },
  { id: "storm-10", name: "Weather Warrior", description: "Convert 10 storm leads", category: "storm", tier: "gold", icon: "⛈️", requirement: 10, xpReward: 300 },
  { id: "storm-master", name: "Storm Master", description: "Convert 50 storm leads", category: "storm", tier: "platinum", icon: "🌀", requirement: 50, xpReward: 750 },
];

// Daily goals templates
export const DAILY_GOALS_TEMPLATES: Omit<DailyGoal, "current" | "completed">[] = [
  { id: "calls-goal", name: "Make Calls", icon: "📞", target: 20, xpReward: 50 },
  { id: "emails-goal", name: "Send Emails", icon: "📧", target: 10, xpReward: 30 },
  { id: "appointments-goal", name: "Schedule Appointments", icon: "📅", target: 3, xpReward: 40 },
  { id: "log-goal", name: "Log Activities", icon: "📝", target: 5, xpReward: 25 },
];

// Tier colors for styling
export const TIER_COLORS: Record<AchievementTier, { bg: string; border: string; text: string; glow: string }> = {
  bronze: { 
    bg: "bg-amber-900/20", 
    border: "border-amber-600/40", 
    text: "text-amber-500",
    glow: "shadow-amber-500/20"
  },
  silver: { 
    bg: "bg-slate-400/20", 
    border: "border-slate-400/40", 
    text: "text-slate-300",
    glow: "shadow-slate-400/20"
  },
  gold: { 
    bg: "bg-yellow-500/20", 
    border: "border-yellow-500/40", 
    text: "text-yellow-400",
    glow: "shadow-yellow-500/30"
  },
  platinum: { 
    bg: "bg-cyan-400/20", 
    border: "border-cyan-400/40", 
    text: "text-cyan-300",
    glow: "shadow-cyan-400/30"
  },
  diamond: { 
    bg: "bg-purple-400/20", 
    border: "border-purple-400/40", 
    text: "text-purple-300",
    glow: "shadow-purple-400/40"
  },
};

// Helper functions
export function calculateLevel(xp: number): { level: number; xpInLevel: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 1.5;
  
  return {
    level,
    xpInLevel: xp - currentLevelXp,
    xpToNextLevel: nextLevelXp - currentLevelXp,
  };
}

export function getAchievementProgress(achievement: Achievement, stats: UserStats): number {
  switch (achievement.category) {
    case "calls":
      return Math.min(100, (stats.totalCalls / achievement.requirement) * 100);
    case "deals":
      return Math.min(100, (stats.totalDeals / achievement.requirement) * 100);
    case "revenue":
      return Math.min(100, (stats.totalRevenue / achievement.requirement) * 100);
    case "streak":
      return Math.min(100, (stats.currentStreak / achievement.requirement) * 100);
    default:
      return 0;
  }
}

export function getLevelTitle(level: number): string {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 7) return "Pro";
  if (level >= 4) return "Skilled";
  if (level >= 2) return "Rookie";
  return "Newcomer";
}
