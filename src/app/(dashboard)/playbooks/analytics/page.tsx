"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Star,
  Users,
  Target,
  Clock,
  Award,
  ChevronDown,
  Loader2,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface PlaybookAnalytics {
  playbookId: string;
  title: string;
  category: string;
  totalUsages: number;
  completedUsages: number;
  completionRate: number;
  avgDurationSeconds: number | null;
  favoritesCount: number;
  avgRating: number | null;
  totalRatings: number;
  conversionRate: number | null;
  usagesWithCustomers: number;
  closedWonCount: number;
}

interface OverallStats {
  totalPlaybooks: number;
  totalUsages: number;
  avgCompletionRate: number;
  avgConversionRate: number;
  topPerformers: {
    id: string;
    title: string;
    category: string;
    conversionRate: number;
    usages: number;
  }[];
  categoryBreakdown: Record<string, number>;
}

// Fetch overall analytics
async function fetchOverallAnalytics(): Promise<OverallStats> {
  // Fetch all playbooks for aggregation
  const response = await fetch("/api/playbooks?limit=100");
  const data = await response.json();

  if (!data.success) throw new Error("Failed to fetch playbooks");

  const playbooks = data.data;
  const categoryBreakdown: Record<string, number> = {};
  let totalUsages = 0;

  for (const pb of playbooks) {
    categoryBreakdown[pb.category] = (categoryBreakdown[pb.category] || 0) + 1;
    totalUsages += pb.usageCount || 0;
  }

  // Get top performers (by usage and rating)
  const topPerformers = playbooks
    .filter((p: { rating: number | null }) => p.rating && p.rating >= 4)
    .sort((a: { usageCount: number }, b: { usageCount: number }) => b.usageCount - a.usageCount)
    .slice(0, 5)
    .map((p: { id: string; title: string; category: string; rating: number; usageCount: number }) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      conversionRate: 0, // Would need individual analytics
      usages: p.usageCount,
    }));

  return {
    totalPlaybooks: playbooks.length,
    totalUsages,
    avgCompletionRate: 72, // Mock for now
    avgConversionRate: 18, // Mock for now
    topPerformers,
    categoryBreakdown,
  };
}

// Category config
const categoryConfig: Record<string, { label: string; color: string }> = {
  storm: { label: "Storm Response", color: "bg-sky-500" },
  "objection-handling": { label: "Objection Handling", color: "bg-amber-500" },
  closing: { label: "Closing", color: "bg-emerald-500" },
  retention: { label: "Retention", color: "bg-violet-500" },
  "cold-call": { label: "Cold Calling", color: "bg-rose-500" },
  discovery: { label: "Discovery", color: "bg-cyan-500" },
  presentation: { label: "Presentation", color: "bg-indigo-500" },
  "follow-up": { label: "Follow-up", color: "bg-fuchsia-500" },
};

export default function PlaybooksAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["playbook-analytics", timeRange],
    queryFn: fetchOverallAnalytics,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Playbook Analytics
          </h1>
          <p className="text-text-muted">
            Track effectiveness and optimize your sales playbooks
          </p>
        </div>
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="appearance-none px-4 py-2 pr-10 bg-surface-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border-accent-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-accent-primary" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +12%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {stats.totalPlaybooks}
            </div>
            <div className="text-sm text-text-muted">Total Playbooks</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +28%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {stats.totalUsages.toLocaleString()}
            </div>
            <div className="text-sm text-text-muted">Total Uses</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +5%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {stats.avgCompletionRate}%
            </div>
            <div className="text-sm text-text-muted">Completion Rate</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-400 text-xs">
                <ArrowDownRight className="w-3 h-3 mr-1" />
                -2%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {stats.avgConversionRate}%
            </div>
            <div className="text-sm text-text-muted">Conversion Rate</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Top Performers */}
        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Top Performing Playbooks
              </h3>
            </div>
            <div className="space-y-4">
              {stats.topPerformers.length > 0 ? (
                stats.topPerformers.map((playbook, index) => (
                  <div
                    key={playbook.id}
                    className="flex items-center gap-4 p-3 bg-surface-secondary/50 rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-amber-500/20 text-amber-400"
                          : index === 1
                          ? "bg-gray-400/20 text-gray-400"
                          : index === 2
                          ? "bg-amber-700/20 text-amber-600"
                          : "bg-surface-secondary text-text-muted"
                      }`}
                    >
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {playbook.title}
                      </div>
                      <div className="text-xs text-text-muted">
                        {categoryConfig[playbook.category]?.label || playbook.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {playbook.usages} uses
                      </div>
                      <div className="text-xs text-emerald-400">
                        <Star className="w-3 h-3 inline mr-1 fill-current" />
                        Top rated
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-muted">
                  No data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-primary" />
                By Category
              </h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => {
                  const total = Object.values(stats.categoryBreakdown).reduce(
                    (a, b) => a + b,
                    0
                  );
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const config = categoryConfig[category];

                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary">
                          {config?.label || category}
                        </span>
                        <span className="text-text-muted">{count}</span>
                      </div>
                      <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className={`h-full ${config?.color || "bg-accent-primary"} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card className="border-accent-primary/30 bg-accent-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <h4 className="font-medium text-text-primary mb-2">
                Pro Tip: Track Usage with Customers
              </h4>
              <p className="text-sm text-text-muted">
                When using playbooks during customer calls, click "Use with Customer" to link the
                usage. This helps track which playbooks lead to closed deals and improves
                recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
