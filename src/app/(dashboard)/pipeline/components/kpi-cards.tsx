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
  accent?: "navy" | "gold" | "teal" | "slate";
}

function KpiCard({ label, value, accent = "navy" }: KpiCardProps) {
  const accentClasses: Record<string, string> = {
    navy: "border-[#1E3A5F] text-[#1E3A5F]",
    gold: "border-[#D4A656] text-[#D4A656]",
    teal: "border-[#4A90A4] text-[#4A90A4]",
    slate: "border-slate-400 text-slate-600",
  };
  return (
    <div
      className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${accentClasses[accent]}`}
    >
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
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
      <KpiCard label="Total tracked" value={fmt(props.totalTracked)} accent="navy" />
      <KpiCard label="Scored last 24h" value={fmt(props.scoredLast24h)} accent="teal" />
      <KpiCard label="Pending resolutions" value={fmt(props.pendingResolutions)} accent="gold" />
      <KpiCard label="Outcomes this week" value={fmt(props.outcomesThisWeek)} accent="slate" />
    </div>
  );
}
