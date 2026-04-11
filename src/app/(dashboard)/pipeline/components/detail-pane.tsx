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

const STATUS_STYLE: Record<string, string> = {
  resolved: "bg-accent-success/15 text-accent-success",
  pending_review: "bg-accent-warning/15 text-accent-warning",
  new: "bg-accent-primary/15 text-accent-primary",
};

export function DetailPane(props: DetailPaneProps) {
  const { data, isLoading, error } = useLeadIntelPropertyDetail(props.propertyId);

  if (!props.propertyId) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-surface-primary p-8 text-sm text-text-muted">
        Select a property to see provenance, signals, score, and outcomes.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-primary shadow-warm-sm">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={props.onClose}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-sm text-text-muted">Loading&hellip;</p>}
        {error && <p className="text-sm text-accent-danger">Error: {String(error)}</p>}
        {data && (
          <div className="space-y-5">
            <div>
              <div className="text-base font-semibold text-text-primary">{data.property.address}</div>
              <div className="text-sm text-text-secondary">
                {data.property.city}, {data.property.state} {data.property.zipCode}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLE[data.property.resolutionStatus] ?? "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  {data.property.resolutionStatus}
                </span>
                <span className="text-xs text-text-muted">
                  {data.property.signalCount} signal{data.property.signalCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-medium text-text-secondary">Score</h3>
              <ScoreExplanation latestSnapshot={data.latestSnapshot} signals={data.signalEvents} />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-medium text-text-secondary">Signal history</h3>
              <SignalTimeline signals={data.signalEvents} />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-medium text-text-secondary">Provenance</h3>
              <ProvenanceList records={data.sourceRecords} />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-medium text-text-secondary">Outcome history</h3>
              <OutcomeHistory events={data.outcomeEvents} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
