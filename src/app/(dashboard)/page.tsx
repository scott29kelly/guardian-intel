"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Activity,
  Radio,
  Zap,
  Phone,
  ArrowUpRight,
  X,
  Loader2,
  Trophy,
  Target,
} from "lucide-react";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { useDashboard } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { useGamification } from "@/lib/gamification";
import { useShouldAnimate } from "@/lib/preferences";
import { DailyGoalsWidget, DailyProgressBar } from "@/components/gamification/daily-goals";
import { MiniLeaderboard } from "@/components/gamification/leaderboard";
import { AnimatedCounter, StreakCounter } from "@/components/gamification/animated-counter";
import { ConfettiBurst } from "@/components/gamification/confetti";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues
const WeatherRadarMap = dynamic(
  () => import("@/components/maps/weather-radar-map").then(mod => mod.WeatherRadarMap),
  { 
    ssr: false,
    loading: () => (
      <div className="aspect-square bg-surface-secondary rounded-lg flex items-center justify-center border border-border">
        <div className="flex items-center gap-2 text-text-muted">
          <CloudLightning className="w-4 h-4 animate-pulse" />
          <span className="text-xs">Loading...</span>
        </div>
      </div>
    )
  }
);

// Default metrics while loading
const defaultMetrics = {
  revenue: { value: 0, change: 0, target: 500000 },
  pipeline: { value: 0, deals: 0 },
  stormOpportunity: { value: 0, affected: 0 },
  activeAlerts: 0,
  hotLeads: 0,
};

