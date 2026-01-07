"use client";

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
  glowColor?: "primary" | "accent" | "success" | "danger";
}

const glowStyles = {
  primary: "hover:glow-primary",
  accent: "hover:glow-accent",
  success: "hover:glow-success",
  danger: "hover:glow-danger",
};

const iconBgStyles = {
  primary: "bg-guardian-500/20 text-guardian-400",
  accent: "bg-accent-500/20 text-accent-400",
  success: "bg-emerald-500/20 text-emerald-400",
  danger: "bg-rose-500/20 text-rose-400",
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = "neutral",
  className,
  glowColor = "primary",
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "metric-card group transition-all duration-300 cursor-default",
        glowStyles[glowColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-surface-400 font-medium">{title}</p>
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
                  trend === "neutral" && "text-surface-400"
                )}
              >
                {trend === "up" && "↑"}
                {trend === "down" && "↓"}
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-surface-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-xl transition-transform group-hover:scale-110",
              iconBgStyles[glowColor]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
