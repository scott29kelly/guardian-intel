"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Eye,
  DollarSign,
  MapPin,
  Plus,
  Filter,
  RefreshCw,
  ChevronDown,
  Award,
  Users,
  BarChart3,
  PieChart,
  Clock,
  Loader2,
  X,
  Trophy,
  Skull,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompetitorAnalytics, useCompetitors, useCompetitorActivities, useCreateCompetitor, useLogCompetitorActivity } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import type { PricingTier, ActivityType } from "@/lib/services/competitors/types";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatCurrency = (value: number | null) => {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getTierColor = (tier: PricingTier) => {
  switch (tier) {
    case "budget": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "mid": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "premium": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "luxury": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getThreatColor = (level: string) => {
  switch (level) {
    case "high": return "text-rose-400 bg-rose-500/20";
    case "medium": return "text-amber-400 bg-amber-500/20";
    default: return "text-emerald-400 bg-emerald-500/20";
  }
};

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case "sighting": return Eye;
    case "quote": return DollarSign;
    case "won_deal": return Trophy;
    case "lost_deal": return Skull;
    case "canvassing": return MapPin;
    case "marketing": return Target;
    case "price_intel": return BarChart3;
    default: return Eye;
  }
};

const getActivityLabel = (type: ActivityType) => {
  switch (type) {
    case "sighting": return "Sighting";
    case "quote": return "Quote Intel";
    case "won_deal": return "Won Against";
    case "lost_deal": return "Lost To";
    case "canvassing": return "Canvassing";
    case "marketing": return "Marketing";
    case "price_intel": return "Price Intel";
    default: return type;
  }
};

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CompetitorsPage() {
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState("90d");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case "30d": start.setDate(start.getDate() - 30); break;
      case "90d": start.setDate(start.getDate() - 90); break;
      case "180d": start.setDate(start.getDate() - 180); break;
      case "1y": start.setFullYear(start.getFullYear() - 1); break;
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const dateRange = getDateRange();

  // Fetch data
  const { data: analytics, isLoading: loadingAnalytics, refetch } = useCompetitorAnalytics({
    ...dateRange,
    state: stateFilter || undefined,
  });
  
  const { data: competitorsData, isLoading: loadingCompetitors } = useCompetitors({
    isActive: true,
    sortBy: "name",
    limit: 50,
  });

  const { data: activitiesData, isLoading: loadingActivities } = useCompetitorActivities({
    limit: 10,
    state: stateFilter || undefined,
  });

  const isLoading = loadingAnalytics || loadingCompetitors;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent-primary mx-auto mb-4" />
          <p className="text-text-muted">Loading competitor intelligence...</p>
        </div>
      </div>
    );
  }

  const overview = analytics?.overview;
  const rankings = analytics?.competitorRankings || [];
  const territory = analytics?.territoryBreakdown || [];
  const winLoss = analytics?.winLossAnalysis;
  const pricing = analytics?.pricingAnalysis;
  const recentActivity = analytics?.recentActivity || [];
  const competitors = competitorsData?.data || [];

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
            Competitor Intelligence
          </h1>
          <p className="text-text-muted">
            Track rival activity, analyze market position, and gain competitive advantage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="180d">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            <option value="">All States</option>
            <option value="PA">Pennsylvania</option>
            <option value="NJ">New Jersey</option>
            <option value="DE">Delaware</option>
            <option value="MD">Maryland</option>
            <option value="VA">Virginia</option>
            <option value="NY">New York</option>
          </select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowLogModal(true)}>
            <Eye className="w-4 h-4" />
            Log Activity
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{overview?.totalCompetitors || 0}</p>
                <p className="text-xs text-text-muted">Tracked Competitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{overview?.activeCompetitors || 0}</p>
                <p className="text-xs text-text-muted">Active (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${(overview?.winRate || 0) >= 50 ? "border-emerald-500/30" : "border-rose-500/30"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (overview?.winRate || 0) >= 50 ? "bg-emerald-500/20" : "bg-rose-500/20"
              }`}>
                {(overview?.winRate || 0) >= 50 
                  ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                  : <TrendingDown className="w-5 h-5 text-rose-400" />
                }
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  (overview?.winRate || 0) >= 50 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {overview?.winRate || 0}%
                </p>
                <p className="text-xs text-text-muted">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {formatCurrency(overview?.avgCompetitorPrice || null)}
                </p>
                <p className="text-xs text-text-muted">Avg Competitor Price</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-rose-400 truncate">
                  {overview?.biggestThreat || "None"}
                </p>
                <p className="text-xs text-text-muted">Biggest Threat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Competitor Rankings */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-primary" />
              Competitor Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-text-muted">Competitor</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-text-muted">Tier</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-text-muted">Activity</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-text-muted">Win Rate</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-text-muted">Avg Quote</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-text-muted">Threat</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.slice(0, 8).map((comp, index) => (
                    <tr 
                      key={comp.id} 
                      className="border-b border-border/50 hover:bg-surface-secondary/30 cursor-pointer"
                      onClick={() => setSelectedCompetitor(comp.id)}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted text-xs w-5">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-text-primary">{comp.displayName || comp.name}</p>
                            <p className="text-xs text-text-muted">
                              Last seen: {comp.lastSeen 
                                ? new Date(comp.lastSeen).toLocaleDateString() 
                                : "Never"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={getTierColor(comp.pricingTier)}>
                          {comp.pricingTier}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-text-primary font-medium">{comp.activityCount}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-medium ${
                          comp.winRate >= 50 ? "text-emerald-400" : 
                          comp.winRate > 0 ? "text-rose-400" : "text-text-muted"
                        }`}>
                          {comp.winRate > 0 ? `${comp.winRate}%` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-text-secondary">
                          {formatCurrency(comp.avgQuotedPrice)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getThreatColor(comp.threatLevel)}`}>
                          {comp.threatLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rankings.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No competitor activity recorded yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Territory Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent-primary" />
              Territory Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {territory.map((t) => (
                <div key={t.state} className="p-3 bg-surface-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">{t.state}</span>
                    <span className="text-sm text-text-muted">{t.totalActivities} activities</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      Top: <span className="text-text-secondary">{t.topCompetitor || "—"}</span>
                    </span>
                    <span className={`font-medium ${t.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.winRate}% win
                    </span>
                  </div>
                </div>
              ))}
              {territory.length === 0 && (
                <div className="text-center py-6 text-text-muted">
                  <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No territory data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Win/Loss and Pricing Analysis */}
      <div className="grid grid-cols-2 gap-6">
        {/* Win/Loss Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-accent-primary" />
              Win/Loss Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-surface-secondary/30 rounded-lg">
                <p className="text-2xl font-bold text-text-primary">{winLoss?.totalDeals || 0}</p>
                <p className="text-xs text-text-muted">Total Deals</p>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{winLoss?.wonDeals || 0}</p>
                <p className="text-xs text-text-muted">Won</p>
              </div>
              <div className="text-center p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <p className="text-2xl font-bold text-rose-400">{winLoss?.lostDeals || 0}</p>
                <p className="text-xs text-text-muted">Lost</p>
              </div>
            </div>

            {/* Top Loss Reasons */}
            {winLoss?.topLossReasons && winLoss.topLossReasons.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-text-muted mb-2">Why We Lose</h4>
                <div className="space-y-2">
                  {winLoss.topLossReasons.slice(0, 3).map((reason, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{reason.reason}</span>
                      <span className="text-rose-400">{reason.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Win Reasons */}
            {winLoss?.topWinReasons && winLoss.topWinReasons.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-text-muted mb-2">Why We Win</h4>
                <div className="space-y-2">
                  {winLoss.topWinReasons.slice(0, 3).map((reason, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{reason.reason}</span>
                      <span className="text-emerald-400">{reason.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent-primary" />
              Pricing Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-surface-secondary/30 rounded-lg">
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(pricing?.avgOurPrice || null)}
                </p>
                <p className="text-xs text-text-muted">Our Average</p>
              </div>
              <div className="p-3 bg-surface-secondary/30 rounded-lg">
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(pricing?.avgCompetitorPrice || null)}
                </p>
                <p className="text-xs text-text-muted">Competitor Average</p>
              </div>
            </div>

            {pricing?.priceGapPercent !== null && (
              <div className={`p-3 rounded-lg border ${
                (pricing?.priceGapPercent || 0) > 0 
                  ? "bg-amber-500/10 border-amber-500/20" 
                  : "bg-emerald-500/10 border-emerald-500/20"
              }`}>
                <p className={`text-lg font-medium ${
                  (pricing?.priceGapPercent || 0) > 0 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {(pricing?.priceGapPercent || 0) > 0 ? "+" : ""}{pricing?.priceGapPercent}% 
                  <span className="text-sm font-normal text-text-muted ml-2">
                    {(pricing?.priceGapPercent || 0) > 0 ? "above" : "below"} competitors
                  </span>
                </p>
              </div>
            )}

            {/* By Tier */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-text-muted mb-2">By Competitor Tier</h4>
              <div className="space-y-2">
                {pricing?.byTier?.filter(t => t.quoteCount > 0).map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className={getTierColor(tier.tier)}>{tier.tier}</Badge>
                      <span className="text-text-muted">({tier.quoteCount} quotes)</span>
                    </div>
                    <span className="text-text-secondary font-medium">
                      {formatCurrency(tier.avgPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-primary" />
              Recent Activity
            </CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.activityType);
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-surface-secondary/30 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.activityType === "won_deal" ? "bg-emerald-500/20" :
                    activity.activityType === "lost_deal" ? "bg-rose-500/20" :
                    "bg-accent-primary/20"
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      activity.activityType === "won_deal" ? "text-emerald-400" :
                      activity.activityType === "lost_deal" ? "text-rose-400" :
                      "text-accent-primary"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{activity.competitorName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getActivityLabel(activity.activityType)}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {activity.description || `${activity.city || ""} ${activity.state || ""}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {activity.quotedPrice && (
                      <p className="text-sm font-medium text-text-primary">
                        {formatCurrency(activity.quotedPrice)}
                      </p>
                    )}
                    <p className="text-xs text-text-muted">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activity recorded yet</p>
                <p className="text-sm">Start logging competitor sightings and intel</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Competitor Modal */}
      <AddCompetitorModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      {/* Log Activity Modal */}
      <LogActivityModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        competitors={competitors}
      />
    </motion.div>
  );
}

// =============================================================================
// ADD COMPETITOR MODAL
// =============================================================================

function AddCompetitorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const createCompetitor = useCreateCompetitor();
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    website: "",
    headquarters: "",
    pricingTier: "mid" as PricingTier,
    strengths: "",
    weaknesses: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast("error", "Name Required", "Please enter the competitor name");
      return;
    }

    try {
      await createCompetitor.mutateAsync(formData);
      showToast("success", "Competitor Added", `${formData.name} has been added`);
      onClose();
      setFormData({ name: "", displayName: "", website: "", headquarters: "", pricingTier: "mid", strengths: "", weaknesses: "" });
    } catch (err) {
      showToast("error", "Failed", err instanceof Error ? err.message : "Could not add competitor");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-surface-primary border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold text-lg text-text-primary">Add Competitor</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  placeholder="Acme Roofing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(d => ({ ...d, displayName: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  placeholder="Acme"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData(d => ({ ...d, website: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  placeholder="https://acmeroofing.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Pricing Tier</label>
                <select
                  value={formData.pricingTier}
                  onChange={(e) => setFormData(d => ({ ...d, pricingTier: e.target.value as PricingTier }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="budget">Budget</option>
                  <option value="mid">Mid-Range</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Headquarters</label>
              <input
                type="text"
                value={formData.headquarters}
                onChange={(e) => setFormData(d => ({ ...d, headquarters: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                placeholder="Philadelphia, PA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Known Strengths</label>
                <textarea
                  value={formData.strengths}
                  onChange={(e) => setFormData(d => ({ ...d, strengths: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary h-20"
                  placeholder="Fast turnaround, low prices..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Known Weaknesses</label>
                <textarea
                  value={formData.weaknesses}
                  onChange={(e) => setFormData(d => ({ ...d, weaknesses: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary h-20"
                  placeholder="Poor reviews, warranty issues..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createCompetitor.isPending}>
                {createCompetitor.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Add Competitor
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// LOG ACTIVITY MODAL
// =============================================================================

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: Array<{ id: string; name: string; displayName: string | null }>;
}

function LogActivityModal({ isOpen, onClose, competitors }: LogActivityModalProps) {
  const { showToast } = useToast();
  const logActivity = useLogCompetitorActivity();
  const [formData, setFormData] = useState({
    competitorId: "",
    activityType: "sighting" as ActivityType,
    city: "",
    state: "PA",
    description: "",
    quotedPrice: "",
    priceComparison: "" as "" | "lower" | "similar" | "higher",
    outcomeReason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.competitorId) {
      showToast("error", "Select Competitor", "Please select a competitor");
      return;
    }

    try {
      await logActivity.mutateAsync({
        competitorId: formData.competitorId,
        activityType: formData.activityType,
        city: formData.city || undefined,
        state: formData.state || undefined,
        description: formData.description || undefined,
        quotedPrice: formData.quotedPrice ? parseFloat(formData.quotedPrice) : undefined,
        priceComparison: formData.priceComparison || undefined,
        outcomeReason: formData.outcomeReason || undefined,
      });
      showToast("success", "Activity Logged", "Competitor activity has been recorded");
      onClose();
      setFormData({ competitorId: "", activityType: "sighting", city: "", state: "PA", description: "", quotedPrice: "", priceComparison: "", outcomeReason: "" });
    } catch (err) {
      showToast("error", "Failed", err instanceof Error ? err.message : "Could not log activity");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-surface-primary border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold text-lg text-text-primary">Log Competitor Activity</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Competitor *</label>
                <select
                  value={formData.competitorId}
                  onChange={(e) => setFormData(d => ({ ...d, competitorId: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="">Select competitor...</option>
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Activity Type *</label>
                <select
                  value={formData.activityType}
                  onChange={(e) => setFormData(d => ({ ...d, activityType: e.target.value as ActivityType }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="sighting">Sighting (truck/crew)</option>
                  <option value="quote">Quote Intel</option>
                  <option value="won_deal">Won Deal Against</option>
                  <option value="lost_deal">Lost Deal To</option>
                  <option value="canvassing">Canvassing</option>
                  <option value="marketing">Marketing Material</option>
                  <option value="price_intel">Pricing Intelligence</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(d => ({ ...d, city: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  placeholder="Southampton"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData(d => ({ ...d, state: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="PA">Pennsylvania</option>
                  <option value="NJ">New Jersey</option>
                  <option value="DE">Delaware</option>
                  <option value="MD">Maryland</option>
                  <option value="VA">Virginia</option>
                  <option value="NY">New York</option>
                </select>
              </div>
            </div>
            {(formData.activityType === "quote" || formData.activityType === "price_intel") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Quoted Price</label>
                  <input
                    type="number"
                    value={formData.quotedPrice}
                    onChange={(e) => setFormData(d => ({ ...d, quotedPrice: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                    placeholder="12500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">vs Our Price</label>
                  <select
                    value={formData.priceComparison}
                    onChange={(e) => setFormData(d => ({ ...d, priceComparison: e.target.value as typeof formData.priceComparison }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  >
                    <option value="">Unknown</option>
                    <option value="lower">Lower</option>
                    <option value="similar">Similar</option>
                    <option value="higher">Higher</option>
                  </select>
                </div>
              </div>
            )}
            {(formData.activityType === "won_deal" || formData.activityType === "lost_deal") && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {formData.activityType === "won_deal" ? "Why We Won" : "Why We Lost"}
                </label>
                <select
                  value={formData.outcomeReason}
                  onChange={(e) => setFormData(d => ({ ...d, outcomeReason: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="">Select reason...</option>
                  <option value="Price">Price</option>
                  <option value="Quality/Materials">Quality/Materials</option>
                  <option value="Reputation/Reviews">Reputation/Reviews</option>
                  <option value="Response Time">Response Time</option>
                  <option value="Warranty">Warranty</option>
                  <option value="Insurance Expertise">Insurance Expertise</option>
                  <option value="Personal Connection">Personal Connection</option>
                  <option value="Availability/Timing">Availability/Timing</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(d => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary h-20"
                placeholder="Any additional details..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={logActivity.isPending}>
                {logActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Log Activity
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
