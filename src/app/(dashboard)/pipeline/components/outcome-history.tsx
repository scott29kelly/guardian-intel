"use client";

import type { LeadIntelOutcomeEvent } from "@/lib/hooks/use-lead-intel";

export interface OutcomeHistoryProps {
  events: LeadIntelOutcomeEvent[];
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OutcomeHistory(props: OutcomeHistoryProps) {
  if (props.events.length === 0) {
    return <p className="text-sm text-text-muted">No outcome events recorded.</p>;
  }
  return (
    <ol className="divide-y divide-border/30">
      {props.events.map((e) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(e.payload);
        } catch {
          // keep empty
        }
        return (
          <li key={e.id} className="py-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium text-text-primary">{e.eventType}</div>
              <div className="text-text-muted">
                {new Date(e.eventTimestamp).toLocaleDateString()}
              </div>
            </div>
            {Object.keys(payload).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(payload).map(([key, val]) => (
                  <span key={key} className="text-text-muted">
                    {formatKey(key)}: {String(val)}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
