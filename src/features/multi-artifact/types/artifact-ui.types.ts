/**
 * Multi-Artifact UI Types
 *
 * Shared type definitions, constants, and configuration for the multi-artifact
 * feature. Consumed by useCustomerArtifacts hook, CustomerArtifactsPanel,
 * ArtifactViewerModal, and integration surfaces.
 *
 * ArtifactType uses "deck" (not "slide-deck") as the UI-facing identifier
 * to match the status API response shape and keep component code concise.
 */

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

/** UI-facing artifact type identifiers matching the status API response keys */
export type ArtifactType = "deck" | "infographic" | "audio" | "report";

/** Lifecycle status for each artifact within a generation job */
export type ArtifactStatus = "pending" | "processing" | "ready" | "failed" | "skipped";

// ---------------------------------------------------------------------------
// Per-artifact state (matches status endpoint per-artifact block)
// ---------------------------------------------------------------------------

export interface ArtifactState {
  status: ArtifactStatus | null;
  url: string | null;
  error: string | null;
  completedAt: string | null;
  /** Only present on report artifacts */
  markdown?: string | null;
}

// ---------------------------------------------------------------------------
// Full status API response shape
// ---------------------------------------------------------------------------

export interface ArtifactsResponse {
  hasDeck: boolean;
  artifacts: {
    deck: ArtifactState;
    infographic: ArtifactState;
    audio: ArtifactState;
    report: ArtifactState & { markdown: string | null };
  };
  isPending: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isReady: boolean;
  pdfUrl: string | null;
}

// ---------------------------------------------------------------------------
// Artifact card rendering
// ---------------------------------------------------------------------------

export interface ArtifactCardData {
  type: ArtifactType;
  label: string;
  icon: string;
  state: ArtifactState;
}

// ---------------------------------------------------------------------------
// Display config per artifact type (D-02, D-10)
// ---------------------------------------------------------------------------

export const ARTIFACT_CONFIG: Record<ArtifactType, { label: string; iconName: string }> = {
  deck: { label: "Slide Deck", iconName: "FileText" },
  infographic: { label: "Infographic", iconName: "Image" },
  audio: { label: "Audio Briefing", iconName: "Headphones" },
  report: { label: "Written Report", iconName: "BookOpen" },
};

// ---------------------------------------------------------------------------
// Terminal states -- polling stops when all artifacts reach one of these
// ---------------------------------------------------------------------------

export const TERMINAL_STATES = ["ready", "failed", "skipped"] as const;

// ---------------------------------------------------------------------------
// Display order: deck + infographic top row, audio + report bottom row (D-01)
// ---------------------------------------------------------------------------

export const ARTIFACT_ORDER = ["deck", "infographic", "audio", "report"] as const;

// ---------------------------------------------------------------------------
// Mutation types
// ---------------------------------------------------------------------------

export interface GenerateArtifactsInput {
  customerId: string;
  artifacts: ArtifactType[];
}

export interface GenerateArtifactsResponse {
  success: boolean;
  jobId: string;
  status: string;
  customerId: string;
  requestedArtifacts: ArtifactType[];
}
