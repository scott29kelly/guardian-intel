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
