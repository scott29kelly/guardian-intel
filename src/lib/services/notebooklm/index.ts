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
} from "./types";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";

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
export async function useNotebook(notebookId: string): Promise<void> {
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
  await useNotebook(notebookId);

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
  await useNotebook(notebookId);

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
  await useNotebook(notebookId);

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
  const maxWaitMs = 540_000; // 9 minutes polling
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

    if (dlCheck.exitCode === 0 && dlCheck.stdout.toLowerCase().includes("would download")) {
      console.log(`[NotebookLM] Slide deck ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }

    // Log progress periodically
    if (elapsed % 60 < pollIntervalMs / 1000) {
      console.log(`[NotebookLM] Still generating... (${elapsed}s elapsed)`);
    }
  }

  if (!artifactReady) {
    return { success: false, error: `Slide deck generation timed out after ${maxWaitMs / 1000}s` };
  }

  // Step 3: Download the generated deck
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-deck-${Date.now()}.pdf`);
  const dlResult = await execCLI(["download", "slide-deck", outputPath, "--latest"]);

  if (dlResult.exitCode !== 0) {
    console.error(`[NotebookLM] download failed: stdout=${dlResult.stdout.substring(0, 200)} stderr=${dlResult.stderr.substring(0, 200)}`);
    return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
  }

  console.log(`[NotebookLM] Slide deck saved to: ${outputPath}`);
  return { success: true, outputPath };
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
  await useNotebook(notebookId);

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
  const maxWaitMs = 540_000;
  const pollIntervalMs = 15_000;
  const startTime = Date.now();
  let artifactReady = false;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const dlCheck = await execCLI(
      ["download", "infographic", "--dry-run", "--latest"],
      15_000
    );

    if (dlCheck.exitCode === 0 && dlCheck.stdout.toLowerCase().includes("would download")) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[NotebookLM] Infographic ready after ${elapsed}s`);
      artifactReady = true;
      break;
    }
  }

  if (!artifactReady) {
    return { success: false, error: `Infographic generation timed out after ${maxWaitMs / 1000}s` };
  }

  // Step 3: Download
  const outputPath = options.outputPath || path.join(os.tmpdir(), `nlm-infographic-${Date.now()}.png`);
  const dlResult = await execCLI(["download", "infographic", outputPath, "--latest"]);

  if (dlResult.exitCode !== 0) {
    console.error(`[NotebookLM] download failed: stdout=${dlResult.stdout.substring(0, 200)} stderr=${dlResult.stderr.substring(0, 200)}`);
    return { success: false, error: `Download failed: ${dlResult.stderr || dlResult.stdout}` };
  }

  console.log(`[NotebookLM] Infographic saved to: ${outputPath}`);
  return { success: true, outputPath };
}

// =============================================================================
// HIGH-LEVEL DECK GENERATION PIPELINE
// =============================================================================

export interface CustomerDeckRequest {
  customerName: string;
  customerData: string; // Formatted text summary of customer data
  weatherHistory?: string; // Formatted weather events
  templateInstructions: string; // What kind of deck to generate
  audience: "internal" | "customer-facing";
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

  // Step 2: Add customer data as sources
  try {
    const sources: NotebookSource[] = [
      {
        type: "text",
        content: request.customerData,
        title: `${request.customerName} - Customer Profile`,
      },
    ];

    if (request.weatherHistory) {
      sources.push({
        type: "text",
        content: request.weatherHistory,
        title: `${request.customerName} - Weather History`,
      });
    }

    await addSources(notebookId, sources);
  } catch (error) {
    console.error(`[NotebookLM] Warning: Source addition issue: ${error}`);
    // Continue — notebook may still have enough context
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
  }

  return result;
}

/**
 * Generate an infographic for a customer using NotebookLM.
 */
export async function generateCustomerInfographic(
  request: CustomerDeckRequest
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

  const result = await generateInfographic(notebookId, {
    instructions: request.templateInstructions,
    orientation: "landscape",
    detail: request.audience === "customer-facing" ? "detailed" : "standard",
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
export async function healthCheck(): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await execCLI(["list"], 10_000);

    if (result.exitCode === 0) {
      return { ok: true };
    }

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
