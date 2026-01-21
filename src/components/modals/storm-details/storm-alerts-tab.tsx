"use client";

import {
  AlertTriangle,
  Calendar,
  Cloud,
  CloudLightning,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ForecastData } from "./types";

interface StormAlertsTabProps {
  forecast: ForecastData | null;
  isLoading: boolean;
  onOpenNWSForecast: () => void;
  onOpenNOAAStormEvents: () => void;
}

export function StormAlertsTab({
  forecast,
  isLoading,
  onOpenNWSForecast,
  onOpenNOAAStormEvents,
}: StormAlertsTabProps) {
  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
        <p className="text-text-muted">Loading alert data...</p>
      </div>
    );
  }

  if (forecast?.alerts && forecast.alerts.length > 0) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Active Weather Alerts ({forecast.alerts.length})
        </h3>
        {forecast.alerts.map((alert, idx) => (
          <div
            key={idx}
            className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-text-primary">{alert.headline}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Until {new Date(alert.expires).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <Badge className={
                alert.severity === "extreme" || alert.severity === "severe"
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-amber-500/20 text-amber-400"
              }>
                {alert.severity}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-text-secondary mb-1">Description</p>
                <p className="text-text-muted whitespace-pre-wrap">{alert.description}</p>
              </div>

              {alert.instruction && (
                <div>
                  <p className="font-medium text-text-secondary mb-1">Instructions</p>
                  <p className="text-text-muted">{alert.instruction}</p>
                </div>
              )}

              {alert.areas.length > 0 && (
                <div>
                  <p className="font-medium text-text-secondary mb-1">Affected Areas</p>
                  <p className="text-text-muted">{alert.areas.join("; ")}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <Cloud className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">No Active Alerts</h3>
      <p className="text-text-muted text-center max-w-md">
        There are currently no weather alerts for this location. This is good news for your customers!
      </p>
      <div className="flex items-center gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={onOpenNWSForecast}>
          <ExternalLink className="w-4 h-4" />
          Check NWS
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenNOAAStormEvents}>
          <CloudLightning className="w-4 h-4" />
          View Storm History
        </Button>
      </div>
    </div>
  );
}
