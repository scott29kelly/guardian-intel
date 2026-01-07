"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Phone,
  Calendar,
  Award,
  Activity,
  Clock,
  ChevronDown,
  Filter,
  Download,
  BarChart2,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { TrendChart } from "@/components/charts/trend-chart";

// Mock data for team members
const teamMembers = [
  {
    id: "1",
    name: "Sarah Mitchell",
    role: "Senior Sales Rep",
    avatar: "SM",
    stats: {
      leadsContacted: 42,
      appointmentsSet: 18,
      dealsClosed: 7,
      revenue: 145000,
      conversionRate: 38.9,
      avgDealSize: 20714,
      callsPerDay: 12.5,
      responseTime: "1.2 hrs",
    },
    trend: "up",
    rank: 1,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Sales Rep",
    avatar: "MJ",
    stats: {
      leadsContacted: 38,
      appointmentsSet: 14,
      dealsClosed: 5,
      revenue: 98500,
      conversionRate: 35.7,
      avgDealSize: 19700,
      callsPerDay: 10.2,
      responseTime: "1.8 hrs",
    },
    trend: "up",
    rank: 2,
  },
  {
    id: "3",
    name: "Jessica Torres",
    role: "Sales Rep",
    avatar: "JT",
    stats: {
      leadsContacted: 35,
      appointmentsSet: 12,
      dealsClosed: 4,
      revenue: 76000,
      conversionRate: 33.3,
      avgDealSize: 19000,
      callsPerDay: 9.8,
      responseTime: "2.1 hrs",
    },
    trend: "stable",
    rank: 3,
  },
  {
    id: "4",
    name: "David Kim",
    role: "Sales Rep",
    avatar: "DK",
    stats: {
      leadsContacted: 30,
      appointmentsSet: 8,
      dealsClosed: 3,
      revenue: 52000,
      conversionRate: 26.7,
      avgDealSize: 17333,
      callsPerDay: 8.5,
      responseTime: "2.8 hrs",
    },
    trend: "down",
    rank: 4,
  },
  {
    id: "5",
    name: "Emily Rodriguez",
    role: "New Rep",
    avatar: "ER",
    stats: {
      leadsContacted: 22,
      appointmentsSet: 6,
      dealsClosed: 2,
      revenue: 38000,
      conversionRate: 27.3,
      avgDealSize: 19000,
      callsPerDay: 7.2,
      responseTime: "3.2 hrs",
    },
    trend: "up",
    rank: 5,
  },
];

// Team-wide KPIs
const teamKPIs = {
  totalRevenue: 409500,
  revenueTarget: 500000,
  revenueGrowth: 23.4,
  totalDeals: 21,
  dealsTarget: 30,
  avgDealSize: 19500,
  teamConversion: 32.8,
  avgResponseTime: "2.2 hrs",
  pipelineValue: 892000,
  atRiskDeals: 4,
};

// Weekly activity data
const weeklyActivity = [
  { day: "Mon", calls: 45, appointments: 12, closures: 2 },
  { day: "Tue", calls: 52, appointments: 15, closures: 4 },
  { day: "Wed", calls: 48, appointments: 10, closures: 3 },
  { day: "Thu", calls: 55, appointments: 18, closures: 5 },
  { day: "Fri", calls: 42, appointments: 8, closures: 2 },
  { day: "Sat", calls: 15, appointments: 5, closures: 3 },
  { day: "Sun", calls: 0, appointments: 0, closures: 0 },
];

// Pipeline stages with values
const pipelineData = [
  { stage: "New Leads", count: 45, value: 675000 },
  { stage: "Contacted", count: 32, value: 480000 },
  { stage: "Qualified", count: 24, value: 360000 },
  { stage: "Proposal", count: 18, value: 270000 },
  { stage: "Negotiation", count: 8, value: 120000 },
  { stage: "Closed", count: 21, value: 409500 },
];

