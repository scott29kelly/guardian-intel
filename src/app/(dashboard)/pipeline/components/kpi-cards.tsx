/**
 * KPI Cards row for the Pipeline Inspector.
 *
 * Four cards: Total tracked, Scored last 24h, Pending resolutions, Outcomes this week.
 * All values derived from the currently-loaded property list page + detail count.
 * Phase 8 computes these client-side from the list response; a dedicated stats
 * endpoint is a future enhancement.
 */

"use client";

interface KpiCardProps {
  label: string;
  value: number | string;
  accent?: "primary" | "secondary" | "warning" | "muted";
}

function KpiCard({ label, value, accent = "primary" }: KpiCardProps) {
  const accentClasses: Record<string, string> = {
    primary: "border-accent-primary text-accent-primary",
    secondary: "border-accent-secondary text-accent-secondary",
    warning: "border-accent-warning text-accent-warning",
    muted: "border-border-hover text-text-secondary",
  };
  return (
    <div
      className={`rounded-lg border-l-4 bg-surface-primary border border-border p-4 shadow-warm-sm ${accentClasses[accent]}`}
    >
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export interface KpiCardsProps {
  totalTracked: number;
  scoredLast24h: number;
  pendingResolutions: number;
  outcomesThisWeek: number;
  loading?: boolean;
}

export function KpiCards(props: KpiCardsProps) {
  const fmt = (n: number) => (props.loading ? "\u2014" : n.toLocaleString());
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Total tracked" value={fmt(props.totalTracked)} accent="primary" />
      <KpiCard label="Scored last 24h" value={fmt(props.scoredLast24h)} accent="secondary" />
      <KpiCard label="Pending resolutions" value={fmt(props.pendingResolutions)} accent="warning" />
      <KpiCard label="Outcomes this week" value={fmt(props.outcomesThisWeek)} accent="muted" />
    </div>
  );
}
