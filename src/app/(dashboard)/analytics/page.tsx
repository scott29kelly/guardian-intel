"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Clock,
  Filter,
  Download,
  BarChart2,
  LineChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Zap,
  AlertTriangle,
  X,
  Phone,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterModal } from "@/components/modals/filter-modal";
import { useToast } from "@/components/ui/toast";
import { useAnalytics, useLeaderboard } from "@/lib/hooks/use-analytics";
import { formatCurrency } from "@/lib/utils";

// PERFORMANCE: formatCurrency now imported from utils with cached Intl.NumberFormat

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <ArrowUp className="w-4 h-4 text-emerald-400" />;
    case "down":
      return <ArrowDown className="w-4 h-4 text-rose-400" />;
    default:
      return <Minus className="w-4 h-4 text-text-muted" />;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
          <Star className="w-3 h-3" />
          #1
        </div>
      );
    case 2:
      return (
        <div className="px-2 py-0.5 bg-slate-400/20 text-slate-300 rounded-full text-xs font-medium">
          #2
        </div>
      );
    case 3:
      return (
        <div className="px-2 py-0.5 bg-orange-700/20 text-orange-400 rounded-full text-xs font-medium">
          #3
        </div>
      );
    default:
      return (
        <div className="px-2 py-0.5 bg-surface-secondary text-text-muted rounded-full text-xs font-medium">
          #{rank}
        </div>
      );
  }
};

