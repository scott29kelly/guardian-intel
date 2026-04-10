/**
 * Pipeline Inspector (Phase 8, LG-10)
 *
 * Read-only sibling route at /pipeline. Shows KPI cards, filter bar,
 * tracked-property table, and a detail pane sourced from /api/lead-intel.
 *
 * Does NOT appear in the sidebar nav in Phase 8 (URL-only reach per LG-10).
 * Does NOT modify (dashboard)/layout.tsx or any sidebar file.
 *
 * Mobile-first: on narrow viewports the detail pane slides up as a
 * full-screen overlay; on >= lg it's a persistent right column.
 */

"use client";

import { useMemo, useState } from "react";
import {
  useLeadIntelProperties,
  useLeadIntelSavedQuery,
  type LeadIntelPropertyListFilters,
} from "@/lib/hooks/use-lead-intel";
import { KpiCards } from "./components/kpi-cards";
import { FilterBar } from "./components/filter-bar";
import { PropertyTable } from "./components/property-table";
import { DetailPane } from "./components/detail-pane";

export default function PipelineInspectorPage() {
  const [filters, setFilters] = useState<LeadIntelPropertyListFilters>({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedQueryEnabled, setSavedQueryEnabled] = useState(false);

  const listQuery = useLeadIntelProperties(filters);
  const savedQuery = useLeadIntelSavedQuery("high-value-roof-storm-neighbor", savedQueryEnabled);

  // Derive KPIs from the current list page. In a later phase we'll add a
  // dedicated stats endpoint; Phase 8 computes these client-side.
  const kpis = useMemo(() => {
    const rows = listQuery.data?.rows ?? [];
    const total = listQuery.data?.total ?? 0;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return {
      totalTracked: total,
      scoredLast24h: rows.filter(
        (r) => r.lastScoreAt && now - new Date(r.lastScoreAt).getTime() < day,
      ).length,
      pendingResolutions: rows.filter((r) => r.resolutionStatus === "pending_review").length,
      // Outcomes this week are not in the list response — shown as 0 until the
      // detail view is opened, or a dedicated stats endpoint is added later.
      outcomesThisWeek: 0,
    };
  }, [listQuery.data]);

  // Merge saved-query results into the visible table when the user runs it
  const visibleRows = useMemo(() => {
    if (savedQueryEnabled && savedQuery.data?.rows) {
      return savedQuery.data.rows.map((r) => ({
        id: r.id,
        address: r.address,
        city: r.city,
        state: r.state,
        zipCode: r.zipCode,
        latestScore: r.latestScore,
        signalCount: r.stormCount + r.neighborWinCount + 1,
        lastSignalAt: null,
        lastScoreAt: null,
        resolutionStatus: "resolved",
      }));
    }
    return listQuery.data?.rows ?? [];
  }, [savedQueryEnabled, savedQuery.data, listQuery.data]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">Pipeline Inspector</h1>
        <p className="text-sm text-slate-600">
          Lead Generation Machine — property-first intelligence backbone (Phase 8 / Foundation).
        </p>
      </div>

      <KpiCards
        totalTracked={kpis.totalTracked}
        scoredLast24h={kpis.scoredLast24h}
        pendingResolutions={kpis.pendingResolutions}
        outcomesThisWeek={kpis.outcomesThisWeek}
        loading={listQuery.isLoading}
      />

      <FilterBar
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setSavedQueryEnabled(false);
        }}
        onRunSavedQuery={() => setSavedQueryEnabled(true)}
        savedQueryLoading={savedQuery.isFetching}
      />

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PropertyTable
            rows={visibleRows}
            total={savedQueryEnabled ? savedQuery.data?.rows.length ?? 0 : listQuery.data?.total ?? 0}
            loading={savedQueryEnabled ? savedQuery.isFetching : listQuery.isFetching}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-span-1">
          <DetailPane propertyId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  );
}
