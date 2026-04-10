"use client";

/**
 * ArtifactCard Component
 *
 * Individual artifact card with status badge, type icon, and tap-to-open.
 * Implements D-02 (status badge + type icon), D-03 (failed retry button),
 * D-06 (inline audio player when ready), and D-13 (indeterminate spinner
 * during processing).
 *
 * Cards are only clickable when the artifact is in "ready" state.
 * Failed artifacts show an inline Retry button that calls the generate
 * mutation for a single artifact type.
 */

import { FileText, Image as ImageIcon, Headphones, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ArtifactType, ArtifactState } from "@/features/multi-artifact";
import { ARTIFACT_CONFIG } from "@/features/multi-artifact";
import { AudioBriefingPlayer } from "./AudioBriefingPlayer";

// ---------------------------------------------------------------------------
// Icon map -- direct component references (not string lookups from types)
// ---------------------------------------------------------------------------

const ICON_MAP = {
  deck: FileText,
  infographic: ImageIcon,
  audio: Headphones,
  report: BookOpen,
} as const;

// ---------------------------------------------------------------------------
// Status badge config -- maps status to label + Badge variant
// ---------------------------------------------------------------------------

const STATUS_BADGE = {
  pending: { label: "Pending", variant: "warning" as const },
  processing: { label: "Generating...", variant: "accent" as const },
  ready: { label: "Ready", variant: "success" as const },
  failed: { label: "Failed", variant: "danger" as const },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtifactCardProps {
  type: ArtifactType;
  state: ArtifactState;
  customerName?: string;
  onOpen: (type: ArtifactType) => void;
  onRetry?: (type: ArtifactType) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtifactCard({ type, state, customerName, onOpen, onRetry }: ArtifactCardProps) {
  const Icon = ICON_MAP[type];
  const badgeConfig = state.status ? STATUS_BADGE[state.status as keyof typeof STATUS_BADGE] : null;
  const label = ARTIFACT_CONFIG[type].label;

  return (
    <Card
      className={cn(
        "transition-colors",
        state.status === "ready"
          ? "cursor-pointer hover:border-accent-primary/30"
          : "cursor-default",
      )}
      onClick={() => state.status === "ready" && onOpen(type)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">{label}</span>
          </div>
          {badgeConfig && (
            <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
          )}
        </div>

        {/* Processing: indeterminate spinner + status message per D-13 */}
        {state.status === "processing" && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating {ARTIFACT_CONFIG[type].label.toLowerCase()}...</span>
          </div>
        )}

        {/* Failed: error message + Retry button per D-03 */}
        {state.status === "failed" && (
          <div className="mt-1">
            {state.error && (
              <p className="text-xs text-rose-400 line-clamp-1 mb-1">{state.error}</p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(type);
              }}
              className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Audio: render inline AudioBriefingPlayer when ready per D-06 */}
        {type === "audio" && state.status === "ready" && state.url && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <AudioBriefingPlayer audioUrl={state.url} customerName={customerName} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
