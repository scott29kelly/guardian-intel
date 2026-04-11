"use client";

import type { LeadIntelSignalEvent } from "@/lib/hooks/use-lead-intel";

export interface SignalTimelineProps {
  signals: LeadIntelSignalEvent[];
}

const SIGNAL_COLOR: Record<string, string> = {
  "roof-age": "bg-accent-primary",
  "storm-exposure": "bg-accent-secondary",
  "canvassing-recency": "bg-accent-warning",
  "crm-contact-recency": "bg-text-muted",
  "neighbor-win": "bg-accent-success",
};

export function SignalTimeline(props: SignalTimelineProps) {
  if (props.signals.length === 0) {
    return <p className="text-sm text-text-muted">No signals yet.</p>;
  }
  const sorted = [...props.signals].sort(
    (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
  );
  return (
    <ol className="space-y-2">
      {sorted.slice(0, 50).map((s) => (
        <li key={s.id} className="flex items-start gap-3 rounded border border-border bg-surface-primary p-2">
          <div
            className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
              SIGNAL_COLOR[s.signalType] ?? "bg-text-muted"
            }`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-text-primary">{s.signalType}</div>
              <div className="text-xs text-text-muted">
                {new Date(s.eventTimestamp).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-0.5 text-xs text-text-muted">
              base {s.baseWeight.toFixed(1)} × reliability {s.reliabilityWeight.toFixed(2)} • half-life{" "}
              {s.halfLifeDays}d{s.value != null ? ` • value ${s.value}` : ""}
            </div>
          </div>
        </li>
      ))}
      {sorted.length > 50 && (
        <li className="text-xs italic text-text-muted">+{sorted.length - 50} more signals</li>
      )}
    </ol>
  );
}
