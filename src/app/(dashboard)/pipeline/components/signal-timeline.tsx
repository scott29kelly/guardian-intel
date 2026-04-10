"use client";

import type { LeadIntelSignalEvent } from "@/lib/hooks/use-lead-intel";

export interface SignalTimelineProps {
  signals: LeadIntelSignalEvent[];
}

const SIGNAL_COLOR: Record<string, string> = {
  "roof-age": "bg-[#1E3A5F]",
  "storm-exposure": "bg-[#4A90A4]",
  "canvassing-recency": "bg-[#D4A656]",
  "crm-contact-recency": "bg-slate-500",
  "neighbor-win": "bg-emerald-600",
};

export function SignalTimeline(props: SignalTimelineProps) {
  if (props.signals.length === 0) {
    return <p className="text-sm text-slate-500">No signals yet.</p>;
  }
  const sorted = [...props.signals].sort(
    (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
  );
  return (
    <ol className="space-y-2">
      {sorted.slice(0, 50).map((s) => (
        <li key={s.id} className="flex items-start gap-3 rounded border border-slate-200 bg-white p-2">
          <div
            className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
              SIGNAL_COLOR[s.signalType] ?? "bg-slate-400"
            }`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-800">{s.signalType}</div>
              <div className="text-xs text-slate-500">
                {new Date(s.eventTimestamp).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              base {s.baseWeight.toFixed(1)} × reliability {s.reliabilityWeight.toFixed(2)} • half-life{" "}
              {s.halfLifeDays}d{s.value != null ? ` • value ${s.value}` : ""}
            </div>
          </div>
        </li>
      ))}
      {sorted.length > 50 && (
        <li className="text-xs italic text-slate-400">+{sorted.length - 50} more signals</li>
      )}
    </ol>
  );
}
