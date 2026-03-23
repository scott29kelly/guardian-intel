/**
 * NotebookLM CLI Bridge
 *
 * Executes notebooklm CLI commands via child_process and parses output.
 * Uses the NOTEBOOKLM_CLI env var for the binary path (default: "notebooklm").
 */

import { execFile } from "child_process";
import type { CLIExecResult, NotebookLMError } from "./types";

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes for most commands
const GENERATE_TIMEOUT_MS = 300_000; // 5 minutes for generation commands

function getCLIPath(): string {
  return process.env.NOTEBOOKLM_CLI || "notebooklm";
}

/**
 * Execute a notebooklm CLI command and return raw output.
 */
export function execCLI(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CLIExecResult> {
  const cli = getCLIPath();

  return new Promise((resolve, reject) => {
    const proc = execFile(
      cli,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB for large outputs
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException & { killed?: boolean }).killed) {
          reject(createError("TIMEOUT", `CLI command timed out after ${timeoutMs}ms`, true));
          return;
        }

        const exitCode = error ? (error as { code?: number }).code || 1 : 0;
        resolve({
          stdout: stdout?.toString() || "",
          stderr: stderr?.toString() || "",
          exitCode,
        });
      }
    );
  });
}

/**
 * Execute a CLI command that generates content (longer timeout).
 */
export function execCLIGenerate(args: string[]): Promise<CLIExecResult> {
  return execCLI(args, GENERATE_TIMEOUT_MS);
}

/**
 * Parse CLI error output and classify it.
 */
export function parseError(stderr: string, exitCode: number): NotebookLMError {
  const lower = stderr.toLowerCase();

  if (lower.includes("authentication expired") || lower.includes("re-authenticate") || lower.includes("login")) {
    return createError("AUTH_EXPIRED", "NotebookLM authentication expired. Run 'notebooklm login' to re-authenticate.", false);
  }

  if (lower.includes("rate limit") || lower.includes("quota") || lower.includes("429")) {
    return createError("RATE_LIMITED", "NotebookLM rate limit reached. Try again later.", true);
  }

  if (lower.includes("not found") || lower.includes("404")) {
    return createError("NOT_FOUND", `NotebookLM resource not found: ${stderr.trim()}`, false);
  }

  return createError("CLI_ERROR", stderr.trim() || `CLI exited with code ${exitCode}`, true);
}

function createError(
  code: NotebookLMError["code"],
  message: string,
  retryable: boolean
): NotebookLMError {
  return { code, message, retryable };
}
