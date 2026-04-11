"use client";

import type { LeadIntelPropertyListRow } from "@/lib/hooks/use-lead-intel";

export interface PropertyTableProps {
  rows: LeadIntelPropertyListRow[];
  total: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

function formatScore(s: number | null): string {
  if (s == null) return "\u2014";
  return s.toFixed(1);
}

export function PropertyTable(props: PropertyTableProps) {
  if (props.loading && props.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-primary p-8 text-center text-sm text-text-muted">
        Loading tracked properties\u2026
      </div>
    );
  }
  if (!props.loading && props.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-primary p-8 text-center text-sm text-text-muted">
        No tracked properties match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-primary shadow-warm-sm">
      <div className="border-b border-border bg-surface-secondary px-4 py-2 text-xs text-text-secondary">
        Showing {props.rows.length} of {props.total.toLocaleString()} properties
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-secondary text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">City / ZIP</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Signals</th>
              <th className="px-3 py-2 text-left">Last signal</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {props.rows.map((row) => {
              const selected = row.id === props.selectedId;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-surface-hover ${selected ? "bg-accent-primary/10" : ""}`}
                  onClick={() => props.onSelect(row.id)}
                >
                  <td className="px-3 py-2 font-medium text-text-primary">{row.address}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {row.city}, {row.state} {row.zipCode}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-accent-primary">
                    {formatScore(row.latestScore)}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">{row.signalCount}</td>
                  <td className="px-3 py-2 text-text-secondary">{formatDate(row.lastSignalAt)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        row.resolutionStatus === "pending_review"
                          ? "bg-accent-warning/20 text-accent-warning"
                          : "bg-surface-secondary text-text-secondary"
                      }`}
                    >
                      {row.resolutionStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
