"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  insights: string[];
  nextSteps: string[];
  objections: string[];
  source: "ai" | "heuristic";
}

interface AIInsightsPanelProps {
  result: AnalysisResult;
}

export function AIInsightsPanel({ result }: AIInsightsPanelProps) {
  if (!result || result.insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-intel-500/10 border border-intel-500/30 rounded-xl space-y-3"
    >
      {/* Header with sentiment */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-intel-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-wider">AI Insights</span>
          {result.source === "heuristic" && (
            <span className="text-xs text-text-muted">(basic)</span>
          )}
        </div>
        {/* Sentiment indicator */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          result.sentiment === "positive" && "bg-emerald-500/20 text-emerald-400",
          result.sentiment === "negative" && "bg-rose-500/20 text-rose-400",
          result.sentiment === "mixed" && "bg-amber-500/20 text-amber-400",
          result.sentiment === "neutral" && "bg-surface-700 text-text-secondary"
        )}>
          {result.sentiment === "positive" && <TrendingUp className="w-3 h-3" />}
          {result.sentiment === "negative" && <TrendingDown className="w-3 h-3" />}
          {result.sentiment === "mixed" && <AlertTriangle className="w-3 h-3" />}
          {result.sentiment === "neutral" && <Minus className="w-3 h-3" />}
          <span className="capitalize">{result.sentiment}</span>
        </div>
      </div>

      {/* Insights */}
      <ul className="space-y-1.5">
        {result.insights.map((insight, index) => (
          <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
            <Check className="w-3 h-3 text-intel-400 mt-1 flex-shrink-0" />
            {insight}
          </li>
        ))}
      </ul>

      {/* Suggested next steps */}
      {result.nextSteps.length > 0 && (
        <div className="pt-2 border-t border-intel-500/20">
          <p className="text-xs text-text-muted mb-1.5 font-mono uppercase tracking-wider">Suggested Next Steps:</p>
          <div className="space-y-1">
            {result.nextSteps.slice(0, 2).map((step, index) => (
              <div
                key={index}
                className="text-xs text-intel-400 bg-intel-500/10 px-2.5 py-1.5 rounded-lg"
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected objections */}
      {result.objections.length > 0 && (
        <div className="pt-2 border-t border-intel-500/20">
          <p className="text-xs text-text-muted mb-1.5 font-mono uppercase tracking-wider">Objections Detected:</p>
          <div className="flex flex-wrap gap-1.5">
            {result.objections.map((objection, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-storm-500/20 text-storm-400 rounded-full"
              >
                {objection}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
