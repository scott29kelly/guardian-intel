"use client";

import type { LeadIntelOutcomeEvent } from "@/lib/hooks/use-lead-intel";

export interface OutcomeHistoryProps {
  events: LeadIntelOutcomeEvent[];
}

export function OutcomeHistory(props: OutcomeHistoryProps) {
  if (props.events.length === 0) {
    return <p className="text-sm text-text-muted">No outcome events recorded.</p>;
  }
  return (
    <ol className="space-y-2">
      {props.events.map((e) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(e.payload);
        } catch {
          // keep empty
        }
        return (
          <li key={e.id} className="rounded border border-border bg-surface-primary p-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium text-text-primary">{e.eventType}</div>
              <div className="text-text-muted">
                {new Date(e.eventTimestamp).toLocaleDateString()}
              </div>
            </div>
            {Object.keys(payload).length > 0 && (
              <div className="mt-1 font-mono text-[11px] text-text-muted">
                {JSON.stringify(payload)}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