// Filter configuration
const analyticsFilterConfig = [
  {
    id: "timeRange",
    label: "Time Range",
    options: [
      { value: "today", label: "Today" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "quarter", label: "This Quarter" },
      { value: "year", label: "This Year" },
    ],
  },
  {
    id: "metric",
    label: "Focus Metric",
    options: [
      { value: "revenue", label: "Revenue" },
      { value: "deals", label: "Deals Closed" },
      { value: "conversion", label: "Conversion Rate" },
      { value: "activity", label: "Activity" },
    ],
  },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState("month");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [selectedRep, setSelectedRep] = useState<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    phone: string;
    email: string;
    stats: {
      dealsClosed: number;
      conversionRate: number;
      callsPerDay: number;
      responseTime: string;
      revenue: number;
    };
    rank: number;
    trend: string;
    coachingNotes: string[];
  } | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Fetch real data
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useAnalytics(timeRange);
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useLeaderboard(timeRange);

  const handleApplyFilters = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
    const filterCount = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0);
    if (filterCount > 0) {
      showToast("success", "Filters Applied", `${filterCount} filter(s) active`);
    }
  };

  const handleExportReport = () => {
    if (!analyticsData || !leaderboardData) return;
    
    const reportDate = new Date().toLocaleDateString();
    const report = `
GUARDIAN INTEL - MANAGER DASHBOARD REPORT
==========================================
Generated: ${reportDate}
Time Range: ${timeRange}

REVENUE SUMMARY
---------------
Total Revenue: ${formatCurrency(analyticsData.kpis.totalRevenue)}
Revenue Target: ${formatCurrency(analyticsData.kpis.revenueTarget)}
Progress: ${Math.round((analyticsData.kpis.totalRevenue / analyticsData.kpis.revenueTarget) * 100)}%
Growth: ${analyticsData.kpis.revenueGrowth > 0 ? '+' : ''}${analyticsData.kpis.revenueGrowth}% vs last period

TEAM PERFORMANCE
----------------
Total Deals Closed: ${analyticsData.kpis.totalDeals}
Avg Deal Size: ${formatCurrency(analyticsData.kpis.avgDealSize)}
Pipeline Value: ${formatCurrency(analyticsData.kpis.pipelineValue)}
At-Risk Deals: ${analyticsData.kpis.atRiskCount}

LEADERBOARD
-----------
${leaderboardData.leaderboard.map(m => `${m.rank}. ${m.name} - ${formatCurrency(m.stats.revenue)} (${m.stats.dealsClosed} deals)`).join("\n")}

PIPELINE BREAKDOWN
------------------
${analyticsData.pipelineData.map(p => `${p.stage}: ${p.count} deals (${formatCurrency(p.value)})`).join("\n")}

AT-RISK DEALS
-------------
${analyticsData.atRiskDeals.map(d => `${d.customer}: ${formatCurrency(d.value)} - ${d.daysCold} days cold (${d.assignedRep})`).join("\n")}

Report generated by Guardian Intel
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-analytics-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast("success", "Report Downloaded", "Analytics report has been saved");
  };

  const handleReviewDeal = (customerName: string) => {
    router.push(`/customers?search=${customerName}`);
  };

  const handleCoachRep = (rep: typeof selectedRep) => {
    setSelectedRep(rep);
    setShowCoachingModal(true);
  };

  const handleCallRep = (phone: string, name: string) => {
    showToast("success", "Calling...", `Dialing ${name} at ${phone}`);
    window.location.href = `tel:${phone}`;
  };

  const handleEmailRep = (email: string, name: string) => {
    showToast("success", "Opening Email", `Composing email to ${name}`);
    window.location.href = `mailto:${email}`;
  };

  const handleScheduleMeeting = (repName: string) => {
    showToast("success", "Meeting Scheduled", `1:1 meeting scheduled with ${repName}`);
  };

  // Loading state
  if (isLoadingAnalytics || isLoadingLeaderboard) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-intel-500 mx-auto mb-4" />
          <p className="text-text-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const kpis = analyticsData?.kpis || {
    totalRevenue: 0,
    revenueTarget: 500000,
    revenueGrowth: 0,
    totalDeals: 0,
    dealsTarget: 30,
    avgDealSize: 0,
    pipelineValue: 0,
    pipelineCount: 0,
    atRiskCount: 0,
  };

  const teamMembers = leaderboardData?.leaderboard || [];
  const pipelineData = analyticsData?.pipelineData || [];
  const weeklyActivity = analyticsData?.weeklyActivity || [];
  const atRiskDeals = analyticsData?.atRiskDeals || [];

  // Create alerts from real data
  const alerts = [
    ...(atRiskDeals.length > 0 ? [{
      id: "at-risk",
      type: "warning",
      message: `${atRiskDeals.length} deals at risk of going cold (no contact > 7 days)`,
      action: "View Deals",
      route: "/customers?filter=at-risk",
    }] : []),
    ...(teamMembers[0] ? [{
      id: "top-performer",
      type: "success",
      message: `${teamMembers[0].name} is the top performer with ${formatCurrency(teamMembers[0].stats.revenue)}`,
      action: "View Details",
      repId: teamMembers[0].id,
    }] : []),
    ...(analyticsData?.kpis.weatherEvents ? [{
      id: "storm",
      type: "info",
      message: `${analyticsData.kpis.weatherEvents} storm events - ${analyticsData.kpis.affectedCustomers} customers affected`,
      action: "View Storm",
      route: "/storms",
    }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Manager Dashboard
          </h1>
          <p className="text-text-muted">
            Team performance analytics and sales intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" onClick={() => setShowFilterModal(true)}>
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-amber-400 font-medium">
                  {alerts.length} items need attention
                </span>
              </div>
              <div className="flex items-center gap-2">
                {alerts.slice(0, 2).map((alert) => (
                  <Badge
                    key={alert.id}
                    className="bg-surface-secondary text-text-secondary cursor-pointer hover:bg-surface-hover"
                    onClick={() => {
                      if (alert.route) router.push(alert.route);
                    }}
                  >
                    {alert.message.substring(0, 40)}...
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => setShowAllAlerts(true)}>
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Alerts Modal */}
      <AnimatePresence>
        {showAllAlerts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllAlerts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-surface-primary border border-border rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  All Alerts ({alerts.length})
                </h2>
                <button onClick={() => setShowAllAlerts(false)} className="p-2 hover:bg-surface-hover rounded">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 bg-surface-secondary/50 rounded-lg border border-border hover:border-accent-primary/50 transition-colors cursor-pointer"
                    onClick={() => { if (alert.route) router.push(alert.route); setShowAllAlerts(false); }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          alert.type === "warning" ? "bg-amber-500" :
                          alert.type === "success" ? "bg-emerald-500" : "bg-sky-500"
                        }`} />
                        <div>
                          <p className="text-sm text-text-primary">{alert.message}</p>
                          <p className="text-xs text-accent-primary mt-1">{alert.action} →</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coaching Modal */}
      <AnimatePresence>
        {showCoachingModal && selectedRep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCoachingModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-surface-primary border border-border rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-primary" />
                  Coaching: {selectedRep.name}
                </h2>
                <button onClick={() => setShowCoachingModal(false)} className="p-2 hover:bg-surface-hover rounded">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Rep Info */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-primary/50 flex items-center justify-center text-xl font-bold text-white">
                    {selectedRep.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-text-primary">{selectedRep.name}</h3>
                    <p className="text-text-muted">{selectedRep.role}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {getRankBadge(selectedRep.rank)}
                      {getTrendIcon(selectedRep.trend)}
                      <span className="text-sm text-text-muted">
                        {formatCurrency(selectedRep.stats.revenue)} revenue
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCallRep(selectedRep.phone, selectedRep.name)}
                      className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEmailRep(selectedRep.email, selectedRep.name)}
                      className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-surface-secondary/50 rounded-lg text-center">
                    <div className="text-xl font-bold text-text-primary">{selectedRep.stats.dealsClosed}</div>
                    <div className="text-xs text-text-muted">Deals Closed</div>
                  </div>
                  <div className="p-3 bg-surface-secondary/50 rounded-lg text-center">
                    <div className="text-xl font-bold text-text-primary">{selectedRep.stats.conversionRate}%</div>
                    <div className="text-xs text-text-muted">Conversion</div>
                  </div>
                  <div className="p-3 bg-surface-secondary/50 rounded-lg text-center">
                    <div className="text-xl font-bold text-text-primary">{selectedRep.stats.callsPerDay}</div>
                    <div className="text-xs text-text-muted">Calls/Day</div>
                  </div>
                  <div className="p-3 bg-surface-secondary/50 rounded-lg text-center">
                    <div className="text-xl font-bold text-text-primary">{selectedRep.stats.responseTime}</div>
                    <div className="text-xs text-text-muted">Response Time</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={() => handleScheduleMeeting(selectedRep.name)} className="flex-1">
                    <Calendar className="w-4 h-4" />
                    Schedule 1:1
                  </Button>
                  <Button variant="outline" onClick={() => router.push(`/customers?rep=${selectedRep.name}`)}>
                    View Their Pipeline
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revenue & Target Progress */}
      <div className="grid grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="col-span-2 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Total Revenue</p>
                <p className="text-4xl font-bold text-text-primary mb-2">
                  {formatCurrency(kpis.totalRevenue)}
                </p>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 text-sm ${kpis.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.revenueGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {kpis.revenueGrowth >= 0 ? '+' : ''}{kpis.revenueGrowth}%
                  </div>
                  <span className="text-text-muted text-sm">vs last period</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-sm mb-1">Target</p>
                <p className="text-2xl font-semibold text-text-primary">
                  {formatCurrency(kpis.revenueTarget)}
                </p>
                <div className="mt-3">
                  <div className="w-40 h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                      style={{
                        width: `${Math.min((kpis.totalRevenue / kpis.revenueTarget) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1 text-right">
                    {Math.round((kpis.totalRevenue / kpis.revenueTarget) * 100)}% achieved
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card className="cursor-pointer hover:border-accent-primary/50 transition-all" onClick={() => router.push("/customers")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-muted text-sm">Pipeline Value</p>
              <BarChart2 className="w-4 h-4 text-accent-primary" />
            </div>
            <p className="text-3xl font-bold text-text-primary mb-1">
              {formatCurrency(kpis.pipelineValue)}
            </p>
            <p className="text-sm text-text-muted">
              Across {kpis.pipelineCount} opportunities
            </p>
          </CardContent>
        </Card>

        {/* At Risk Deals */}
        <Card className="border-rose-500/30 cursor-pointer hover:border-rose-500/50 transition-all" onClick={() => router.push("/customers?filter=at-risk")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-muted text-sm">At-Risk Deals</p>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-3xl font-bold text-rose-400 mb-1">
              {kpis.atRiskCount}
            </p>
            <p className="text-sm text-text-muted">
              {formatCurrency(atRiskDeals.reduce((sum, d) => sum + d.value, 0))} value at stake
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{kpis.totalDeals}</p>
                <p className="text-xs text-text-muted">Deals Closed</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
              Target: {kpis.dealsTarget}
              <span className="text-emerald-400">
                ({Math.round((kpis.totalDeals / kpis.dealsTarget) * 100)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {formatCurrency(kpis.avgDealSize)}
                </p>
                <p className="text-xs text-text-muted">Avg Deal Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {leaderboardData?.teamTotals.avgConversion || 0}%
                </p>
                <p className="text-xs text-text-muted">Team Conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {analyticsData?.kpis.weatherEvents || 0}
                </p>
                <p className="text-xs text-text-muted">Storm Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{teamMembers.length}</p>
                <p className="text-xs text-text-muted">Active Reps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-accent-primary" />
              Sales Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineData.map((stage, index) => (
                <div key={stage.stage} className="cursor-pointer" onClick={() => router.push(`/customers?stage=${stage.stage.toLowerCase()}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-secondary">{stage.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{stage.count} deals</span>
                      <span className="text-sm font-medium text-text-primary">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-6 bg-surface-secondary rounded overflow-hidden">
                    <div
                      className={`h-full rounded flex items-center justify-end pr-2 transition-all hover:opacity-80 ${
                        stage.stage.toLowerCase() === "closed"
                          ? "bg-gradient-to-r from-emerald-600 to-green-500"
                          : "bg-gradient-to-r from-accent-primary to-accent-primary/70"
                      }`}
                      style={{
                        width: `${pipelineData[0]?.value > 0 ? (stage.value / pipelineData[0].value) * 100 : 0}%`,
                      }}
                    >
                      {stage.value > 0 && pipelineData[0]?.value > 0 && (
                        <span className="text-xs text-white font-medium">
                          {Math.round((stage.value / pipelineData[0].value) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="w-5 h-5 text-accent-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {weeklyActivity.map((day) => {
                const maxCalls = Math.max(...weeklyActivity.map(d => d.calls), 1);
                const maxAppts = Math.max(...weeklyActivity.map(d => d.appointments), 1);
                return (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5">
                      <div
                        className="w-full bg-accent-primary/80 rounded-t"
                        style={{ height: `${(day.calls / maxCalls) * 120}px` }}
                        title={`${day.calls} calls`}
                      />
                      <div
                        className="w-full bg-emerald-500/80"
                        style={{ height: `${(day.appointments / maxAppts) * 40}px` }}
                        title={`${day.appointments} appointments`}
                      />
                      <div
                        className="w-full bg-violet-500/80 rounded-b"
                        style={{ height: `${day.closures * 10}px` }}
                        title={`${day.closures} closures`}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{day.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent-primary/80" />
                <span className="text-xs text-text-muted">Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span className="text-xs text-text-muted">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500/80" />
                <span className="text-xs text-text-muted">Closures</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Team Leaderboard
            </CardTitle>
            <Badge className="bg-surface-secondary text-text-secondary">
              Ranked by Revenue
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Rep</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Revenue</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Deals</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Conversion</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Avg Deal</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Calls/Day</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Trend</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-border/50 hover:bg-surface-secondary/30 ${
                      member.rank === 1 ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      {getRankBadge(member.rank)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-primary/50 flex items-center justify-center text-white font-medium text-sm">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{member.name}</p>
                          <p className="text-xs text-text-muted">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="font-semibold text-emerald-400">
                        {formatCurrency(member.stats.revenue)}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-text-primary">{member.stats.dealsClosed}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className={`font-medium ${
                        member.stats.conversionRate >= 35
                          ? "text-emerald-400"
                          : member.stats.conversionRate >= 30
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}>
                        {member.stats.conversionRate}%
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-text-secondary">{formatCurrency(member.stats.avgDealSize)}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-text-secondary">{member.stats.callsPerDay}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getTrendIcon(member.trend)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCoachRep(member)}
                        className="text-accent-primary"
                      >
                        Coach
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Items for Manager */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary">Deals Needing Attention</h4>
                <p className="text-xs text-text-muted">Stalled or at-risk opportunities</p>
              </div>
            </div>
            <div className="space-y-2">
              {atRiskDeals.slice(0, 2).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-2 rounded bg-surface-secondary/30">
                  <div>
                    <span className="text-sm text-text-secondary">{deal.customer}</span>
                    <span className="text-xs text-text-muted ml-2">- {deal.daysCold} days cold</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-amber-400" onClick={() => handleReviewDeal(deal.customer)}>
                    Review
                  </Button>
                </div>
              ))}
              {atRiskDeals.length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">No at-risk deals</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary">Top Performers</h4>
                <p className="text-xs text-text-muted">Leading the team this period</p>
              </div>
            </div>
            <div className="space-y-2">
              {teamMembers.slice(0, 2).map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-2 rounded bg-surface-secondary/30">
                  <span className="text-sm text-text-secondary">{rep.name} - {formatCurrency(rep.stats.revenue)}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-emerald-400" onClick={() => handleCoachRep(rep)}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary">Coaching Opportunities</h4>
                <p className="text-xs text-text-muted">Reps who could use support</p>
              </div>
            </div>
            <div className="space-y-2">
              {teamMembers.filter(r => r.trend === "down").slice(0, 2).map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-2 rounded bg-surface-secondary/30">
                  <span className="text-sm text-text-secondary">{rep.name} - Trending down</span>
                  <Button variant="ghost" size="sm" className="h-7 text-violet-400" onClick={() => handleCoachRep(rep)}>
                    Coach
                  </Button>
                </div>
              ))}
              {teamMembers.filter(r => r.trend === "down").length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">All reps performing well</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Analytics"
        filters={analyticsFilterConfig}
        activeFilters={activeFilters}
        onApply={handleApplyFilters}
      />
    </motion.div>
  );
}
