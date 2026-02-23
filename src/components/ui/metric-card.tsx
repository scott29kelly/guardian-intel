"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  variant?: "primary" | "accent" | "success" | "danger";
}

const iconBgStyles = {
  primary: "bg-accent-primary/20 text-accent-primary",
  accent: "bg-accent-secondary/20 text-accent-secondary",
  success: "bg-emerald-500/20 text-emerald-400",
  danger: "bg-rose-500/20 text-rose-400",
};

export const MetricCard = memo(function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = "neutral",
  className,
  variant = "primary",
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "metric-card group transition-all duration-300 cursor-default hover:bg-page-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-text-secondary font-medium">{title}</p>
          <p className="text-3xl font-bold text-white font-display tracking-tight">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  trend === "up" && "text-emerald-400",
                  trend === "down" && "text-rose-400",
                  trend === "neutral" && "text-text-secondary"
                )}
              >
                {trend === "up" && "↑"}
                {trend === "down" && "↓"}
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-text-muted">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-xl transition-transform group-hover:scale-110",
              iconBgStyles[variant]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
});
