"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  ChevronRight,
  Activity,
  Radio,
  Zap,
  MapPin,
  Phone,
  Clock,
  ArrowUpRight,
  Shield,
  Flame,
  Droplets,
  X,
  Eye,
  Loader2,
} from "lucide-react";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { useDashboard } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { formatCurrencyCompact as formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";

// =============================================================================
// PERFORMANCE OPTIMIZATION: Isolated LiveClock component
// This prevents the 1-second timer from re-rendering the entire dashboard.
// The clock now only re-renders itself, not the parent component.
// =============================================================================
const LiveClock = memo(function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-mono text-xs text-text-muted">
      {currentTime.toLocaleTimeString("en-US", { hour12: false })} UTC-5
    </span>
  );
});

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

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, isLoading, error } = useDashboard();
  const [activeAlert, setActiveAlert] = useState(0);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showStormWatch, setShowStormWatch] = useState(false);

  // Use real data or defaults while loading
  const liveMetrics = data?.metrics || defaultMetrics;
  const recentAlerts = data?.alerts?.length ? data.alerts : defaultAlerts;
  const priorityCustomers = data?.priorityCustomers || [];
  const intelItems = data?.intelItems || [];
  const weatherEvents = data?.weatherEvents || [];

  // Alert ticker rotation - 5 second interval (doesn't cause full re-render)
  useEffect(() => {
    const alertTimer = setInterval(() => {
      setActiveAlert((prev) => (prev + 1) % (recentAlerts.length || 1));
    }, 5000);
    return () => clearInterval(alertTimer);
  }, [recentAlerts.length]);

  const handleStormCanvass = () => {
    showToast("info", "Storm Canvass Started", "Loading affected properties in your area...");
    setTimeout(() => {
      router.push("/storms");
    }, 1000);
  };

  const handleDialNextLead = () => {
    const nextLead = priorityCustomers.find(c => c.status === "lead" || c.status === "prospect");
    if (nextLead && nextLead.phone) {
      showToast("success", "Connecting...", `Dialing ${nextLead.firstName} ${nextLead.lastName} at ${nextLead.phone}`);
      // In real app, this would integrate with phone system
      window.location.href = `tel:${nextLead.phone}`;
    } else {
      showToast("info", "No leads available", "All priority leads have been contacted");
    }
  };

  return (
    <div className="space-y-6">
      {/* Command Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-secondary border border-border rounded">
              <Activity className="w-3 h-3 text-accent-success animate-pulse" />
              <span className="font-mono text-xs text-accent-success">LIVE</span>
            </div>
            <LiveClock />
          </motion.div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary mb-1">
            COMMAND CENTER
          </h1>
          <p className="font-mono text-sm text-text-muted tracking-wide">
            Real-time storm intelligence and field operations dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAlertsPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.3)] rounded text-accent-danger font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-danger)/0.2)] transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            {liveMetrics.activeAlerts} Active Alerts
          </button>
          <button 
            onClick={() => setShowStormWatch(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-success)/0.1)] border border-[hsl(var(--accent-success)/0.3)] rounded text-accent-success font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-success)/0.2)] transition-all"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowAlertsPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] bg-[hsl(var(--surface-primary))] border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent-danger" />
                  Active Alerts
                </h2>
                <button onClick={() => setShowAlertsPanel(false)} className="p-2 hover:bg-surface-hover rounded transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`
                      panel p-4 cursor-pointer hover:border-[hsl(var(--accent-primary)/0.5)] transition-all
                      ${alert.severity === "critical" ? "border-l-2 border-l-[hsl(var(--accent-danger))]" : ""}
                    `}
                    onClick={() => {
                      setShowAlertsPanel(false);
                      if (alert.type === "storm") router.push("/storms");
                      else router.push("/customers");
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-2 h-2 rounded-full mt-2
                        ${alert.severity === "critical" ? "bg-[hsl(var(--accent-danger))] animate-pulse" : ""}
                        ${alert.severity === "high" ? "bg-[hsl(var(--accent-primary))]" : ""}
                        ${alert.severity === "warning" ? "bg-[hsl(var(--accent-warning))]" : ""}
                      `} />
                      <div className="flex-1">
                        <p className="font-mono text-sm text-text-primary">{alert.message}</p>
                        <p className="font-mono text-xs text-text-muted mt-1">{alert.time}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border">
                <button 
                  onClick={() => {
                    setShowAlertsPanel(false);
                    showToast("success", "Alerts Cleared", "All alerts have been acknowledged");
                  }}
                  className="w-full px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowStormWatch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                  <Eye className="w-5 h-5 text-accent-success" />
                  Storm Watch Active
                </h2>
                <button onClick={() => setShowStormWatch(false)} className="p-2 hover:bg-surface-hover rounded transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-danger)/0.1)] rounded-full mb-4">
                    <span className="w-2 h-2 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse" />
                    <span className="font-mono text-sm text-accent-danger">SEVERE WEATHER ACTIVE</span>
                  </div>
                  <h3 className="font-display font-bold text-2xl text-text-primary mb-2">
                    Bucks County Storm Alert
                  </h3>
                  <p className="font-mono text-sm text-text-muted">
                    Severe thunderstorm with potential for large hail (1.5"+) and damaging winds (60+ mph)
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="panel p-4 text-center">
                    <Droplets className="w-6 h-6 text-accent-primary mx-auto mb-2" />
                    <div className="font-mono text-xl font-bold text-text-primary">1.5"</div>
                    <div className="font-mono text-xs text-text-muted">Expected Hail</div>
                  </div>
                  <div className="panel p-4 text-center">
                    <CloudLightning className="w-6 h-6 text-accent-warning mx-auto mb-2" />
                    <div className="font-mono text-xl font-bold text-text-primary">65 mph</div>
                    <div className="font-mono text-xs text-text-muted">Wind Gusts</div>
                  </div>
                  <div className="panel p-4 text-center">
                    <MapPin className="w-6 h-6 text-accent-danger mx-auto mb-2" />
                    <div className="font-mono text-xl font-bold text-text-primary">123</div>
                    <div className="font-mono text-xs text-text-muted">Properties</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowStormWatch(false);
                      router.push("/storms");
                    }}
                    className="flex-1 px-4 py-3 rounded font-mono text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                  >
                    <CloudLightning className="w-4 h-4" />
                    View Storm Details
                  </button>
                  <button 
                    onClick={() => setShowStormWatch(false)}
                    className="px-4 py-3 bg-surface-secondary border border-border rounded font-mono text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Alert Ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="panel overflow-hidden"
      >
        <div className="flex items-center">
          <div className="px-4 py-3 bg-[hsl(var(--accent-danger)/0.1)] border-r border-border flex items-center gap-2">
            <Radio className="w-4 h-4 text-accent-danger animate-pulse" />
            <span className="font-mono text-xs text-accent-danger uppercase tracking-wider">Intel Feed</span>
          </div>
          <div className="flex-1 px-4 py-3 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAlert}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-4"
              >
                <span className={`
                  w-2 h-2 rounded-full
                  ${recentAlerts[activeAlert].severity === "critical" ? "bg-[hsl(var(--accent-danger))] animate-pulse" : ""}
                  ${recentAlerts[activeAlert].severity === "high" ? "bg-[hsl(var(--accent-primary))]" : ""}
                  ${recentAlerts[activeAlert].severity === "warning" ? "bg-[hsl(var(--accent-warning))]" : ""}
                `} />
                <span className="font-mono text-sm text-text-secondary">
                  {recentAlerts[activeAlert].message}
                </span>
                <span className="font-mono text-xs text-text-muted ml-auto">
                  {recentAlerts[activeAlert].time}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setShowAlertsPanel(true)}
            className="px-4 py-3 border-l border-border text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-5 cursor-pointer hover:border-[hsl(var(--accent-primary)/0.5)] transition-all"
          onClick={() => router.push("/analytics")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-[hsl(var(--accent-success)/0.1)] border border-[hsl(var(--accent-success)/0.3)] rounded flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-success" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--accent-success)/0.1)] rounded text-accent-success">
              <TrendingUp className="w-3 h-3" />
              <span className="font-mono text-xs">+{liveMetrics.revenue.change}%</span>
            </div>
          </div>
          <div className="mb-2">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Revenue MTD</span>
          </div>
          <div className="metric-value mb-3">
            {formatCurrency(liveMetrics.revenue.value)}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] text-text-muted">
              <span>TARGET</span>
              <span>{Math.round((liveMetrics.revenue.value / liveMetrics.revenue.target) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                initial={{ width: 0 }}
                animate={{ width: `${(liveMetrics.revenue.value / liveMetrics.revenue.target) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel p-5 cursor-pointer hover:border-[hsl(var(--accent-primary)/0.5)] transition-all"
          onClick={() => router.push("/customers")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-[hsl(var(--accent-primary)/0.1)] border border-[hsl(var(--accent-primary)/0.3)] rounded flex items-center justify-center">
              <Target className="w-5 h-5 text-accent-primary" />
            </div>
            <span className="font-mono text-xs text-text-muted px-2 py-0.5 bg-surface-secondary rounded">
              {liveMetrics.pipeline.deals} DEALS
            </span>
          </div>
          <div className="mb-2">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Pipeline Value</span>
          </div>
          <div className="metric-value mb-3">
            {formatCurrency(liveMetrics.pipeline.value)}
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">32 in negotiation</span>
          </div>
        </motion.div>

        {/* Storm Opportunity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel p-5 border-[hsl(var(--accent-danger)/0.2)] glow-damage cursor-pointer hover:border-[hsl(var(--accent-danger)/0.5)] transition-all"
          onClick={() => router.push("/storms")}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.3)] rounded flex items-center justify-center">
              <CloudLightning className="w-5 h-5 text-accent-danger" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--accent-danger)/0.1)] rounded text-accent-danger animate-pulse">
              <Zap className="w-3 h-3" />
              <span className="font-mono text-xs">ACTIVE</span>
            </div>
          </div>
          <div className="mb-2">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Storm Opportunity</span>
          </div>
          <div className="metric-value-danger mb-3">
            {formatCurrency(liveMetrics.stormOpportunity.value)}
          </div>
          <div className="flex items-center gap-2 text-accent-danger">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{liveMetrics.stormOpportunity.affected} properties affected</span>
          </div>
        </motion.div>

        {/* Hot Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="panel p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-[hsl(var(--accent-primary)/0.1)] border border-[hsl(var(--accent-primary)/0.3)] rounded flex items-center justify-center">
              <Flame className="w-5 h-5 text-accent-primary" />
            </div>
            <button 
              onClick={() => router.push("/customers")}
              className="font-mono text-xs text-accent-primary hover:opacity-80 transition-colors flex items-center gap-1"
            >
              VIEW ALL
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mb-2">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Hot Leads</span>
          </div>
          <div className="text-4xl font-mono font-bold text-text-primary mb-3">
            {liveMetrics.hotLeads}
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">Avg response: 1.2hrs</span>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Priority Targets */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.3)] rounded flex items-center justify-center">
                <Target className="w-4 h-4 text-accent-danger" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-text-primary tracking-wide">
                  PRIORITY TARGETS
                </h2>
                <p className="font-mono text-xs text-text-muted">High-value opportunities requiring immediate action</p>
              </div>
            </div>
            <button 
              onClick={() => router.push("/customers")}
              className="font-mono text-xs text-accent-primary hover:opacity-80 transition-colors flex items-center gap-1"
            >
              VIEW ALL TARGETS
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                <span className="ml-2 text-text-muted text-sm">Loading customers...</span>
              </div>
            ) : priorityCustomers.length === 0 ? (
              <div className="panel p-8 text-center">
                <Target className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted text-sm">No priority customers found</p>
              </div>
            ) : (
              priorityCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <CustomerIntelCard
                    customer={customer}
                    intelItems={intelItems.filter((i) => i.customerId === customer.id)}
                    weatherEvents={weatherEvents.filter((w) => w.customerId === customer.id)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          {/* Weather Radar Preview - Live Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="panel hover:border-[hsl(var(--accent-primary)/0.3)] transition-all"
          >
            <div className="panel-header">
              <CloudLightning className="w-4 h-4 text-accent-danger" />
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Weather Radar</span>
              <span className="ml-auto font-mono text-[10px] text-accent-danger animate-pulse">LIVE</span>
            </div>
            <div className="p-4">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <WeatherRadarMap
                  center={[40.1773, -75.0035]}
                  zoom={7}
                  height="240px"
                  showRadar={true}
                  showAnimation={true}
                  markers={[]}
                  compact={true}
                />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-text-secondary">Mid-Atlantic Region</p>
                  <p className="font-mono text-[10px] text-text-muted">PA • NJ • DE • MD • VA • NY</p>
                </div>
                <button
                  onClick={() => router.push("/storms")}
                  className="font-mono text-xs text-accent-primary hover:text-accent-primary/80 hover:underline transition-all cursor-pointer"
                >
                  EXPAND →
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="panel"
          >
            <div className="panel-header">
              <Activity className="w-4 h-4 text-accent-primary" />
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Today's Activity</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-2 bg-surface-secondary/30 rounded">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-accent-primary" />
                  <span className="font-mono text-xs text-text-secondary">Calls Made</span>
                </div>
                <span className="font-mono text-sm font-bold text-text-primary">42</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-secondary/30 rounded">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-success" />
                  <span className="font-mono text-xs text-text-secondary">Appointments</span>
                </div>
                <span className="font-mono text-sm font-bold text-text-primary">8</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-secondary/30 rounded">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent-danger" />
                  <span className="font-mono text-xs text-text-secondary">Deals Closed</span>
                </div>
                <span className="font-mono text-sm font-bold text-accent-success">3</span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-2"
          >
            <button 
              onClick={handleStormCanvass}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-display font-semibold text-sm text-white shadow-lg transition-all hover:opacity-90"
              style={{ 
                background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))`,
                boxShadow: `0 4px 14px var(--glow-primary)`
              }}
            >
              <Zap className="w-4 h-4" />
              START STORM CANVASS
            </button>
            <button 
              onClick={handleDialNextLead}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
            >
              <Phone className="w-4 h-4" />
              DIAL NEXT LEAD
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
