"use client";

import { motion } from "framer-motion";
import {
  CloudLightning,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Zap,
  MapPin,
  Clock,
  Flame,
  ArrowUpRight,
} from "lucide-react";

interface LiveMetrics {
  revenue: { value: number; change: number; target: number };
  pipeline: { value: number; deals: number };
  stormOpportunity: { value: number; affected: number };
  hotLeads: number;
}

interface MetricsGridProps {
  metrics: LiveMetrics;
  onNavigate: (path: string) => void;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export function MetricsGrid({ metrics, onNavigate }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel p-5 cursor-pointer hover:border-[hsl(var(--accent-primary)/0.5)] transition-all"
        onClick={() => onNavigate("/analytics")}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-[hsl(var(--accent-success)/0.1)] border border-[hsl(var(--accent-success)/0.3)] rounded flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-accent-success" />
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--accent-success)/0.1)] rounded text-accent-success">
            <TrendingUp className="w-3 h-3" />
            <span className="font-mono text-xs">+{metrics.revenue.change}%</span>
          </div>
        </div>
        <div className="mb-2">
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Revenue MTD</span>
        </div>
        <div className="metric-value mb-3">
          {formatCurrency(metrics.revenue.value)}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono text-[10px] text-text-muted">
            <span>TARGET</span>
            <span>{Math.round((metrics.revenue.value / metrics.revenue.target) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.revenue.value / metrics.revenue.target) * 100}%` }}
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
        onClick={() => onNavigate("/customers")}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-[hsl(var(--accent-primary)/0.1)] border border-[hsl(var(--accent-primary)/0.3)] rounded flex items-center justify-center">
            <Target className="w-5 h-5 text-accent-primary" />
          </div>
          <span className="font-mono text-xs text-text-muted px-2 py-0.5 bg-surface-secondary rounded">
            {metrics.pipeline.deals} DEALS
          </span>
        </div>
        <div className="mb-2">
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Pipeline Value</span>
        </div>
        <div className="metric-value mb-3">
          {formatCurrency(metrics.pipeline.value)}
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
        onClick={() => onNavigate("/storms")}
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
          {formatCurrency(metrics.stormOpportunity.value)}
        </div>
        <div className="flex items-center gap-2 text-accent-danger">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-mono text-xs">{metrics.stormOpportunity.affected} properties affected</span>
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
            onClick={() => onNavigate("/customers")}
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
          {metrics.hotLeads}
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono text-xs">Avg response: 1.2hrs</span>
        </div>
      </motion.div>
    </div>
  );
}
