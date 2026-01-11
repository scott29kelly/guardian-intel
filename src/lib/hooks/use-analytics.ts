import { useQuery } from "@tanstack/react-query";

interface AnalyticsKPIs {
  totalRevenue: number;
  revenueTarget: number;
  revenueGrowth: number;
  totalDeals: number;
  dealsTarget: number;
  avgDealSize: number;
  pipelineValue: number;
  pipelineCount: number;
  atRiskCount: number;
  weatherEvents: number;
  affectedCustomers: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

interface DailyActivity {
  day: string;
  calls: number;
  appointments: number;
  closures: number;
}

interface AtRiskDeal {
  id: string;
  customer: string;
  value: number;
  daysCold: number;
  assignedRep: string;
  stage: string;
}

interface AnalyticsData {
  kpis: AnalyticsKPIs;
  pipelineData: PipelineStage[];
  weeklyActivity: DailyActivity[];
  atRiskDeals: AtRiskDeal[];
}

interface RepStats {
  leadsContacted: number;
  appointmentsSet: number;
  dealsClosed: number;
  revenue: number;
  conversionRate: number;
  avgDealSize: number;
  callsPerDay: number;
  responseTime: string;
}

interface LeaderboardRep {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone: string;
  email: string;
  stats: RepStats;
  trend: "up" | "down" | "stable";
  rank: number;
  coachingNotes: string[];
}

interface LeaderboardData {
  leaderboard: LeaderboardRep[];
  teamTotals: {
    totalRevenue: number;
    totalDeals: number;
    avgConversion: number;
    activeReps: number;
  };
}

interface TrendPoint {
  date: string;
  revenue: number;
  deals: number;
  cumulative: number;
}

interface TrendsData {
  trends: TrendPoint[];
  summary: {
    totalRevenue: number;
    totalDeals: number;
    avgDealSize: number;
  };
}

export function useAnalytics(timeRange: string = "month") {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLeaderboard(timeRange: string = "month") {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/leaderboard?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTrends(period: string = "monthly", months: number = 6) {
  return useQuery<TrendsData>({
    queryKey: ["trends", period, months],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/trends?period=${period}&months=${months}`);
      if (!response.ok) throw new Error("Failed to fetch trends");
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
