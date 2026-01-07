"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { mockCustomers, mockIntelItems, mockWeatherEvents } from "@/lib/mock-data";

// Simulated live data
const liveMetrics = {
  revenue: { value: 409500, change: 23.4, target: 500000 },
  pipeline: { value: 892000, deals: 127 },
  stormOpportunity: { value: 1781000, affected: 123 },
  activeAlerts: 2,
  hotLeads: 8,
};

const recentAlerts = [
  { id: 1, type: "storm", message: "Severe thunderstorm warning - Franklin County", time: "2m ago", severity: "critical" },
  { id: 2, type: "lead", message: "High-value lead detected: Chen property", time: "15m ago", severity: "high" },
  { id: 3, type: "deal", message: "Henderson deal approaching cold status", time: "1h ago", severity: "warning" },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlert, setActiveAlert] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      setActiveAlert((prev) => (prev + 1) % recentAlerts.length);
    }, 5000);
    return () => clearInterval(alertTimer);
  }, []);

  const priorityCustomers = mockCustomers
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 3);

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
            <span className="font-mono text-xs text-text-muted">
              {currentTime.toLocaleTimeString("en-US", { hour12: false })} UTC-5
            </span>
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
          <button className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.3)] rounded text-accent-danger font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-danger)/0.2)] transition-all">
            <AlertTriangle className="w-4 h-4" />
            {liveMetrics.activeAlerts} Active Alerts
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-success)/0.1)] border border-[hsl(var(--accent-success)/0.3)] rounded text-accent-success font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-success)/0.2)] transition-all">
            <Radio className="w-4 h-4" />
            Storm Watch
          </button>
        </div>
      </div>

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
          <button className="px-4 py-3 border-l border-border text-text-muted hover:text-text-primary transition-colors">
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
          className="panel p-5"
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
          className="panel p-5"
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
          className="panel p-5 border-[hsl(var(--accent-danger)/0.2)] glow-damage"
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
            <button className="font-mono text-xs text-accent-primary hover:opacity-80 transition-colors flex items-center gap-1">
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
            <button className="font-mono text-xs text-accent-primary hover:opacity-80 transition-colors flex items-center gap-1">
              VIEW ALL TARGETS
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {priorityCustomers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <CustomerIntelCard
                  customer={customer}
                  intelItems={mockIntelItems.filter((i) => i.customerId === customer.id)}
                  weatherEvents={mockWeatherEvents.filter((w) => w.customerId === customer.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          {/* Weather Radar Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="panel"
          >
            <div className="panel-header">
              <CloudLightning className="w-4 h-4 text-accent-danger" />
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Weather Radar</span>
              <span className="ml-auto font-mono text-[10px] text-accent-danger animate-pulse">LIVE</span>
            </div>
            <div className="p-4">
              <div className="relative aspect-square bg-surface-secondary rounded-lg overflow-hidden border border-border">
                {/* Simulated radar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Grid lines */}
                    <div className="absolute inset-0" style={{
                      backgroundImage: `
                        linear-gradient(hsl(var(--accent-primary) / 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, hsl(var(--accent-primary) / 0.05) 1px, transparent 1px)
                      `,
                      backgroundSize: "20% 20%"
                    }} />
                    
                    {/* Center crosshair */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-[hsl(var(--accent-primary)/0.2)]" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[hsl(var(--accent-primary)/0.2)]" />
                    
                    {/* Radar sweep */}
                    <div className="absolute inset-0 animate-[spin_8s_linear_infinite] origin-center">
                      <div className="absolute top-1/2 left-1/2 w-1/2 h-px bg-gradient-to-r from-[hsl(var(--accent-primary)/0.5)] to-transparent" />
                    </div>

                    {/* Storm cells */}
                    <div className="absolute top-[30%] left-[25%] w-16 h-16 bg-[hsl(var(--accent-danger)/0.3)] rounded-full blur-md animate-pulse" />
                    <div className="absolute top-[45%] left-[60%] w-10 h-10 bg-[hsl(var(--accent-danger)/0.2)] rounded-full blur-sm" />
                    
                    {/* Range rings */}
                    <div className="absolute inset-[10%] border border-[hsl(var(--accent-primary)/0.1)] rounded-full" />
                    <div className="absolute inset-[25%] border border-[hsl(var(--accent-primary)/0.1)] rounded-full" />
                    <div className="absolute inset-[40%] border border-[hsl(var(--accent-primary)/0.1)] rounded-full" />
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[hsl(var(--accent-danger))] rounded-full" />
                    <span className="font-mono text-[9px] text-text-muted">SEVERE</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[hsl(var(--accent-warning))] rounded-full" />
                    <span className="font-mono text-[9px] text-text-muted">MODERATE</span>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="absolute top-2 right-2 font-mono text-[9px] text-[hsl(var(--accent-primary)/0.5)]">
                  40.0°N 82.9°W
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-text-secondary">Franklin County</p>
                  <p className="font-mono text-[10px] text-accent-danger">Severe thunderstorm warning</p>
                </div>
                <button className="font-mono text-xs text-accent-primary hover:opacity-80 transition-colors">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-display font-semibold text-sm text-white shadow-lg transition-all hover:opacity-90"
              style={{ 
                background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))`,
                boxShadow: `0 4px 14px var(--glow-primary)`
              }}
            >
              <Zap className="w-4 h-4" />
              START STORM CANVASS
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all">
              <Phone className="w-4 h-4" />
              DIAL NEXT LEAD
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
