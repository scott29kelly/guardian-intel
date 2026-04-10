"use client";

import type { LeadIntelOutcomeEvent } from "@/lib/hooks/use-lead-intel";

export interface OutcomeHistoryProps {
  events: LeadIntelOutcomeEvent[];
}

export function OutcomeHistory(props: OutcomeHistoryProps) {
  if (props.events.length === 0) {
    return <p className="text-sm text-slate-500">No outcome events recorded.</p>;
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
          <li key={e.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-800">{e.eventType}</div>
              <div className="text-slate-500">
                {new Date(e.eventTimestamp).toLocaleDateString()}
              </div>
            </div>
            {Object.keys(payload).length > 0 && (
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                {JSON.stringify(payload)}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
