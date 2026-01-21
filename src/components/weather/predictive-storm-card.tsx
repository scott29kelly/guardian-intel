"use client";

/**
 * PredictiveStormCard Component
 *
 * Displays a predicted storm with timing, severity, and action recommendations.
 * Memoized to prevent unnecessary re-renders in dashboard views.
 */

import { memo } from "react";
import { motion } from "framer-motion";
import {
  CloudLightning,
  Wind,
  CloudHail,
  Tornado,
  Clock,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Bell,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { StormPrediction } from "@/lib/hooks/use-predictions";

interface PredictiveStormCardProps {
  prediction: StormPrediction;
  onClick?: () => void;
  onNotify?: () => void;
  compact?: boolean;
}

const typeConfig = {
  hail: { icon: CloudHail, label: "Hail", color: "text-cyan-400" },
  wind: { icon: Wind, label: "High Wind", color: "text-blue-400" },
  tornado: { icon: Tornado, label: "Tornado", color: "text-rose-400" },
  thunderstorm: { icon: CloudLightning, label: "Thunderstorm", color: "text-amber-400" },
  mixed: { icon: CloudLightning, label: "Severe Storm", color: "text-orange-400" },
};

const severityConfig = {
  marginal: { label: "Marginal", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", priority: 1 },
  slight: { label: "Slight", color: "bg-green-500/20 text-green-400 border-green-500/30", priority: 2 },
  enhanced: { label: "Enhanced", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", priority: 3 },
  moderate: { label: "Moderate", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", priority: 4 },
  high: { label: "High", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", priority: 5 },
};

const priorityConfig = {
  watch: { label: "Watch", color: "text-slate-400", bgColor: "bg-slate-500/10" },
  prepare: { label: "Prepare", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  urgent: { label: "Urgent", color: "text-orange-400", bgColor: "bg-orange-500/10" },
  critical: { label: "Critical", color: "text-rose-400", bgColor: "bg-rose-500/10 animate-pulse" },
};

export const PredictiveStormCard = memo(function PredictiveStormCard({
  prediction,
  onClick,
  onNotify,
  compact = false,
}: PredictiveStormCardProps) {
  const type = typeConfig[prediction.type];
  const severity = severityConfig[prediction.severity];
  const priority = priorityConfig[prediction.priorityLevel];
  const TypeIcon = type.icon;

  const formatTimeUntil = (hours: number) => {
    if (hours < 1) return "< 1 hour";
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${days}d ${remainingHours}h`;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className={`
          p-3 rounded-lg border cursor-pointer transition-all
          ${priority.bgColor} border-border hover:border-accent-primary/50
        `}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TypeIcon className={`w-4 h-4 ${type.color}`} />
            <span className="text-sm font-medium text-text-primary">{type.label}</span>
          </div>
          <Badge className={severity.color}>{severity.label}</Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-text-muted">
            <Clock className="w-3 h-3" />
            {formatTimeUntil(prediction.hoursUntil)}
          </span>
          <span className="flex items-center gap-1 text-text-muted">
            <MapPin className="w-3 h-3" />
            {prediction.affectedArea.states.join(", ")}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        panel overflow-hidden cursor-pointer transition-all hover:border-accent-primary/50
        ${prediction.priorityLevel === "critical" ? "border-l-2 border-l-rose-500" : ""}
        ${prediction.priorityLevel === "urgent" ? "border-l-2 border-l-orange-500" : ""}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${priority.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`w-5 h-5 ${type.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                {type.label} Threat
                <Badge className={severity.color}>{severity.label}</Badge>
              </h3>
              <p className="text-sm text-text-muted">
                {prediction.affectedArea.states.join(", ")} • {prediction.source}
              </p>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${priority.bgColor}`}>
            {prediction.priorityLevel === "critical" && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            <span className={`text-xs font-medium uppercase ${priority.color}`}>
              {priority.label}
            </span>
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-accent-primary" />
            <span className="text-text-primary font-medium">
              {formatTimeUntil(prediction.hoursUntil)}
            </span>
          </div>
          <span className="text-text-muted">
            Expected: {new Date(prediction.expectedStart).toLocaleDateString()} at{" "}
            {new Date(prediction.expectedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Threat Details */}
      <div className="p-4 bg-surface-secondary/30">
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Threat Analysis
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CloudHail className="w-4 h-4 text-cyan-400" />
              <span className="text-lg font-bold text-text-primary">
                {prediction.threats.hailProbability}%
              </span>
            </div>
            <p className="text-xs text-text-muted">Hail</p>
            <p className="text-[10px] text-text-muted">{prediction.threats.hailSizeRange}</p>
          </div>
          <div className="text-center border-x border-border">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wind className="w-4 h-4 text-blue-400" />
              <span className="text-lg font-bold text-text-primary">
                {prediction.threats.windProbability}%
              </span>
            </div>
            <p className="text-xs text-text-muted">Wind</p>
            <p className="text-[10px] text-text-muted">{prediction.threats.windSpeedRange}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Tornado className="w-4 h-4 text-rose-400" />
              <span className="text-lg font-bold text-text-primary">
                {prediction.threats.tornadoProbability}%
              </span>
            </div>
            <p className="text-xs text-text-muted">Tornado</p>
          </div>
        </div>
      </div>

      {/* Business Impact */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">
                  {prediction.potentialAffectedCustomers}
                </span>{" "}
                customers
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">
                <span className="font-medium text-accent-success">
                  {formatCurrency(prediction.estimatedDamageValue)}
                </span>{" "}
                potential
              </span>
            </div>
          </div>
          <span className="text-xs text-text-muted">
            {prediction.confidence}% confidence
          </span>
        </div>

        {/* Recommendation */}
        <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-secondary">{prediction.recommendation}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <Users className="w-4 h-4" />
            View Affected Customers
          </Button>
          {onNotify && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNotify();
              }}
            >
              <Bell className="w-4 h-4" />
              Notify Team
            </Button>
          )}
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </div>
      </div>
    </motion.div>
  );
});

export default PredictiveStormCard;