const defaultAlerts = [
  { id: "1", type: "storm", message: "Loading alerts...", time: "", severity: "warning" as const },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, isLoading, error } = useDashboard();
  const { stats, dailyGoals, recordAction, updateDailyGoal, triggerCelebration } = useGamification();
  const { shouldShowLeaderboard, shouldShowXP, shouldShowConfetti } = useShouldAnimate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlert, setActiveAlert] = useState(0);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showStormWatch, setShowStormWatch] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState<{ x: number; y: number } | null>(null);

  // Use real data or defaults while loading
  const liveMetrics = data?.metrics || defaultMetrics;
  const recentAlerts = data?.alerts?.length ? data.alerts : defaultAlerts;
  const priorityCustomers = data?.priorityCustomers || [];
  const intelItems = data?.intelItems || [];
  const weatherEvents = data?.weatherEvents || [];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      setActiveAlert((prev) => (prev + 1) % (recentAlerts.length || 1));
    }, 5000);
    return () => clearInterval(alertTimer);
  }, [recentAlerts.length]);

  const handleStormCanvass = (e: React.MouseEvent) => {
    // Record activity for gamification
    recordAction("stormResponse");
    updateDailyGoal("log-goal", 1);
    
    // Show XP toast (respects preferences via the toast system)
    if (shouldShowXP) {
      showToast("xp", "+50 XP", "Storm response initiated!", { xp: 50 });
    }
    
    // Burst effect at button position (respects preferences)
    if (shouldShowConfetti) {
      setConfettiBurst({ x: e.clientX, y: e.clientY });
    }
    
    showToast("info", "Storm Canvass Started", "Loading affected properties in your area...");
    setTimeout(() => {
      router.push("/storms");
    }, 1000);
  };

  const handleDialNextLead = (e: React.MouseEvent) => {
    const nextLead = priorityCustomers.find(c => c.status === "lead" || c.status === "prospect");
    if (nextLead && nextLead.phone) {
      // Record the call for gamification
      recordAction("call");
      updateDailyGoal("calls-goal", 1);
      
      // Show XP toast (respects preferences)
      if (shouldShowXP) {
        showToast("xp", "+10 XP", "Call logged!", { xp: 10 });
      }
      
      // Burst effect (respects preferences)
      if (shouldShowConfetti) {
        setConfettiBurst({ x: e.clientX, y: e.clientY });
      }
      
      showToast("success", "Connecting...", `Dialing ${nextLead.firstName} ${nextLead.lastName} at ${nextLead.phone}`);
      // In real app, this would integrate with phone system
      window.location.href = `tel:${nextLead.phone}`;
    } else {
      showToast("info", "No leads available", "All priority leads have been contacted");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-text-primary">
              Dashboard
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-secondary rounded text-xs text-text-muted">
              <Activity className="w-3 h-3 text-accent-success" />
              <span>Live</span>
            </div>
          </div>
          <p className="text-sm text-text-muted">
            Storm intelligence and operations overview
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {liveMetrics.activeAlerts > 0 && (
            <button 
              onClick={() => setShowAlertsPanel(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.2)] rounded text-accent-danger text-sm hover:bg-[hsl(var(--accent-danger)/0.15)] transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              {liveMetrics.activeAlerts} Alerts
            </button>
          )}
          <button 
            onClick={() => setShowStormWatch(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border rounded text-text-secondary text-sm hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <Radio className="w-4 h-4" />
            Storm Watch
          </button>
        </div>
      </div>

      {/* Alerts Panel Modal */}
      <AnimatePresence>
        {showAlertsPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowAlertsPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] bg-[hsl(var(--surface-primary))] border-l border-border shadow-xl z-50 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="font-medium text-text-primary">Active Alerts</h2>
                <button onClick={() => setShowAlertsPanel(false)} className="p-1 hover:bg-surface-hover rounded transition-colors">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {recentAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className="panel p-3 cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => {
                      setShowAlertsPanel(false);
                      if (alert.type === "storm") router.push("/storms");
                      else router.push("/customers");
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                        ${alert.severity === "critical" ? "bg-[hsl(var(--accent-danger))]" : ""}
                        ${alert.severity === "high" ? "bg-[hsl(var(--accent-primary))]" : ""}
                        ${alert.severity === "warning" ? "bg-[hsl(var(--accent-warning))]" : ""}
                      `} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{alert.message}</p>
                        <p className="text-xs text-text-muted mt-0.5">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                <button 
                  onClick={() => {
                    setShowAlertsPanel(false);
                    showToast("success", "Alerts Cleared", "All alerts have been acknowledged");
                  }}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                >
                  Mark All as Read
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Storm Watch Modal */}
      <AnimatePresence>
        {showStormWatch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowStormWatch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-medium text-text-primary">Storm Watch</h2>
                <button onClick={() => setShowStormWatch(false)} className="p-1 hover:bg-surface-hover rounded transition-colors">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[hsl(var(--accent-danger)/0.1)] rounded text-sm text-accent-danger mb-3">
                    <span className="w-1.5 h-1.5 bg-[hsl(var(--accent-danger))] rounded-full" />
                    Severe Weather Active
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    Bucks County Storm Alert
                  </h3>
                  <p className="text-sm text-text-muted">
                    Severe thunderstorm with potential for large hail (1.5") and damaging winds (60+ mph)
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="panel p-3 text-center">
                    <div className="text-lg font-semibold text-text-primary">1.5"</div>
                    <div className="text-xs text-text-muted">Hail Size</div>
                  </div>
                  <div className="panel p-3 text-center">
                    <div className="text-lg font-semibold text-text-primary">65 mph</div>
                    <div className="text-xs text-text-muted">Wind Gusts</div>
                  </div>
                  <div className="panel p-3 text-center">
                    <div className="text-lg font-semibold text-text-primary">123</div>
                    <div className="text-xs text-text-muted">Properties</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setShowStormWatch(false);
                      router.push("/storms");
                    }}
                    className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => setShowStormWatch(false)}
                    className="px-4 py-2.5 bg-surface-secondary border border-border rounded text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Alert Banner - only show if there are alerts */}
      {recentAlerts.length > 0 && recentAlerts[0].message !== "Loading alerts..." && (
        <div className="panel">
          <div className="flex items-center px-4 py-2.5">
            <div className="flex items-center gap-3 flex-1">
              <span className={`
                w-2 h-2 rounded-full flex-shrink-0
                ${recentAlerts[activeAlert].severity === "critical" ? "bg-[hsl(var(--accent-danger))]" : ""}
                ${recentAlerts[activeAlert].severity === "high" ? "bg-[hsl(var(--accent-primary))]" : ""}
                ${recentAlerts[activeAlert].severity === "warning" ? "bg-[hsl(var(--accent-warning))]" : ""}
              `} />
              <span className="text-sm text-text-secondary truncate">
                {recentAlerts[activeAlert].message}
              </span>
              <span className="text-xs text-text-muted flex-shrink-0">
                {recentAlerts[activeAlert].time}
              </span>
            </div>
            <button 
              onClick={() => setShowAlertsPanel(true)}
              className="ml-3 text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div
          className="panel p-4 cursor-pointer hover:border-[hsl(var(--border-hover))] transition-colors"
          onClick={() => router.push("/analytics")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Revenue MTD</span>
            <div className="flex items-center gap-1 text-accent-success text-xs">
              <TrendingUp className="w-3 h-3" />
              +{liveMetrics.revenue.change}%
            </div>
          </div>
          <div className="metric-value mb-3">
            {formatCurrency(liveMetrics.revenue.value)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Target</span>
              <span>{Math.round((liveMetrics.revenue.value / liveMetrics.revenue.target) * 100)}%</span>
            </div>
            <div className="h-1 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))`,
                  width: `${(liveMetrics.revenue.value / liveMetrics.revenue.target) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div
          className="panel p-4 cursor-pointer hover:border-[hsl(var(--border-hover))] transition-colors"
          onClick={() => router.push("/customers")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Pipeline</span>
            <span className="text-xs text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
              {liveMetrics.pipeline.deals} deals
            </span>
          </div>
          <div className="metric-value mb-3">
            {formatCurrency(liveMetrics.pipeline.value)}
          </div>
          <div className="text-xs text-text-muted">
            32 in negotiation
          </div>
        </div>

        {/* Storm Opportunity */}
        <div
          className="panel p-4 cursor-pointer hover:border-[hsl(var(--border-hover))] transition-colors"
          onClick={() => router.push("/storms")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Storm Opportunity</span>
            <span className="text-xs text-accent-danger bg-[hsl(var(--accent-danger)/0.1)] px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="metric-value-danger mb-3">
            {formatCurrency(liveMetrics.stormOpportunity.value)}
          </div>
          <div className="text-xs text-text-muted">
            {liveMetrics.stormOpportunity.affected} properties affected
          </div>
        </div>

        {/* Hot Leads */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Hot Leads</span>
            <button 
              onClick={() => router.push("/customers")}
              className="text-xs text-accent-primary hover:underline flex items-center gap-0.5"
            >
              View all
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-3xl font-semibold text-text-primary mb-3">
            {liveMetrics.hotLeads}
          </div>
          <div className="text-xs text-text-muted">
            Avg response: 1.2hrs
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Customers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary">
                Priority Customers
              </h2>
              <p className="text-sm text-text-muted">High-value opportunities requiring action</p>
            </div>
            <button 
              onClick={() => router.push("/customers")}
              className="text-sm text-accent-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
                <span className="ml-2 text-text-muted text-sm">Loading...</span>
              </div>
            ) : priorityCustomers.length === 0 ? (
              <div className="panel p-6 text-center">
                <p className="text-text-muted text-sm">No priority customers</p>
              </div>
            ) : (
              priorityCustomers.map((customer) => (
                <CustomerIntelCard
                  key={customer.id}
                  customer={customer}
                  intelItems={intelItems.filter((i) => i.customerId === customer.id)}
                  weatherEvents={weatherEvents.filter((w) => w.customerId === customer.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          {/* Weather Radar Preview */}
          <div className="panel">
            <div className="panel-header">
              <CloudLightning className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Weather Radar</span>
              <span className="ml-auto text-xs text-accent-success">Live</span>
            </div>
            <div className="p-3">
              <div className="rounded overflow-hidden border border-border">
                <WeatherRadarMap
                  center={[40.1773, -75.0035]}
                  zoom={7}
                  height="200px"
                  showRadar={true}
                  showAnimation={true}
                  markers={[]}
                  compact={true}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-text-muted">Mid-Atlantic Region</span>
                <button
                  onClick={() => router.push("/storms")}
                  className="text-xs text-accent-primary hover:underline"
                >
                  Expand
                </button>
              </div>
            </div>
          </div>

          {/* Today's Activity with Gamification */}
          <div className="panel">
            <div className="panel-header">
              <Activity className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Today's Activity</span>
              <div className="ml-auto">
                <StreakCounter streak={stats.currentStreak} className="scale-75 origin-right" />
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Calls Made</span>
                <span className="text-sm font-medium text-text-primary">
                  <AnimatedCounter value={stats.callsToday} duration={300} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Emails Sent</span>
                <span className="text-sm font-medium text-text-primary">
                  <AnimatedCounter value={stats.emailsToday} duration={300} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Deals Closed</span>
                <span className="text-sm font-medium text-accent-success">
                  <AnimatedCounter value={stats.dealsToday} duration={300} />
                </span>
              </div>
            </div>
          </div>
          
          {/* Daily Goals */}
          <DailyGoalsWidget goals={dailyGoals} />
          
          {/* Mini Leaderboard - respects user preference */}
          {shouldShowLeaderboard && (
            <div className="panel">
              <div className="panel-header">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-text-secondary">Team Ranking</span>
              </div>
              <div className="p-3">
                <MiniLeaderboard />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <motion.button 
              onClick={handleStormCanvass}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium text-white transition-colors hover:opacity-90 relative overflow-hidden group"
              style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
            >
              <Zap className="w-4 h-4" />
              Start Storm Canvass
              <span className="absolute right-3 text-xs bg-white/20 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                +50 XP
              </span>
            </motion.button>
            <motion.button 
              onClick={handleDialNextLead}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-secondary border border-border rounded text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors relative overflow-hidden group"
            >
              <Phone className="w-4 h-4" />
              Dial Next Lead
              <span className="absolute right-3 text-xs bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                +10 XP
              </span>
            </motion.button>
          </div>
          
          {/* Confetti Burst Effect */}
          {confettiBurst && (
            <ConfettiBurst
              x={confettiBurst.x}
              y={confettiBurst.y}
              isActive={true}
              onComplete={() => setConfettiBurst(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
