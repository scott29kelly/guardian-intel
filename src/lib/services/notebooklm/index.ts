/**
 * NotebookLM Service
 *
 * Wraps the notebooklm-py CLI to provide programmatic access to
 * NotebookLM's deep research and content generation capabilities.
 * Used by the deck generator to produce high-quality, research-backed
 * slide decks and infographics.
 */

import { execCLI, execCLIGenerate, parseError } from "./cli-bridge";
import { refreshNotebookLMCookies } from "./refresh-auth";
import type {
  NotebookInfo,
  NotebookSource,
  SlideDeckOptions,
  InfographicOptions,
  GenerateResult,
  NotebookLMError,
  ArtifactStatus,
  ArtifactType,
} from "./types";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// =============================================================================
// NOTEBOOK MANAGEMENT
// =============================================================================

/**
 * Create a new notebook and return its ID.
 */
export async function createNotebook(title: string): Promise<string> {
  const result = await execCLI(["create", title]);

  if (result.exitCode !== 0) {
    const error = parseError(result.stderr, result.exitCode);
    throw new Error(`[NotebookLM] Failed to create notebook: ${error.message}`);
  }

  // Parse notebook ID from output — format varies, look for UUID pattern
  const idMatch = result.stdout.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (!idMatch) {
    // Try to extract from "Created notebook: <id>" pattern
    const createdMatch = result.stdout.match(/(?:created|notebook)[:\s]+(\S+)/i);
    if (createdMatch) return createdMatch[1];
    throw new Error(`[NotebookLM] Could not parse notebook ID from: ${result.stdout}`);
  }

  return idMatch[1];
}

/**
 * Set the active notebook for subsequent commands.
 */
export async function selectNotebook(notebookId: string): Promise<void> {
  const result = await execCLI(["use", notebookId]);

  if (result.exitCode !== 0) {
    const error = parseError(result.stderr, result.exitCode);
    throw new Error(`[NotebookLM] Failed to select notebook: ${error.message}`);
  }
}

/**
 * List all notebooks.
 */
export async function listNotebooks(): Promise<NotebookInfo[]> {
  const result = await execCLI(["list"]);

  if (result.exitCode !== 0) {
    const error = parseError(result.stderr, result.exitCode);
    throw new Error(`[NotebookLM] Failed to list notebooks: ${error.message}`);
  }

  // Parse the table output — extract rows with UUIDs
  const lines = result.stdout.split("\n");
  const notebooks: NotebookInfo[] = [];

  for (const line of lines) {
    const idMatch = line.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (idMatch) {
      // Split by | delimiters in table format
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      notebooks.push({
        id: idMatch[1],
        title: parts[1] || "",
        owner: parts[2] || "",
        created: parts[3] || "",
      });
    }
  }

  return notebooks;
}

/**
 * Delete a notebook.
 */
export async function deleteNotebook(notebookId: string): Promise<void> {
  const result = await execCLI(["delete", "-n", notebookId, "--yes"]);

  if (result.exitCode !== 0) {
    const error = parseError(result.stderr, result.exitCode);
    throw new Error(`[NotebookLM] Failed to delete notebook: ${error.message}`);
  }
}

// =============================================================================
// SOURCE MANAGEMENT
// =============================================================================

/**
 * Add sources to the active notebook.
 */
export async function addSources(
  notebookId: string,
  sources: NotebookSource[]
): Promise<void> {
  await selectNotebook(notebookId);

  for (const source of sources) {
    let args: string[];

    switch (source.type) {
      case "url":
        args = ["source", "add", source.content];
        break;
      case "text": {
        // Write text to a temp file and add it
        const tempFile = path.join(os.tmpdir(), `nlm-source-${Date.now()}.txt`);
        await fs.writeFile(tempFile, source.content, "utf-8");
        args = ["source", "add", tempFile];
        // Clean up after a delay
        setTimeout(() => fs.unlink(tempFile).catch(() => {}), 30000);
        break;
      }
      case "file":
        args = ["source", "add", source.content];
        break;
      default:
        continue;
    }

    const result = await execCLI(args);
    if (result.exitCode !== 0) {
      console.warn(`[NotebookLM] Warning: Failed to add source: ${result.stderr}`);
    } else {
      console.log(`[NotebookLM] Added source: ${source.type} - ${source.title || source.content.substring(0, 50)}`);
    }
  }
}

// =============================================================================
// CHAT / RESEARCH
// =============================================================================

/**
 * Ask a question against the notebook's sources.
 */
export async function askQuestion(
  notebookId: string,
  question: string
): Promise<string> {
  await selectNotebook(notebookId);

  const result = await execCLI(["ask", question]);

  if (result.exitCode !== 0) {
    const error = parseError(result.stderr, result.exitCode);
    throw new Error(`[NotebookLM] Failed to ask question: ${error.message}`);
  }

  return result.stdout.trim();
}

// =============================================================================
// CONTENT GENERATION
// =============================================================================

/**
 * Generate a slide deck from the notebook's sources.
 *
 * Uses --no-wait to avoid the CLI's hardcoded 300s internal timeout,
 * then polls for completion ourselves with a configurable timeout.
 * Slide deck generation typically takes 4-6 minutes.
 */
