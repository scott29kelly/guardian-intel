"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 48, stroke: 4, fontSize: "text-sm" },
  md: { width: 64, stroke: 5, fontSize: "text-lg" },
  lg: { width: 96, stroke: 6, fontSize: "text-2xl" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 60) return "#0ca5e9"; // guardian blue
  if (score >= 40) return "#f59e0b"; // amber
  return "#f43f5e"; // rose
}

function getScoreGlow(score: number): string {
  if (score >= 80) return "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))";
  if (score >= 60) return "drop-shadow(0 0 8px rgba(12, 165, 233, 0.5))";
  if (score >= 40) return "drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))";
  return "drop-shadow(0 0 8px rgba(244, 63, 94, 0.5))";
}

export function ScoreRing({
  score,
  size = "md",
  label,
  showLabel = true,
  className,
}: ScoreRingProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const glow = getScoreGlow(score);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="score-ring relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
          style={{ filter: glow }}
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-surface-800"
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn("font-bold", config.fontSize)}
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className="text-xs text-surface-400 font-medium">{label}</span>
      )}
    </div>
  );
}
