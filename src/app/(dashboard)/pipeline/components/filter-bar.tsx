"use client";

import { useState } from "react";
import type { LeadIntelPropertyListFilters } from "@/lib/hooks/use-lead-intel";

const SIGNAL_TYPES = [
  "roof-age",
  "storm-exposure",
  "canvassing-recency",
  "crm-contact-recency",
  "neighbor-win",
];

export interface FilterBarProps {
  filters: LeadIntelPropertyListFilters;
  onFiltersChange: (filters: LeadIntelPropertyListFilters) => void;
  onRunSavedQuery: () => void;
  savedQueryLoading: boolean;
}

export function FilterBar(props: FilterBarProps) {
  const [local, setLocal] = useState<LeadIntelPropertyListFilters>(props.filters);

  const apply = () => props.onFiltersChange(local);
  const reset = () => {
    setLocal({});
    props.onFiltersChange({});
  };

  const toggleSignal = (signal: string) => {
    const current = new Set(local.signalTypes ?? []);
    if (current.has(signal)) current.delete(signal);
    else current.add(signal);
    setLocal({ ...local, signalTypes: Array.from(current) });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Min score</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={local.minScore ?? ""}
            onChange={(e) =>
              setLocal({ ...local, minScore: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Max score</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={local.maxScore ?? ""}
            onChange={(e) =>
              setLocal({ ...local, maxScore: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">ZIP</label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={local.zipCode ?? ""}
            onChange={(e) => setLocal({ ...local, zipCode: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">State</label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={local.state ?? ""}
            onChange={(e) => setLocal({ ...local, state: e.target.value || undefined })}
          />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-600">Signal types</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SIGNAL_TYPES.map((s) => {
            const active = local.signalTypes?.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSignal(s)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={local.hasPendingResolution ?? false}
            onChange={(e) =>
              setLocal({ ...local, hasPendingResolution: e.target.checked || undefined })
            }
          />
          Pending resolution only
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded bg-[#1E3A5F] px-3 py-1 text-xs text-white hover:bg-[#162a44]"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={props.onRunSavedQuery}
            disabled={props.savedQueryLoading}
            className="rounded bg-[#D4A656] px-3 py-1 text-xs text-white hover:bg-[#b88f44] disabled:opacity-60"
          >
            {props.savedQueryLoading ? "Running\u2026" : "Run saved query: high-value roof+storm+neighbor"}
          </button>
        </div>
      </div>
    </div>
  );
}