export async function generateSlideDeck(
  notebookId: string,
  options: SlideDeckOptions = {}
): Promise<GenerateResult> {
  await selectNotebook(notebookId);

  // Step 1: Start generation (no --wait to avoid CLI's 300s internal timeout)
  const args = ["generate", "slide-deck"];
  if (options.instructions) {
    args.push(options.instructions);
  }
  if (options.format) {
    args.push("--format", options.format);
  }
  args.push("--retry", "2");

  console.log(`[NotebookLM] Starting slide deck generation (no-wait)...`);
  const startResult = await execCLI(args, 60_000);

  if (startResult.exitCode !== 0) {
    console.error(`[NotebookLM] generate start failed (code ${startResult.exitCode})`);
    console.error(`[NotebookLM] stdout: ${startResult.stdout.substring(0, 500)}`);
    console.error(`[NotebookLM] stderr: ${startResult.stderr.substring(0, 500)}`);
    const error = parseError(startResult.stderr, startResult.exitCode, startResult.stdout);
    return { success: false, error: error.message };
  }

  console.log(`[NotebookLM] Generation started: ${startResult.stdout.trim().substring(0, 200)}`);

  // Step 2: Poll for completion using download --dry-run
  const maxWaitMs = 720_000; // 12 minutes polling (some decks take 8+ min)
  const pollIntervalMs = 15_000; // Check every 15 seconds
  const startTime = Date.now();
  let artifactReady = false;

  console.log(`[NotebookLM] Polling for slide deck completion (up to ${maxWaitMs / 1000}s)...`);

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const dlCheck = await execCLI(
      ["download", "slide-deck", "--dry-run", "--latest"],
      15_000
    );

    // Log every poll attempt for diagnostics
    console.log(`[NotebookLM] Poll @${elapsed}s: exit=${dlCheck.exitCode} stdout="${dlCheck.stdout.trim().substring(0, 120)}"`);

    // Broaden success detection: exitCode 0 means the CLI found a downloadable artifact.
    // The "would download" string is expected, but exitCode 0 alone is sufficient.
    if (dlCheck.exitCode === 0) {
      console.log(`[NotebookLM] Slide deck ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }

    const output = (dlCheck.stdout + dlCheck.stderr).toLowerCase();
    if (output.includes("authentication expired") || output.includes("accounts.google.com")) {
      console.error(`[NotebookLM] Auth expired — aborting deck poll after ${elapsed}s`);
      return { success: false, error: "NotebookLM authentication expired. Please re-authenticate." };
    }
  }

  // Step 3: Download the generated deck
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-deck-${Date.now()}.pdf`);

  if (!artifactReady) {
    // Fallback: try one real download before giving up — the dry-run text may not match
    // but the artifact might still be ready
    console.log(`[NotebookLM] Polling timed out — attempting fallback download...`);
    const fallbackDl = await execCLI(["download", "slide-deck", outputPath, "--latest"], 30_000);
    if (fallbackDl.exitCode === 0) {
      // Check the file actually exists and has content
      try {
        const stat = await fs.stat(outputPath);
        if (stat.size > 0) {
          console.log(`[NotebookLM] Fallback download succeeded (${Math.round(stat.size / 1024)}KB)`);
          return { success: true, outputPath };
        }
      } catch {}
    }
    console.error(`[NotebookLM] Fallback download also failed: ${fallbackDl.stdout.substring(0, 200)}`);
    return { success: false, error: `Slide deck generation timed out after ${maxWaitMs / 1000}s` };
  }

  // Retry download up to 3 times on transient network errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    const dlResult = await execCLI(["download", "slide-deck", outputPath, "--latest"], 60_000);

    if (dlResult.exitCode === 0) {
      console.log(`[NotebookLM] Slide deck saved to: ${outputPath} (attempt ${attempt})`);
      return { success: true, outputPath };
    }

    const errText = (dlResult.stderr || dlResult.stdout).toLowerCase();
    const isTransient = errText.includes("peer closed") || errText.includes("incomplete") || errText.includes("timeout") || errText.includes("econnreset");

    if (!isTransient || attempt === 3) {
      console.error(`[NotebookLM] download failed (attempt ${attempt}): stdout=${dlResult.stdout.substring(0, 300)} stderr=${dlResult.stderr.substring(0, 300)}`);
      return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
    }

    console.warn(`[NotebookLM] Download attempt ${attempt} failed (transient), retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
  }

  return { success: false, error: "Download failed after 3 attempts" };
}

/**
 * Generate an infographic from the notebook's sources.
 *
 * Uses --no-wait + polling to avoid the CLI's 300s internal timeout.
 */
export async function generateInfographic(
  notebookId: string,
  options: InfographicOptions = {}
): Promise<GenerateResult> {
  await selectNotebook(notebookId);

  // Step 1: Start generation (no --wait)
  const args = ["generate", "infographic"];
  if (options.instructions) {
    args.push(options.instructions);
  }
  if (options.orientation) {
    args.push("--orientation", options.orientation);
  }
  if (options.detail) {
    args.push("--detail", options.detail);
  }
  args.push("--retry", "2");

  console.log(`[NotebookLM] Starting infographic generation (no-wait)...`);
  const startResult = await execCLI(args, 60_000);

  if (startResult.exitCode !== 0) {
    console.error(`[NotebookLM] infographic start failed (code ${startResult.exitCode})`);
    console.error(`[NotebookLM] stdout: ${startResult.stdout.substring(0, 500)}`);
    console.error(`[NotebookLM] stderr: ${startResult.stderr.substring(0, 500)}`);
    const error = parseError(startResult.stderr, startResult.exitCode, startResult.stdout);
    return { success: false, error: error.message };
  }

  console.log(`[NotebookLM] Infographic generation started: ${startResult.stdout.trim().substring(0, 200)}`);

  // Step 2: Poll for completion
  const maxWaitMs = 720_000; // 12 minutes
  const pollIntervalMs = 15_000;
  const startTime = Date.now();
  let artifactReady = false;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const dlCheck = await execCLI(
      ["download", "infographic", "--dry-run", "--latest"],
      15_000
    );

    console.log(`[NotebookLM] Infographic poll @${elapsed}s: exit=${dlCheck.exitCode} stdout="${dlCheck.stdout.trim().substring(0, 120)}"`);

    if (dlCheck.exitCode === 0) {
      console.log(`[NotebookLM] Infographic ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }

    // Abort immediately on auth failure — no point polling for 12 minutes
    const output = (dlCheck.stdout + dlCheck.stderr).toLowerCase();
    if (output.includes("authentication expired") || output.includes("redirected to") || output.includes("accounts.google.com")) {
      console.error(`[NotebookLM] Auth expired — aborting infographic poll after ${elapsed}s`);
      return { success: false, error: "NotebookLM authentication expired. Please re-authenticate." };
    }
  }

  // Step 3: Download
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-infographic-${Date.now()}.png`);

  if (!artifactReady) {
    // Fallback: try one real download before giving up
    console.log(`[NotebookLM] Infographic polling timed out — attempting fallback download...`);
    const fallbackDl = await execCLI(["download", "infographic", outputPath, "--latest"], 30_000);
    if (fallbackDl.exitCode === 0) {
      try {
        const stat = await fs.stat(outputPath);
        if (stat.size > 0) {
          console.log(`[NotebookLM] Infographic fallback download succeeded (${Math.round(stat.size / 1024)}KB)`);
          return { success: true, outputPath };
        }
      } catch {}
    }
    return { success: false, error: `Infographic generation timed out after ${maxWaitMs / 1000}s` };
  }

  // Retry download up to 3 times on transient network errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    const dlResult = await execCLI(["download", "infographic", outputPath, "--latest"], 60_000);

    if (dlResult.exitCode === 0) {
      console.log(`[NotebookLM] Infographic saved to: ${outputPath} (attempt ${attempt})`);
      return { success: true, outputPath };
    }

    const errText = (dlResult.stderr || dlResult.stdout).toLowerCase();
    const isTransient = errText.includes("peer closed") || errText.includes("incomplete") || errText.includes("timeout") || errText.includes("econnreset");

    if (!isTransient || attempt === 3) {
      console.error(`[NotebookLM] download failed (attempt ${attempt}): stdout=${dlResult.stdout.substring(0, 300)} stderr=${dlResult.stderr.substring(0, 300)}`);
      return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
    }

    console.warn(`[NotebookLM] Download attempt ${attempt} failed (transient), retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
  }

  return { success: false, error: "Download failed after 3 attempts" };
}

