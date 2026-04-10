"use client";

import type { LeadIntelPropertyDetailResponse, LeadIntelScoreContribution } from "@/lib/hooks/use-lead-intel";

export interface ScoreExplanationProps {
  latestSnapshot: LeadIntelPropertyDetailResponse["latestSnapshot"];
}

export function ScoreExplanation(props: ScoreExplanationProps) {
  if (!props.latestSnapshot) {
    return <p className="text-sm text-slate-500">No score snapshot yet.</p>;
  }
  let contributions: LeadIntelScoreContribution[] = [];
  try {
    contributions = JSON.parse(props.latestSnapshot.contributions);
  } catch {
    return <p className="text-sm text-rose-600">Failed to parse score contributions.</p>;
  }
  const sorted = [...contributions].sort((a, b) => b.effectiveWeight - a.effectiveWeight);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Latest score</div>
          <div className="text-3xl font-bold text-[#1E3A5F]">
            {props.latestSnapshot.totalScore.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">
            formula {props.latestSnapshot.formulaVersion} • evaluated{" "}
            {new Date(props.latestSnapshot.evaluatedAt).toLocaleString()}
          </div>
        </div>
      </div>
      <ol className="space-y-1">
        {sorted.map((c) => (
          <li
            key={c.signalEventId}
            className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
          >
            <div className="flex-1">
              <div className="font-medium text-slate-800">{c.signalType}</div>
              <div className="text-slate-500">
                base {c.baseWeight.toFixed(1)} × rel {c.reliabilityWeight.toFixed(2)} × decay{" "}
                {c.decayFactor.toFixed(3)} (age {c.ageDays.toFixed(0)}d / half-life {c.halfLifeDays}d)
              </div>
            </div>
            <div className="ml-3 tabular-nums font-semibold text-[#1E3A5F]">
              {c.effectiveWeight.toFixed(2)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
