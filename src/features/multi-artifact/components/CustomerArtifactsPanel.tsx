"use client";

/**
 * CustomerArtifactsPanel Component
 *
 * Renders a responsive 2x2 grid of artifact cards (deck + infographic on top,
 * audio + report on bottom) per D-01. Integrates with useCustomerArtifacts
 * hook for live status polling and generation mutations.
 *
 * Behavior:
 * - Skipped artifacts are hidden from the grid per D-04
 * - Tapping a ready artifact opens ArtifactViewerModal per D-16
 * - Regenerate button appears when all artifacts are terminal per D-12
 * - Loading skeleton while initial status fetch is in progress
 */

import { useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import { ArtifactViewerModal } from "./ArtifactViewerModal";
import type { ArtifactType, ArtifactState } from "@/features/multi-artifact";
import { ARTIFACT_ORDER } from "@/features/multi-artifact";
import { useCustomerArtifacts } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CustomerArtifactsPanelProps {
  customerId: string;
  customerName?: string;
  className?: string;
  /** Optional callback when Regenerate is clicked */
  onRegenerate?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerArtifactsPanel({
  customerId,
  customerName,
  className,
  onRegenerate,
}: CustomerArtifactsPanelProps) {
  const {
    artifacts,
    hasDeck,
    isLoading,
    isAllTerminal,
    generate,
    isGenerating,
  } = useCustomerArtifacts(customerId);

  // Modal state
  const [viewerType, setViewerType] = useState<ArtifactType | null>(null);
  const [viewerState, setViewerState] = useState<ArtifactState | null>(null);

  // Open artifact viewer modal
  const handleOpenViewer = (type: ArtifactType) => {
    if (!artifacts) return;
    setViewerType(type);
    setViewerState(artifacts[type]);
  };

  // Retry a single failed artifact per D-03
  const handleRetry = (type: ArtifactType) => {
    generate({ customerId, artifacts: [type] });
  };

  // Filter visible artifacts per D-04: hide skipped and null status
  const visibleArtifacts = ARTIFACT_ORDER.filter((type) => {
    const state = artifacts?.[type];
    return state && state.status !== null && state.status !== "skipped";
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-surface-secondary animate-pulse" />
          ))}
        </div>
      )}

      {/* No artifacts yet */}
      {!isLoading && !hasDeck && (
        <p className="text-sm text-text-muted text-center py-4">
          No artifacts generated yet for this customer.
        </p>
      )}

      {/* 2x2 grid per D-01: deck+infographic top, audio+report bottom */}
      {!isLoading && hasDeck && artifacts && (
        <>
          <div
            className={cn(
              "grid gap-3",
              visibleArtifacts.length <= 1
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-2",
            )}
          >
            {visibleArtifacts.map((type) => (
              <ArtifactCard
                key={type}
                type={type}
                state={artifacts[type]}
                customerName={customerName}
                onOpen={handleOpenViewer}
                onRetry={handleRetry}
              />
            ))}
          </div>

          {/* Regenerate button per D-12 */}
          {isAllTerminal && (
            <button
              onClick={() => {
                onRegenerate?.();
                generate({
                  customerId,
                  artifacts: visibleArtifacts as ArtifactType[],
                });
              }}
              disabled={isGenerating}
              className="w-full mt-2 py-2 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
            >
              {isGenerating ? "Regenerating..." : "Regenerate"}
            </button>
          )}
        </>
      )}

      {/* Artifact Viewer Modal */}
      <ArtifactViewerModal
        isOpen={viewerType !== null}
        onClose={() => {
          setViewerType(null);
          setViewerState(null);
        }}
        artifactType={viewerType}
        artifactState={viewerState}
        customerName={customerName}
      />
    </div>
  );
}