/**
 * Configure a notebook's persona, mode, and response length.
 *
 * These settings affect ALL artifacts generated from the notebook,
 * so call this once after creating the notebook and adding sources.
 */
export async function configureNotebook(
  notebookId: string,
  options: { mode?: string; persona?: string; responseLength?: string }
): Promise<void> {
  await selectNotebook(notebookId);

  const args = ["configure"];
  if (options.mode) args.push("--mode", options.mode);
  if (options.persona) args.push("--persona", options.persona);
  if (options.responseLength) args.push("--response-length", options.responseLength);

  const result = await execCLI(args, 15_000);
  if (result.exitCode !== 0) {
    console.warn(`[NotebookLM] Configure warning: ${result.stderr || result.stdout}`);
  } else {
    console.log(`[NotebookLM] Configured notebook: mode=${options.mode || "default"}`);
  }
}

/**
 * Generate an audio briefing from the notebook's sources.
 *
 * Uses --no-wait + polling pattern identical to generateSlideDeck.
 * Audio generation typically takes 3-8 minutes.
 */
export async function generateAudio(
  notebookId: string,
  options: { instructions?: string; format?: string; length?: string; outputPath?: string } = {}
): Promise<GenerateResult> {
  await selectNotebook(notebookId);

  // Step 1: Start generation
  const args = ["generate", "audio"];
  if (options.instructions) {
    args.push(options.instructions);
  }
  if (options.format) {
    args.push("--format", options.format);
  }
  if (options.length) {
    args.push("--length", options.length);
  }
  args.push("--retry", "2");

  console.log(`[NotebookLM] Starting audio generation (no-wait)...`);
  const startResult = await execCLI(args, 60_000);

  if (startResult.exitCode !== 0) {
    console.error(`[NotebookLM] audio start failed (code ${startResult.exitCode})`);
    console.error(`[NotebookLM] stdout: ${startResult.stdout.substring(0, 500)}`);
    console.error(`[NotebookLM] stderr: ${startResult.stderr.substring(0, 500)}`);
    const error = parseError(startResult.stderr, startResult.exitCode, startResult.stdout);
    return { success: false, error: error.message };
  }

  console.log(`[NotebookLM] Audio generation started: ${startResult.stdout.trim().substring(0, 200)}`);

  // Step 2: Poll for completion using download --dry-run
  const maxWaitMs = 720_000; // 12 minutes
  const pollIntervalMs = 15_000;
  const startTime = Date.now();
  let artifactReady = false;

  console.log(`[NotebookLM] Polling for audio completion (up to ${maxWaitMs / 1000}s)...`);

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const dlCheck = await execCLI(
      ["download", "audio", "--dry-run", "--latest"],
      15_000
    );

    console.log(`[NotebookLM] Audio poll @${elapsed}s: exit=${dlCheck.exitCode} stdout="${dlCheck.stdout.trim().substring(0, 120)}"`);

    if (dlCheck.exitCode === 0) {
      console.log(`[NotebookLM] Audio ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }

    const output = (dlCheck.stdout + dlCheck.stderr).toLowerCase();
    if (output.includes("authentication expired") || output.includes("accounts.google.com")) {
      console.error(`[NotebookLM] Auth expired — aborting audio poll after ${elapsed}s`);
      return { success: false, error: "NotebookLM authentication expired. Please re-authenticate." };
    }
  }

  // Step 3: Download
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-audio-${Date.now()}.mp3`);

  if (!artifactReady) {
    console.log(`[NotebookLM] Audio polling timed out — attempting fallback download...`);
    const fallbackDl = await execCLI(["download", "audio", outputPath, "--latest"], 30_000);
    if (fallbackDl.exitCode === 0) {
      try {
        const stat = await fs.stat(outputPath);
        if (stat.size > 0) {
          console.log(`[NotebookLM] Audio fallback download succeeded (${Math.round(stat.size / 1024)}KB)`);
          return { success: true, outputPath };
        }
      } catch {}
    }
    return { success: false, error: `Audio generation timed out after ${maxWaitMs / 1000}s` };
  }

  const dlResult = await execCLI(["download", "audio", outputPath, "--latest"]);

  if (dlResult.exitCode !== 0) {
    console.error(`[NotebookLM] audio download failed: stdout=${dlResult.stdout.substring(0, 200)} stderr=${dlResult.stderr.substring(0, 200)}`);
    return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
  }

  console.log(`[NotebookLM] Audio saved to: ${outputPath}`);
  return { success: true, outputPath };
}

/**
 * Generate a written report from the notebook's sources.
 *
 * Supports formats: briefing-doc, study-guide, blog-post, custom.
 * Uses --no-wait + polling pattern identical to generateSlideDeck.
 */
export async function generateReport(
  notebookId: string,
  options: { format?: string; appendInstructions?: string; description?: string; outputPath?: string } = {}
): Promise<GenerateResult> {
  await selectNotebook(notebookId);

  // Step 1: Start generation
  const args = ["generate", "report"];
  if (options.format) {
    args.push("--format", options.format);
  }
  if (options.appendInstructions) {
    args.push("--append", options.appendInstructions);
  }
  if (options.description) {
    args.push(options.description);
  }
  args.push("--retry", "2");

  console.log(`[NotebookLM] Starting report generation (no-wait)...`);
  const startResult = await execCLI(args, 60_000);

  if (startResult.exitCode !== 0) {
    console.error(`[NotebookLM] report start failed (code ${startResult.exitCode})`);
    console.error(`[NotebookLM] stdout: ${startResult.stdout.substring(0, 500)}`);
    console.error(`[NotebookLM] stderr: ${startResult.stderr.substring(0, 500)}`);
    const error = parseError(startResult.stderr, startResult.exitCode, startResult.stdout);
    return { success: false, error: error.message };
  }

  console.log(`[NotebookLM] Report generation started: ${startResult.stdout.trim().substring(0, 200)}`);

  // Step 2: Poll for completion
  const maxWaitMs = 720_000; // 12 minutes
  const pollIntervalMs = 15_000;
  const startTime = Date.now();
  let artifactReady = false;

  console.log(`[NotebookLM] Polling for report completion (up to ${maxWaitMs / 1000}s)...`);

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const dlCheck = await execCLI(
      ["download", "report", "--dry-run", "--latest"],
      15_000
    );

    console.log(`[NotebookLM] Report poll @${elapsed}s: exit=${dlCheck.exitCode} stdout="${dlCheck.stdout.trim().substring(0, 120)}"`);

    if (dlCheck.exitCode === 0) {
      console.log(`[NotebookLM] Report ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }

    const output = (dlCheck.stdout + dlCheck.stderr).toLowerCase();
    if (output.includes("authentication expired") || output.includes("accounts.google.com")) {
      console.error(`[NotebookLM] Auth expired — aborting report poll after ${elapsed}s`);
      return { success: false, error: "NotebookLM authentication expired. Please re-authenticate." };
    }
  }

  // Step 3: Download
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-report-${Date.now()}.md`);

  if (!artifactReady) {
    console.log(`[NotebookLM] Report polling timed out — attempting fallback download...`);
    const fallbackDl = await execCLI(["download", "report", outputPath, "--latest"], 30_000);
    if (fallbackDl.exitCode === 0) {
      try {
        const stat = await fs.stat(outputPath);
        if (stat.size > 0) {
          console.log(`[NotebookLM] Report fallback download succeeded (${Math.round(stat.size / 1024)}KB)`);
          return { success: true, outputPath };
        }
      } catch {}
    }
    return { success: false, error: `Report generation timed out after ${maxWaitMs / 1000}s` };
  }

  const dlResult = await execCLI(["download", "report", outputPath, "--latest"]);

  if (dlResult.exitCode !== 0) {
    console.error(`[NotebookLM] report download failed: stdout=${dlResult.stdout.substring(0, 200)} stderr=${dlResult.stderr.substring(0, 200)}`);
    return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
  }

  console.log(`[NotebookLM] Report saved to: ${outputPath}`);
  return { success: true, outputPath };
}

// =============================================================================
// MULTI-ARTIFACT ORCHESTRATOR (Phase 8, D-06/D-07/D-08)
// =============================================================================

/**
 * Per-artifact result block returned by generateCustomerArtifacts.
 *
 * - `status`      — terminal state: 'ready' | 'failed' | 'skipped'
 * - `outputPath?` — local temp file path for non-report artifacts (caller uploads + unlinks)
 * - `markdown?`   — inline content for reports (D-17 — reports are not uploaded)
 * - `error?`      — error message when status === 'failed'
 */
export interface ArtifactOutcome {
  type: ArtifactType;
  status: Extract<ArtifactStatus, "ready" | "failed" | "skipped">;
  outputPath?: string;
  markdown?: string;
  error?: string;
}

/**
 * Input shape for generateCustomerArtifacts.
 *
 * - `jobId`              — ScheduledDeck row id; orchestrator writes per-artifact status transitions to this row
 * - `customerName`       — used for logging + temp filename hints
 * - `requestedArtifacts` — subset of ArtifactType[]; order is IGNORED (sequence is fixed: deck → infographic → audio → report per D-07)
 * - `deckRequest`        — existing CustomerDeckRequest shape; orchestrator uses it for notebook sources, persona, template instructions
 * - `notebookId?`        — if provided, reuse existing notebook; otherwise create a new one
 */
export interface GenerateCustomerArtifactsInput {
  jobId: string;
  customerName: string;
  requestedArtifacts: ArtifactType[];
  deckRequest: CustomerDeckRequest;
  notebookId?: string;
}

/**
 * Output shape — one ArtifactOutcome per REQUESTED artifact, in fixed sequence order.
 * Not-requested artifacts are omitted (the caller marks them 'skipped' in the DB).
 *
 * `notebookId` is the notebook actually used (either reused or freshly created).
 * Always present even on early abort so the caller can attempt cleanup.
 *
 * `aborted` is true only if notebook creation itself failed — per D-08, per-artifact
 * failures do NOT abort the job.
 */
export interface GenerateCustomerArtifactsResult {
  notebookId: string | null;
  aborted: boolean;
  abortReason?: string;
  outcomes: ArtifactOutcome[];
}

// =============================================================================
// HIGH-LEVEL DECK GENERATION PIPELINE
// =============================================================================

export interface CustomerDeckRequest {
  customerName: string;
  customerData: string; // Primary customer profile text
  additionalSources?: Array<{ title: string; content: string }>; // Extra source documents
  weatherHistory?: string; // Formatted weather events
  templateInstructions: string; // What kind of deck to generate
  audience: "internal" | "customer-facing";
  persona?: string; // Notebook persona prompt
  artifactConfigs?: Array<{
    type: string;
    format?: string;
    length?: string;
    style?: string;
    detail?: string;
    orientation?: string;
    description?: string;
    appendInstructions?: string;
  }>;
}

/**
 * Full pipeline: create notebook → add customer data → generate deck → return file path.
 * This is the main entry point for the deck generator integration.
 */
export async function generateCustomerDeck(
  request: CustomerDeckRequest
): Promise<GenerateResult> {
  const notebookTitle = `Guardian Deck: ${request.customerName} - ${new Date().toISOString().split("T")[0]}`;

  console.log(`[NotebookLM] Starting deck generation for ${request.customerName}`);

  // Step 1: Create notebook
  let notebookId: string;
  try {
    notebookId = await createNotebook(notebookTitle);
    console.log(`[NotebookLM] Created notebook: ${notebookId}`);
  } catch (error) {
    return { success: false, error: `Failed to create notebook: ${error}` };
  }

  // Step 2: Add customer data as individual sources for richer cross-referencing
  try {
    // Source 1: Primary customer profile
    const sources: NotebookSource[] = [
      {
        type: "text",
        content: request.customerData,
        title: `${request.customerName} - Customer Profile`,
      },
    ];

    // Source 2: Weather history (if available)
    if (request.weatherHistory) {
      sources.push({
        type: "text",
        content: request.weatherHistory,
        title: `${request.customerName} - Weather History`,
      });
    }

    // Sources 3+: Additional data facets (claims, intel, carrier, neighborhood, etc.)
    if (request.additionalSources) {
      for (const extra of request.additionalSources) {
        sources.push({
          type: "text",
          content: extra.content,
          title: extra.title,
        });
      }
    }

    await addSources(notebookId, sources);
    console.log(`[NotebookLM] Added ${sources.length} sources to notebook`);
  } catch (error) {
    console.error(`[NotebookLM] Warning: Source addition issue: ${error}`);
    // Continue — notebook may still have enough context
  }

  // Step 2b: Configure notebook persona for Guardian-quality output
  if (request.persona) {
    try {
      await configureNotebook(notebookId, {
        mode: "detailed",
        persona: request.persona,
        responseLength: "longer",
      });
    } catch (error) {
      console.warn(`[NotebookLM] Warning: Persona configuration failed: ${error}`);
      // Continue — generation will still work with default persona
    }
  }

  // Step 3: Generate slide deck
  const deckFormat = request.audience === "customer-facing" ? "detailed" : "presenter";
  const result = await generateSlideDeck(notebookId, {
    instructions: request.templateInstructions,
    format: deckFormat,
  });

  if (!result.success) {
    console.error(`[NotebookLM] Deck generation failed: ${result.error}`);
    // Clean up the notebook on failure
    try { await deleteNotebook(notebookId); } catch {}
    return result;
  }

  // Return notebookId so the caller can reuse it for multi-artifact generation
  // Caller is responsible for deleting the notebook after all artifacts are done
  return { ...result, notebookId };
}

/**
 * Generate an infographic for a customer using NotebookLM.
 */
export async function generateCustomerInfographic(
  request: CustomerDeckRequest,
  options?: { orientation?: string; detail?: string },
): Promise<GenerateResult> {
  const notebookTitle = `Guardian Info: ${request.customerName} - ${new Date().toISOString().split("T")[0]}`;

  console.log(`[NotebookLM] Starting infographic generation for ${request.customerName}`);

  let notebookId: string;
  try {
    notebookId = await createNotebook(notebookTitle);
  } catch (error) {
    return { success: false, error: `Failed to create notebook: ${error}` };
  }

  try {
    await addSources(notebookId, [
      {
        type: "text",
        content: request.customerData,
        title: `${request.customerName} - Customer Profile`,
      },
    ]);
  } catch (error) {
    console.error(`[NotebookLM] Warning: Source addition issue: ${error}`);
  }

  const orientation = (options?.orientation || "landscape") as "landscape" | "portrait" | "square";
  const detail = (options?.detail || (request.audience === "customer-facing" ? "detailed" : "standard")) as "brief" | "standard" | "detailed";

  const result = await generateInfographic(notebookId, {
    instructions: request.templateInstructions,
    orientation,
    detail,
  });

  if (!result.success) {
    try { await deleteNotebook(notebookId); } catch {}
  }

  return result;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check if NotebookLM CLI is available and authenticated.
 *
 * If auth has expired (PSIDRTS cookies rotate every ~12h), attempts
 * an automatic headless cookie refresh using Playwright before failing.
 */
export async function healthCheck(): Promise<{ ok: boolean; error?: string; cookieAgeHours?: number }> {
  try {
    // Pre-flight: check cookie freshness before hitting the CLI
    let cookieAgeHours: number | undefined;
    try {
      const storageStatePath = path.join(os.homedir(), ".notebooklm", "storage_state.json");
      const stat = await fs.stat(storageStatePath);
      cookieAgeHours = Math.round((Date.now() - stat.mtimeMs) / 3_600_000 * 10) / 10;
      if (cookieAgeHours > 10) {
        console.warn(`[NotebookLM] Cookie file is ${cookieAgeHours}h old — auth may expire soon`);
      }
    } catch {
      // storage_state.json doesn't exist — CLI is not authenticated
      console.warn("[NotebookLM] No storage_state.json found — CLI may not be authenticated");
    }

    const result = await execCLI(["list"], 10_000);

    if (result.exitCode === 0) {
      return { ok: true, cookieAgeHours };
    }

    // Log raw CLI output for diagnostics
    console.error(`[NotebookLM] healthCheck failed: exit=${result.exitCode} stdout="${result.stdout.substring(0, 300)}" stderr="${result.stderr.substring(0, 300)}"`);

    // Pass stdout to parseError — the CLI writes errors to stdout, not stderr
    const error = parseError(result.stderr, result.exitCode, result.stdout);

    // If auth error, try automatic cookie refresh before giving up
    if (error.code === "AUTH_EXPIRED") {
      console.log("[NotebookLM] Auth expired, attempting automatic cookie refresh...");
      const refreshed = await refreshNotebookLMCookies();

      if (refreshed) {
        const retryResult = await execCLI(["list"], 10_000);
        if (retryResult.exitCode === 0) {
          console.log("[NotebookLM] Cookie refresh successful, auth restored.");
          return { ok: true };
        }
        // Refresh ran but CLI still fails — parse the new error
        const retryError = parseError(retryResult.stderr, retryResult.exitCode, retryResult.stdout);
        return { ok: false, error: retryError.message };
      }

      return {
        ok: false,
        error: "Authentication expired. Automatic refresh failed — run 'notebooklm login' manually (delete ~/.notebooklm/browser_profile/ first for a clean login).",
      };
    }

    return { ok: false, error: error.message };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// =============================================================================
// MULTI-ARTIFACT ORCHESTRATOR (Phase 8, D-06)
// =============================================================================

/**
 * Orchestrate multi-artifact generation for a single customer job.
 *
 * D-06: Reusable entry point called from both the new POST route
 *       (/api/ai/generate-customer-artifacts) and the legacy
 *       processDeckWithNotebookLM path (via Plan 05 refactor).
 * D-07: Sequential, fail-tolerant. Order is fixed: deck → infographic → audio → report.
 *       Each generator is wrapped in try/catch; a per-artifact failure marks that
 *       artifact as 'failed' and continues to the next one.
 * D-08: Artifacts are independent. Deck failure does NOT abort infographic/audio/report —
 *       they all read from the notebook's sources directly.
 * D-17: Reports stay inline in the reportMarkdown column. No Supabase upload for reports.
 * D-22: Best-effort NotebookLM-side cleanup — deleteNotebook() inside try/catch after
 *       all requested artifacts reach a terminal state.
 *
 * NOTE: This function does NOT upload artifacts to Supabase — that's the caller's
 * responsibility. It writes per-artifact status transitions to ScheduledDeck but
 * leaves url/storagePath writes to the caller (which owns uploadToSupabase in
 * deck-processing.ts). This avoids a circular dep notebooklm → deck-processing.
 *
 * The caller receives outcomes with `outputPath` (for deck/infographic/audio) or
 * `markdown` (for report) and is responsible for:
 *   1. Uploading outputPath files via uploadToSupabase with the correct prefix
 *   2. Writing the returned url/storagePath to ScheduledDeck
 *   3. Unlinking the temp file
 *   4. Persisting reportMarkdown to the DB column
 *
 * SECURITY: The caller is responsible for verifying that `jobId` belongs to the
 * authenticated rep's customer (via assertCustomerAccess) BEFORE invoking this
 * function. The orchestrator is a library function with no auth checks of its own.
 */
export async function generateCustomerArtifacts(
  input: GenerateCustomerArtifactsInput,
): Promise<GenerateCustomerArtifactsResult> {
  const { jobId, customerName, requestedArtifacts, deckRequest } = input;
  let notebookId: string | null = input.notebookId ?? null;
  const outcomes: ArtifactOutcome[] = [];

  console.log(
    `[MultiArtifact] Starting orchestration for job ${jobId} (${customerName}) — artifacts: ${requestedArtifacts.join(", ")}`,
  );

  // --- Step 1: Create or reuse the notebook ---
  if (!notebookId) {
    try {
      const notebookTitle = `Guardian Artifacts: ${customerName} - ${new Date().toISOString().split("T")[0]}`;
      notebookId = await createNotebook(notebookTitle);
      console.log(`[MultiArtifact] Created notebook ${notebookId} for job ${jobId}`);

      // Persist notebookId immediately so stuck-job sweep can clean it up on failure
      await prisma.scheduledDeck.update({
        where: { id: jobId },
        data: { notebookId },
      });

      // Add sources
      const sources: NotebookSource[] = [
        {
          type: "text",
          content: deckRequest.customerData,
          title: `${customerName} - Customer Profile`,
        },
      ];
      if (deckRequest.weatherHistory) {
        sources.push({
          type: "text",
          content: deckRequest.weatherHistory,
          title: `${customerName} - Weather History`,
        });
      }
      if (deckRequest.additionalSources) {
        for (const extra of deckRequest.additionalSources) {
          sources.push({ type: "text", content: extra.content, title: extra.title });
        }
      }
      await addSources(notebookId, sources);
      console.log(`[MultiArtifact] Added ${sources.length} sources to notebook ${notebookId}`);

      // Configure persona (non-fatal — generation still works with default persona)
      if (deckRequest.persona) {
        try {
          await configureNotebook(notebookId, {
            mode: "detailed",
            persona: deckRequest.persona,
            responseLength: "longer",
          });
        } catch (personaErr) {
          console.warn(`[MultiArtifact] Persona configuration failed (non-fatal):`, personaErr);
        }
      }
    } catch (setupErr) {
      const errorMessage = setupErr instanceof Error ? setupErr.message : String(setupErr);
      console.error(`[MultiArtifact] Notebook setup failed for job ${jobId}:`, errorMessage);
      return {
        notebookId,
        aborted: true,
        abortReason: `Notebook setup failed: ${errorMessage}`,
        outcomes: [],
      };
    }
  } else {
    console.log(`[MultiArtifact] Reusing existing notebook ${notebookId} for job ${jobId}`);
    // Persist reused notebookId in case it wasn't already on the row
    await prisma.scheduledDeck
      .update({
        where: { id: jobId },
        data: { notebookId },
      })
      .catch(() => {});
  }

  const artifactConfigs = deckRequest.artifactConfigs ?? [];

  // --- Step 2: Fixed sequential order (D-07) ---
  // Deck → Infographic → Audio → Report. Unrequested artifacts are skipped.
  // The fixed order array is type-safe: every value is a member of the ArtifactType
  // union, so the computed `${type}Status` key is guaranteed to be a valid column name.
  const order: ArtifactType[] = ["deck", "infographic", "audio", "report"];

  for (const type of order) {
    if (!requestedArtifacts.includes(type)) {
      continue; // Caller marks these 'skipped' in the DB
    }

    // Transition this artifact to 'processing' so the stuck-job sweep sees it
    // T-08-07: computed key is type-safe — no user input reaches the column name
    await prisma.scheduledDeck.update({
      where: { id: jobId },
      data: {
        [`${type}Status`]: "processing" as ArtifactStatus,
      } as Prisma.ScheduledDeckUpdateInput,
    });

    try {
      console.log(`[MultiArtifact] Generating ${type} for job ${jobId}...`);

      if (type === "deck") {
        // Use generateSlideDeck directly against the reused notebook
        const deckFormat = deckRequest.audience === "customer-facing" ? "detailed" : "presenter";
        const result = await generateSlideDeck(notebookId, {
          instructions: deckRequest.templateInstructions,
          format: deckFormat,
        });
        if (result.success && result.outputPath) {
          outcomes.push({ type: "deck", status: "ready", outputPath: result.outputPath });
        } else {
          outcomes.push({
            type: "deck",
            status: "failed",
            error: result.error ?? "Deck generation failed",
          });
        }
      } else if (type === "infographic") {
        const cfg = artifactConfigs.find((c) => c.type === "infographic");
        const result = await generateInfographic(notebookId, {
          instructions: cfg?.description ?? deckRequest.templateInstructions,
          orientation: (cfg?.orientation ?? "landscape") as
            | "landscape"
            | "portrait"
            | "square",
          detail: (cfg?.detail ??
            (deckRequest.audience === "customer-facing" ? "detailed" : "standard")) as
            | "brief"
            | "standard"
            | "detailed",
        });
        if (result.success && result.outputPath) {
          outcomes.push({
            type: "infographic",
            status: "ready",
            outputPath: result.outputPath,
          });
        } else {
          outcomes.push({
            type: "infographic",
            status: "failed",
            error: result.error ?? "Infographic generation failed",
          });
        }
      } else if (type === "audio") {
        const cfg = artifactConfigs.find((c) => c.type === "audio");
        const result = await generateAudio(notebookId, {
          instructions: cfg?.description,
          format: cfg?.format,
          length: cfg?.length,
        });
        if (result.success && result.outputPath) {
          outcomes.push({ type: "audio", status: "ready", outputPath: result.outputPath });
        } else {
          outcomes.push({
            type: "audio",
            status: "failed",
            error: result.error ?? "Audio generation failed",
          });
        }
      } else if (type === "report") {
        const cfg = artifactConfigs.find((c) => c.type === "report");
        const result = await generateReport(notebookId, {
          format: cfg?.format,
          appendInstructions: cfg?.appendInstructions,
          description: cfg?.description,
        });
        if (result.success && result.outputPath) {
          // D-17: read markdown inline, don't upload to Supabase
          const markdown = await fs.readFile(result.outputPath, "utf-8");
          // Best-effort unlink — temp file is no longer needed once content is in memory
          fs.unlink(result.outputPath).catch(() => {});
          outcomes.push({ type: "report", status: "ready", markdown });
        } else {
          outcomes.push({
            type: "report",
            status: "failed",
            error: result.error ?? "Report generation failed",
          });
        }
      }
    } catch (artifactErr) {
      // D-07/D-08: per-artifact failure does NOT abort the loop
      const errorMessage =
        artifactErr instanceof Error ? artifactErr.message : String(artifactErr);
      console.warn(`[MultiArtifact] ${type} generation threw for job ${jobId}:`, errorMessage);
      outcomes.push({ type, status: "failed", error: errorMessage });
    }
  }

  // --- Step 3: Best-effort notebook cleanup (D-22) ---
  if (notebookId) {
    try {
      await deleteNotebook(notebookId);
      console.log(`[MultiArtifact] Cleaned up notebook ${notebookId} for job ${jobId}`);
      // Clear notebookId on the row after successful cleanup so the sweep won't retry
      await prisma.scheduledDeck
        .update({
          where: { id: jobId },
          data: { notebookId: null },
        })
        .catch(() => {});
    } catch (cleanupErr) {
      console.warn(
        `[MultiArtifact] Failed to clean up notebook ${notebookId}:`,
        cleanupErr,
      );
      // notebookId stays on the row so the stuck-job sweep can retry cleanup later
    }
  }

  console.log(
    `[MultiArtifact] Orchestration complete for job ${jobId}: ${outcomes
      .map((o) => `${o.type}=${o.status}`)
      .join(", ")}`,
  );

  return { notebookId, aborted: false, outcomes };
}
