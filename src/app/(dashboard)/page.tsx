"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Activity,
  Zap,
  Phone,
  ArrowUpRight,
  X,
  Loader2,
  Target,
  Users,
  Clock,
  Home,
  Flame,
} from "lucide-react";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { useDashboard } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { ReadyDecksWidget } from "@/components/dashboard/ready-decks-widget";

// Time-based greeting helper
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Get first name from full name
const getFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return "there";
  return fullName.split(" ")[0];
};

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
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { data, isLoading, error } = useDashboard();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlert, setActiveAlert] = useState(0);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  // Get user's first name for greeting
  const userName = getFirstName(session?.user?.name);

  // Use real data or defaults while loading
  const liveMetrics = data?.metrics || defaultMetrics;
  const recentAlerts = data?.alerts?.length ? data.alerts : defaultAlerts;
  const priorityCustomers = data?.priorityCustomers || [];
  const intelItems = data?.intelItems || [];
  const weatherEvents = data?.weatherEvents || [];

  // Update time less frequently (every 5 seconds instead of every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      setActiveAlert((prev) => (prev + 1) % (recentAlerts.length || 1));
    }, 5000);
    return () => clearInterval(alertTimer);
  }, [recentAlerts.length]);

  // Memoized callbacks to prevent child re-renders
  const handleStormCanvass = useCallback(() => {
    showToast("info", "Storm Canvass Started", "Loading affected properties in your area...");
    setTimeout(() => {
      router.push("/storms");
    }, 1000);
  }, [router, showToast]);

  const handleDialNextLead = useCallback(() => {
    const nextLead = priorityCustomers.find(c => c.status === "lead" || c.status === "prospect");
    if (nextLead && nextLead.phone) {
      showToast("success", "Connecting...", `Dialing ${nextLead.firstName} ${nextLead.lastName} at ${nextLead.phone}`);
      // In real app, this would integrate with phone system
      window.location.href = `tel:${nextLead.phone}`;
    } else {
      showToast("info", "No leads available", "All priority leads have been contacted");
    }
  }, [priorityCustomers, showToast]);

  // Memoized computed values
  const targetPercent = useMemo(
    () => Math.round((liveMetrics.revenue.value / liveMetrics.revenue.target) * 100),
    [liveMetrics.revenue.value, liveMetrics.revenue.target]
  );

  // Build contextual subtitle items (memoized)
  const contextItems = useMemo(() => {
    const items: string[] = [];
    if (liveMetrics.activeAlerts > 0) {
      items.push(`${liveMetrics.activeAlerts} storm alert${liveMetrics.activeAlerts > 1 ? 's' : ''} active`);
    }
    if (liveMetrics.hotLeads > 0) {
      items.push(`${liveMetrics.hotLeads} hot leads waiting`);
    }
    if (targetPercent > 0) {
      items.push(`${targetPercent}% to target`);
    }
    return items;
  }, [liveMetrics.activeAlerts, liveMetrics.hotLeads, targetPercent]);

  // Determine primary CTA based on context (memoized)
  const primaryCTA = useMemo(() => {
    if (liveMetrics.activeAlerts > 0) {
      return { label: "Start Storm Canvass", action: handleStormCanvass, icon: Zap };
    }
    if (liveMetrics.hotLeads > 0) {
      return { label: "Dial Next Lead", action: handleDialNextLead, icon: Phone };
    }
    return { label: "View Customers", action: () => router.push("/customers"), icon: Users };
  }, [liveMetrics.activeAlerts, liveMetrics.hotLeads, handleStormCanvass, handleDialNextLead, router]);

  return (
    <div className="space-y-6">
      {/* Hero Section - Clean Command Center Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl bg-surface-primary border border-border shadow-soft-lg"
      >
        <div className="p-6 md:p-8">
          {/* Top Row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary mb-1">
                {getGreeting()}, {userName}.
              </h1>
              <p className="text-sm text-text-muted">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Main Metric */}
          <div className="mb-6">
            <div className="text-4xl md:text-5xl font-bold font-mono tracking-tight text-accent-primary mb-1">
              {formatCurrency(liveMetrics.stormOpportunity.value)}
            </div>
            <div className="text-sm font-medium text-text-secondary tracking-wide uppercase">
              Storm Opportunity
            </div>
          </div>

          {/* Pill Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full border border-border">
              <Home className="w-4 h-4 text-accent-primary" />
              <span className="text-sm font-semibold text-text-primary font-mono">{liveMetrics.stormOpportunity.affected}</span>
              <span className="text-xs text-text-muted">Properties</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full border border-border">
              <Flame className="w-4 h-4 text-accent-danger" />
              <span className="text-sm font-semibold text-text-primary font-mono">{liveMetrics.hotLeads}</span>
              <span className="text-xs text-text-muted">Hot Leads</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full border border-border">
              <TrendingUp className="w-4 h-4 text-accent-success" />
              <span className="text-sm font-semibold text-text-primary font-mono">{targetPercent}%</span>
              <span className="text-xs text-text-muted">To Target</span>
            </div>

            <button
              onClick={handleStormCanvass}
              className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-accent-primary text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Zap className="w-4 h-4" />
              Start Storm Canvass
            </button>
          </div>
        </div>
      </motion.div>

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
              className="fixed right-0 top-0 bottom-0 w-[380px] bg-surface-primary border-l border-border shadow-soft-lg z-50 overflow-hidden flex flex-col"
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
                        ${alert.severity === "critical" ? "bg-accent-danger" : ""}
                        ${alert.severity === "high" ? "bg-accent-primary" : ""}
                        ${alert.severity === "warning" ? "bg-accent-warning" : ""}
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

      {/* Alert Banner - only show if there are alerts */}
      {recentAlerts.length > 0 && recentAlerts[0].message !== "Loading alerts..." && (
        <div className="panel">
          <div className="flex items-center px-4 py-2.5">
            <div className="flex items-center gap-3 flex-1">
              <span className={`
                w-2 h-2 rounded-full flex-shrink-0
                ${recentAlerts[activeAlert].severity === "critical" ? "bg-accent-danger" : ""}
                ${recentAlerts[activeAlert].severity === "high" ? "bg-accent-primary" : ""}
                ${recentAlerts[activeAlert].severity === "warning" ? "bg-accent-warning" : ""}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div
          className="panel p-4 cursor-pointer hover:border-border-hover transition-colors"
          onClick={() => router.push("/analytics")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Revenue MTD</span>
            <div className="flex items-center gap-1 text-emerald-600 text-xs">
              <TrendingUp className="w-3 h-3" />
              +{liveMetrics.revenue.change}%
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-3">
            {formatCurrency(liveMetrics.revenue.value)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Target</span>
              <span>{Math.round((liveMetrics.revenue.value / liveMetrics.revenue.target) * 100)}%</span>
            </div>
            <div className="bg-surface-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-primary transition-all duration-1000"
                style={{
                  width: `${(liveMetrics.revenue.value / liveMetrics.revenue.target) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div
          className="panel p-4 cursor-pointer hover:border-border-hover transition-colors"
          onClick={() => router.push("/customers")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Pipeline</span>
            <span className="text-xs text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
              {liveMetrics.pipeline.deals} deals
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-3">
            {formatCurrency(liveMetrics.pipeline.value)}
          </div>
          <div className="text-xs text-text-muted">
            32 in negotiation
          </div>
        </div>

        {/* Storm Opportunity */}
        <div
          className="panel p-4 cursor-pointer hover:border-border-hover transition-colors"
          onClick={() => router.push("/storms")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Storm Opportunity</span>
            <span className="text-xs text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-3">
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
          <div className="text-2xl font-bold text-text-primary mb-3">
            {liveMetrics.hotLeads}
          </div>
          <div className="text-xs text-text-muted">
            Avg response: 1.2hrs
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Priority Customers */}
        <div className="col-span-2 space-y-4">
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
          {/* Today's Activity */}
          <div className="panel">
            <div className="panel-header">
              <Activity className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Today's Activity</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Calls Made</span>
                <span className="text-sm font-medium text-text-primary">42</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Appointments</span>
                <span className="text-sm font-medium text-text-primary">8</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text-muted">Deals Closed</span>
                <span className="text-sm font-medium text-emerald-600">3</span>
              </div>
            </div>
          </div>

          {/* Ready Decks - Batch processed decks ready for viewing */}
          <ReadyDecksWidget />

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleStormCanvass}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium bg-accent-primary text-white hover:opacity-90 transition-opacity"
            >
              <Zap className="w-4 h-4" />
              Start Storm Canvass
            </button>
            <button
              onClick={handleDialNextLead}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-transparent text-text-primary hover:bg-surface-hover rounded text-sm transition-colors"
            >
              <Phone className="w-4 h-4" />
              Dial Next Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