// Recent alerts for managers
const alerts = [
  {
    id: "1",
    type: "warning",
    message: "4 deals at risk of going cold (no contact > 7 days)",
    action: "View Deals",
  },
  {
    id: "2",
    type: "success",
    message: "Sarah Mitchell hit 150% of monthly target",
    action: "View Details",
  },
  {
    id: "3",
    type: "info",
    message: "New storm event detected - 23 customers affected",
    action: "View Storm",
  },
  {
    id: "4",
    type: "warning",
    message: "David Kim's response time needs attention (>2.5 hrs)",
    action: "View Metrics",
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <ArrowUp className="w-4 h-4 text-emerald-400" />;
    case "down":
      return <ArrowDown className="w-4 h-4 text-rose-400" />;
    default:
      return <Minus className="w-4 h-4 text-surface-400" />;
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
        <div className="px-2 py-0.5 bg-surface-700/50 text-surface-400 rounded-full text-xs font-medium">
          #{rank}
        </div>
      );
  }
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("this-month");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Manager Dashboard
          </h1>
          <p className="text-surface-400">
            Team performance analytics and sales intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:border-guardian-500/50"
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline">
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
                    className="bg-surface-800/50 text-surface-300 cursor-pointer hover:bg-surface-700"
                  >
                    {alert.message.substring(0, 40)}...
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="text-amber-400">
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue & Target Progress */}
      <div className="grid grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="col-span-2 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-surface-400 text-sm mb-1">Total Revenue</p>
                <p className="text-4xl font-bold text-white mb-2">
                  {formatCurrency(teamKPIs.totalRevenue)}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-emerald-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    +{teamKPIs.revenueGrowth}%
                  </div>
                  <span className="text-surface-500 text-sm">vs last month</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-surface-400 text-sm mb-1">Target</p>
                <p className="text-2xl font-semibold text-white">
                  {formatCurrency(teamKPIs.revenueTarget)}
                </p>
                <div className="mt-3">
                  <div className="w-40 h-2 bg-surface-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                      style={{
                        width: `${(teamKPIs.totalRevenue / teamKPIs.revenueTarget) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-surface-400 mt-1 text-right">
                    {Math.round((teamKPIs.totalRevenue / teamKPIs.revenueTarget) * 100)}% achieved
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-surface-400 text-sm">Pipeline Value</p>
              <BarChart2 className="w-4 h-4 text-guardian-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCurrency(teamKPIs.pipelineValue)}
            </p>
            <p className="text-sm text-surface-400">
              Across 127 opportunities
            </p>
          </CardContent>
        </Card>

        {/* At Risk Deals */}
        <Card className="border-rose-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-surface-400 text-sm">At-Risk Deals</p>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-3xl font-bold text-rose-400 mb-1">
              {teamKPIs.atRiskDeals}
            </p>
            <p className="text-sm text-surface-400">
              {formatCurrency(85000)} value at stake
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-guardian-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-guardian-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{teamKPIs.totalDeals}</p>
                <p className="text-xs text-surface-400">Deals Closed</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-surface-500">
              Target: {teamKPIs.dealsTarget}
              <span className="text-emerald-400">
                ({Math.round((teamKPIs.totalDeals / teamKPIs.dealsTarget) * 100)}%)
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
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(teamKPIs.avgDealSize)}
                </p>
                <p className="text-xs text-surface-400">Avg Deal Size</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              +8% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{teamKPIs.teamConversion}%</p>
                <p className="text-xs text-surface-400">Team Conversion</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              +2.3% vs last month
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
                <p className="text-2xl font-bold text-white">{teamKPIs.avgResponseTime}</p>
                <p className="text-xs text-surface-400">Avg Response</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-rose-400">
              <TrendingDown className="w-3 h-3" />
              +15min vs target
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
                <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
                <p className="text-xs text-surface-400">Active Reps</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-surface-500">
              4 hitting target
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
              <BarChart2 className="w-5 h-5 text-guardian-400" />
              Sales Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineData.map((stage, index) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-surface-300">{stage.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-surface-500">{stage.count} deals</span>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-6 bg-surface-800/50 rounded overflow-hidden">
                    <div
                      className={`h-full rounded flex items-center justify-end pr-2 transition-all ${
                        index === pipelineData.length - 1
                          ? "bg-gradient-to-r from-emerald-600 to-green-500"
                          : "bg-gradient-to-r from-guardian-600 to-guardian-500"
                      }`}
                      style={{
                        width: `${(stage.value / pipelineData[0].value) * 100}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {Math.round((stage.value / pipelineData[0].value) * 100)}%
                      </span>
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
              <LineChart className="w-5 h-5 text-guardian-400" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {weeklyActivity.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5">
                    <div
                      className="w-full bg-guardian-500/80 rounded-t"
                      style={{ height: `${(day.calls / 60) * 120}px` }}
                      title={`${day.calls} calls`}
                    />
                    <div
                      className="w-full bg-emerald-500/80"
                      style={{ height: `${(day.appointments / 20) * 40}px` }}
                      title={`${day.appointments} appointments`}
                    />
                    <div
                      className="w-full bg-violet-500/80 rounded-b"
                      style={{ height: `${(day.closures / 6) * 20}px` }}
                      title={`${day.closures} closures`}
                    />
                  </div>
                  <span className="text-xs text-surface-500">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-surface-700/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-guardian-500/80" />
                <span className="text-xs text-surface-400">Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span className="text-xs text-surface-400">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500/80" />
                <span className="text-xs text-surface-400">Closures</span>
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
              <Award className="w-5 h-5 text-amber-400" />
              Team Leaderboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-surface-800 text-surface-300">
                Ranked by Revenue
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-surface-400">Rep</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-surface-400">Revenue</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Deals</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Conversion</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Avg Deal</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Calls/Day</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Response</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-surface-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-surface-800/50 hover:bg-surface-800/30 ${
                      member.rank === 1 ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      {getRankBadge(member.rank)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-500 to-guardian-600 flex items-center justify-center text-white font-medium text-sm">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-white">{member.name}</p>
                          <p className="text-xs text-surface-400">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="font-semibold text-emerald-400">
                        {formatCurrency(member.stats.revenue)}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-white">{member.stats.dealsClosed}</p>
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
                      <p className="text-surface-300">{formatCurrency(member.stats.avgDealSize)}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-surface-300">{member.stats.callsPerDay}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className={`${
                        parseFloat(member.stats.responseTime) <= 1.5
                          ? "text-emerald-400"
                          : parseFloat(member.stats.responseTime) <= 2.5
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}>
                        {member.stats.responseTime}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getTrendIcon(member.trend)}
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
                <h4 className="font-semibold text-white">Deals Needing Attention</h4>
                <p className="text-xs text-surface-400">Stalled or at-risk opportunities</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">Henderson - 18 days cold</span>
                <Button variant="ghost" size="sm" className="h-7 text-amber-400">
                  Review
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">Walsh - Stalled at Proposal</span>
                <Button variant="ghost" size="sm" className="h-7 text-amber-400">
                  Review
                </Button>
              </div>
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
                <h4 className="font-semibold text-white">Hot Opportunities</h4>
                <p className="text-xs text-surface-400">High-probability closes this week</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">Chen - $22,500 (85%)</span>
                <Button variant="ghost" size="sm" className="h-7 text-emerald-400">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">Martinez - $18,000 (90%)</span>
                <Button variant="ghost" size="sm" className="h-7 text-emerald-400">
                  View
                </Button>
              </div>
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
                <h4 className="font-semibold text-white">Coaching Opportunities</h4>
                <p className="text-xs text-surface-400">Reps who could use support</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">David Kim - Closing rate</span>
                <Button variant="ghost" size="sm" className="h-7 text-violet-400">
                  Coach
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-800/30">
                <span className="text-sm text-surface-300">Emily Rodriguez - New hire</span>
                <Button variant="ghost" size="sm" className="h-7 text-violet-400">
                  Coach
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
