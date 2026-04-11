"use client";

import type { LeadIntelSourceRecord } from "@/lib/hooks/use-lead-intel";

export interface ProvenanceListProps {
  records: LeadIntelSourceRecord[];
}

export function ProvenanceList(props: ProvenanceListProps) {
  if (props.records.length === 0) {
    return <p className="text-sm text-text-muted">No source records.</p>;
  }
  // Group by sourceType
  const byType: Record<string, LeadIntelSourceRecord[]> = {};
  for (const r of props.records) {
    (byType[r.sourceType] ??= []).push(r);
  }
  return (
    <div className="space-y-3">
      {Object.entries(byType).map(([type, recs]) => (
        <div key={type} className="rounded border border-border bg-surface-secondary p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {type}
            </div>
            <div className="text-xs text-text-muted">{recs.length} record{recs.length !== 1 ? "s" : ""}</div>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary">
            {recs.slice(0, 10).map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span className="truncate">{r.sourceId}</span>
                <span className="ml-2 tabular-nums text-text-muted">
                  reliability {r.reliabilityWeight.toFixed(2)} •{" "}
                  {new Date(r.sourceRecordedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
            {recs.length > 10 && (
              <li className="text-xs italic text-text-muted">+{recs.length - 10} more</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
