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
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading tracked properties\u2026
      </div>
    );
  }
  if (!props.loading && props.rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No tracked properties match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        Showing {props.rows.length} of {props.total.toLocaleString()} properties
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">City / ZIP</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Signals</th>
              <th className="px-3 py-2 text-left">Last signal</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {props.rows.map((row) => {
              const selected = row.id === props.selectedId;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer hover:bg-slate-50 ${selected ? "bg-[#1E3A5F]/5" : ""}`}
                  onClick={() => props.onSelect(row.id)}
                >
                  <td className="px-3 py-2 font-medium text-slate-900">{row.address}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.city}, {row.state} {row.zipCode}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[#1E3A5F]">
                    {formatScore(row.latestScore)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{row.signalCount}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(row.lastSignalAt)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        row.resolutionStatus === "pending_review"
                          ? "bg-[#D4A656]/20 text-[#D4A656]"
                          : "bg-slate-100 text-slate-600"
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
