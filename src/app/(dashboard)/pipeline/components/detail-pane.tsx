"use client";

import { useLeadIntelPropertyDetail } from "@/lib/hooks/use-lead-intel";
import { ProvenanceList } from "./provenance-list";
import { SignalTimeline } from "./signal-timeline";
import { ScoreExplanation } from "./score-explanation";
import { OutcomeHistory } from "./outcome-history";

export interface DetailPaneProps {
  propertyId: string | null;
  onClose: () => void;
}

export function DetailPane(props: DetailPaneProps) {
  const { data, isLoading, error } = useLeadIntelPropertyDetail(props.propertyId);

  if (!props.propertyId) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        Select a property to see provenance, signals, score, and outcomes.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="text-xs uppercase tracking-wider text-slate-600">Property detail</div>
        <button
          type="button"
          onClick={props.onClose}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-sm text-slate-500">Loading\u2026</p>}
        {error && <p className="text-sm text-rose-600">Error: {String(error)}</p>}
        {data && (
          <div className="space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Address</div>
              <div className="text-lg font-semibold text-slate-900">{data.property.address}</div>
              <div className="text-sm text-slate-600">
                {data.property.city}, {data.property.state} {data.property.zipCode}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Status: <span className="font-medium">{data.property.resolutionStatus}</span> •
                Signals: {data.property.signalCount} • Normalized key: {data.property.normalizedKey}
              </div>
            </div>

            <section>
              <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Score explanation
              </h3>
              <ScoreExplanation latestSnapshot={data.latestSnapshot} />
            </section>

            <section>
              <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Signal history
              </h3>
              <SignalTimeline signals={data.signalEvents} />
            </section>

            <section>
              <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Provenance
              </h3>
              <ProvenanceList records={data.sourceRecords} />
            </section>

            <section>
              <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Outcome history
              </h3>
              <OutcomeHistory events={data.outcomeEvents} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
