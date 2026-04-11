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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-primary p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary">Min score</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-border bg-surface-primary px-2 py-1 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            value={local.minScore ?? ""}
            onChange={(e) =>
              setLocal({ ...local, minScore: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary">Max score</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-border bg-surface-primary px-2 py-1 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            value={local.maxScore ?? ""}
            onChange={(e) =>
              setLocal({ ...local, maxScore: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary">ZIP</label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-border bg-surface-primary px-2 py-1 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            value={local.zipCode ?? ""}
            onChange={(e) => setLocal({ ...local, zipCode: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary">State</label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-border bg-surface-primary px-2 py-1 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            value={local.state ?? ""}
            onChange={(e) => setLocal({ ...local, state: e.target.value || undefined })}
          />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-text-secondary">Signal types</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SIGNAL_TYPES.map((s) => {
            const active = local.signalTypes?.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSignal(s)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-accent-primary bg-accent-primary text-white"
                    : "border-border bg-surface-secondary text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
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
            className="rounded border border-border bg-surface-primary px-3 py-1 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded bg-accent-primary px-3 py-1 text-xs text-white hover:opacity-90 transition-opacity"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={props.onRunSavedQuery}
            disabled={props.savedQueryLoading}
            className="rounded bg-accent-warning px-3 py-1 text-xs text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {props.savedQueryLoading ? "Running\u2026" : "Run saved query: high-value roof+storm+neighbor"}
          </button>
        </div>
      </div>
    </div>
  );
}
