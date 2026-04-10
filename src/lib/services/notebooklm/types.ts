/**
 * NotebookLM Service Types
 *
 * TypeScript interfaces for the NotebookLM CLI bridge service.
 */

export interface NotebookInfo {
  id: string;
  title: string;
  owner: string;
  created: string;
}

export interface NotebookSource {
  type: "url" | "text" | "file";
  content: string;
  title?: string;
}

export interface SlideDeckOptions {
  instructions?: string;
  format?: "detailed" | "presenter";
  outputPath?: string;
}

export interface InfographicOptions {
  instructions?: string;
  orientation?: "landscape" | "portrait" | "square";
  detail?: "brief" | "standard" | "detailed";
  outputPath?: string;
}

export interface AskResult {
  answer: string;
}

export interface GenerateResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  /** Notebook ID — returned by high-level pipelines so callers can reuse the notebook for multi-artifact generation */
  notebookId?: string;
}

export interface CLIExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface NotebookLMError {
  code: "AUTH_EXPIRED" | "RATE_LIMITED" | "NOT_FOUND" | "CLI_ERROR" | "TIMEOUT";
  message: string;
  retryable: boolean;
}

// =============================================================================
// MULTI-ARTIFACT ORCHESTRATION (Phase 8, D-03)
// =============================================================================

/**
 * Per-artifact status for multi-artifact generation jobs.
 *
 * Stored as `String?` in Prisma (no native enum — consistent with the
 * existing `status` column). Exported here as a TypeScript union for
 * type-safe reads/writes in the orchestrator, routes, and stuck-job sweep.
 *
 * - 'pending'    — artifact is requested but generation has not started
 * - 'processing' — generation is in flight
 * - 'ready'      — artifact generated successfully and URL/markdown is available
 * - 'failed'     — generation failed; see the sibling {type}Error column
 * - 'skipped'    — artifact was not in the job's requestedArtifacts array
 */
export type ArtifactStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "skipped";

/**
 * The four artifact types produced by a multi-artifact generation job.
 * Used as keys into the per-artifact status block on the status route response.
 */
export type ArtifactType = "deck" | "infographic" | "audio" | "report";
