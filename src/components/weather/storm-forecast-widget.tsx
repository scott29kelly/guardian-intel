"use client";

/**
 * StormForecastWidget Component
 * 
 * Dashboard widget showing upcoming storm predictions.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  Clock,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Bell,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PredictiveStormCard } from "./predictive-storm-card";
import { usePredictionSummary, useSendPredictionNotification, type StormPrediction } from "@/lib/hooks/use-predictions";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface StormForecastWidgetProps {
  maxPredictions?: number;
}

export function StormForecastWidget({ maxPredictions = 3 }: StormForecastWidgetProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: summary, isLoading, error } = usePredictionSummary();
  const sendNotification = useSendPredictionNotification();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNotify = async (prediction: StormPrediction) => {
    try {
      await sendNotification.mutateAsync({
        predictionId: prediction.id,
        title: `${prediction.type.toUpperCase()} Alert - ${prediction.affectedArea.states.join(", ")}`,
        body: prediction.recommendation,
        severity: prediction.severity,
        hoursUntil: prediction.hoursUntil,
        affectedStates: prediction.affectedArea.states,
      });
      showToast("success", "Notifications Sent", "Team has been alerted about the storm prediction");
    } catch (err) {
      showToast("error", "Failed to Send", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleViewDetails = (prediction: StormPrediction) => {
    router.push(`/storms?prediction=${prediction.id}`);
  };

  if (isLoading) {
    return (
      <div className="panel p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 text-text-muted">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Unable to load forecasts</span>
        </div>
      </div>
    );
  }

  const allPredictions = [
    ...summary.next24Hours,
    ...summary.next48Hours,
    ...summary.next72Hours,
  ].slice(0, maxPredictions);

  const hasUrgent = summary.urgentCount > 0;

  return (
    <div className={`panel overflow-hidden ${hasUrgent ? "border-orange-500/50" : ""}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <CloudLightning className={`w-4 h-4 ${hasUrgent ? "text-orange-400" : "text-text-muted"}`} />
          <span className="text-sm text-text-secondary">Storm Forecast</span>
          {hasUrgent && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
              {summary.urgentCount} Urgent
            </Badge>
          )}
        </div>
        <button 
          onClick={() => router.push("/storms?tab=forecast")}
          className="text-xs text-accent-primary hover:underline flex items-center gap-1"
        >
          72hr View
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Summary Stats */}
      {summary.totalPredictions > 0 && (
        <div className="grid grid-cols-3 gap-px bg-border/30">
          <div className="p-3 bg-surface-primary/80 text-center">
            <p className="text-lg font-bold text-text-primary">{summary.next24Hours.length}</p>
            <p className="text-[10px] text-text-muted uppercase">Next 24h</p>
          </div>
          <div className="p-3 bg-surface-primary/80 text-center">
            <p className="text-lg font-bold text-text-primary">{summary.totalAffectedCustomers}</p>
            <p className="text-[10px] text-text-muted uppercase">Customers</p>
          </div>
          <div className="p-3 bg-surface-primary/80 text-center">
            <p className="text-lg font-bold text-accent-success">
              {formatCurrency(summary.totalPotentialValue)}
            </p>
            <p className="text-[10px] text-text-muted uppercase">Potential</p>
          </div>
        </div>
      )}

      {/* Predictions List */}
      <div className="p-3 space-y-2">
        {allPredictions.length > 0 ? (
          <>
            {allPredictions.map((prediction) => (
              <PredictiveStormCard
                key={prediction.id}
                prediction={prediction}
                compact
                onClick={() => handleViewDetails(prediction)}
              />
            ))}
            
            {summary.totalPredictions > maxPredictions && (
              <button
                onClick={() => router.push("/storms?tab=forecast")}
                className="w-full py-2 text-xs text-accent-primary hover:underline"
              >
                View all {summary.totalPredictions} predictions →
              </button>
            )}
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-3">
              <CloudLightning className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No severe weather predicted</p>
            <p className="text-xs text-text-muted mt-1">Next 72 hours look clear</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {hasUrgent && (
        <div className="p-3 border-t border-border bg-orange-500/5">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => router.push("/storms?tab=forecast&filter=urgent")}
            >
              <Eye className="w-4 h-4" />
              View Urgent Alerts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const urgent = [...summary.next24Hours, ...summary.next48Hours]
                  .filter(p => p.priorityLevel === "urgent" || p.priorityLevel === "critical")[0];
                if (urgent) handleNotify(urgent);
              }}
            >
              <Bell className="w-4 h-4" />
              Alert Team
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StormForecastWidget;
