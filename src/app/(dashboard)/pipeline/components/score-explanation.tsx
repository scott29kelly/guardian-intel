"use client";

import type {
  LeadIntelPropertyDetailResponse,
  LeadIntelScoreContribution,
  LeadIntelSignalEvent,
} from "@/lib/hooks/use-lead-intel";
import { describeSignal } from "./signal-descriptions";

const SIGNAL_DOT_COLOR: Record<string, string> = {
  "roof-age": "bg-accent-primary",
  "storm-exposure": "bg-accent-secondary",
  "canvassing-recency": "bg-accent-warning",
  "crm-contact-recency": "bg-text-muted",
  "neighbor-win": "bg-accent-success",
};

export interface ScoreExplanationProps {
  latestSnapshot: LeadIntelPropertyDetailResponse["latestSnapshot"];
  signals: LeadIntelSignalEvent[];
}

export function ScoreExplanation(props: ScoreExplanationProps) {
  if (!props.latestSnapshot) {
    return <p className="text-sm text-text-muted">No score snapshot yet.</p>;
  }
  let contributions: LeadIntelScoreContribution[] = [];
  try {
    contributions = JSON.parse(props.latestSnapshot.contributions);
  } catch {
    return <p className="text-sm text-accent-danger">Failed to parse score contributions.</p>;
  }
  const sorted = [...contributions].sort((a, b) => b.effectiveWeight - a.effectiveWeight);

  const signalMap = new Map(props.signals.map((s) => [s.id, s]));

  return (
    <div>
      <div className="mb-3">
        <div className="text-3xl font-bold text-accent-primary">
          {props.latestSnapshot.totalScore.toFixed(1)}
        </div>
      </div>
      <ol className="space-y-1">
        {sorted.map((c) => {
          const signal = signalMap.get(c.signalEventId);
          const description = describeSignal(
            c.signalType,
            signal?.value ?? null,
            signal?.metadata ?? null,
            c.ageDays,
          );
          return (
            <li
              key={c.signalEventId}
              className="flex items-center gap-2 py-1.5 text-xs"
            >
              <div
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  SIGNAL_DOT_COLOR[c.signalType] ?? "bg-text-muted"
                }`}
              />
              <span className="flex-1 text-text-primary">{description}</span>
              <span className="ml-3 tabular-nums font-semibold text-accent-primary">
                +{c.effectiveWeight.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
