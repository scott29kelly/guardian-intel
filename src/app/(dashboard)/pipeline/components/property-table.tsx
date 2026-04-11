"use client";

import { useMemo, useState } from "react";
import type { LeadIntelPropertyListRow } from "@/lib/hooks/use-lead-intel";

export interface PropertyTableProps {
  rows: LeadIntelPropertyListRow[];
  total: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type SortKey = "address" | "city" | "latestScore" | "signalCount" | "lastSignalAt" | "resolutionStatus";
type SortDir = "asc" | "desc";

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

function SortHeader({ label, sortKey, current, direction, onSort, align }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  direction: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-3 py-2 cursor-pointer select-none hover:text-text-primary transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? "text-accent-primary" : "text-text-muted/40"}`}>
          {active ? (direction === "asc" ? "\u25B2" : "\u25BC") : "\u25B4"}
        </span>
      </span>
    </th>
  );
}

export function PropertyTable(props: PropertyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("latestScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "latestScore" || key === "signalCount" ? "desc" : "asc");
    }
  };

  const sortedRows = useMemo(() => {
    const rows = [...props.rows];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let av: string | number | null;
      let bv: string | number | null;
      switch (sortKey) {
        case "address": av = a.address; bv = b.address; break;
        case "city": av = `${a.city} ${a.zipCode}`; bv = `${b.city} ${b.zipCode}`; break;
        case "latestScore": av = a.latestScore; bv = b.latestScore; break;
        case "signalCount": av = a.signalCount; bv = b.signalCount; break;
        case "lastSignalAt": av = a.lastSignalAt; bv = b.lastSignalAt; break;
        case "resolutionStatus": av = a.resolutionStatus; bv = b.resolutionStatus; break;
        default: return 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return rows;
  }, [props.rows, sortKey, sortDir]);

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
              <SortHeader label="Address" sortKey="address" current={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="City / ZIP" sortKey="city" current={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="Score" sortKey="latestScore" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
              <SortHeader label="Signals" sortKey="signalCount" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
              <SortHeader label="Last signal" sortKey="lastSignalAt" current={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="Status" sortKey="resolutionStatus" current={sortKey} direction={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedRows.map((row) => {
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
