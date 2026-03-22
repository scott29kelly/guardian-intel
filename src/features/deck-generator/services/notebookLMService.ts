/**
 * NotebookLM Service
 *
 * TypeScript bridge to the NotebookLM Python API via scripts/notebooklm-bridge.py.
 * Handles notebook creation, customer research, and slide content generation
 * using NotebookLM's deep research capabilities.
 *
 * Used by both on-demand deck generation (via API route) and batch processing
 * (via deck-worker). Includes Redis caching for notebook IDs to avoid
 * recreating notebooks for the same customer.
 */

import type {
  CustomerData,
  WeatherEvent,
} from "./aiSlideGenerator";

// =============================================================================
// Types
// =============================================================================

export interface NotebookLMRequest {
  action: "generate" | "research" | "cleanup";
  customer?: CustomerData;
  weatherEvents?: WeatherEvent[];
  intelItems?: Array<{ title: string; content: string; priority: string }>;
  notebookId?: string;
  sections?: string[];
}

export interface NotebookLMSectionResult {
  title?: string;
  stats?: Array<{
    label: string;
    value: string;
    insight: string;
    icon: string;
  }>;
  bottomLine?: string;
  points?: Array<{
    topic: string;
    script: string;
    priority: string;
    timing: string;
  }>;
  keyInsight?: string;
  items?: Array<{
    objection?: string;
    response?: string;
    followUp?: string;
    action?: string;
    timing?: string;
    script?: string;
    icon?: string;
    priority: string;
  }>;
  proactiveTip?: string;
  events?: Array<{
    date: string;
    title: string;
    description: string;
    status: string;
    damageRisk: string;
    opportunity: string;
  }>;
  summary?: {
    totalEvents: number;
    highRiskEvents: number;
    claimOpportunity: string;
    urgencyLevel: string;
    recommendation: string;
  };
  highlights?: Array<{
    label: string;
    value: string;
    detail: string;
    risk: string;
  }>;
  primaryGoal?: string;
  fallbackPlan?: string;
  error?: string;
  raw?: string;
}

export interface NotebookLMResponse {
  success: boolean;
  notebookId?: string;
  sections?: Record<string, NotebookLMSectionResult>;
  deckArtifact?: Record<string, unknown> | null;
  customerName?: string;
  error?: string;
  errorType?: string;
}

export interface NotebookLMProgress {
  type: "progress" | "error";
  stage?: string;
  section?: string;
  notebookId?: string;
  message?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const PYTHON_CMD = process.env.NOTEBOOKLM_PYTHON_CMD || "python3";
const BRIDGE_SCRIPT = process.env.NOTEBOOKLM_BRIDGE_SCRIPT || "scripts/notebooklm-bridge.py";
const PROCESS_TIMEOUT_MS = parseInt(process.env.NOTEBOOKLM_TIMEOUT_MS || "300000"); // 5 minutes

// All sections that NotebookLM can research
const NOTEBOOKLM_SECTIONS = [
  "customer-overview",
  "talking-points",
  "objection-handling",
  "storm-exposure",
  "recommended-actions",
  "property-intel",
];

// =============================================================================
// Bridge Execution
// =============================================================================

/**
 * Execute the NotebookLM Python bridge script with the given request.
 * Streams progress events via onProgress callback.
 */
export async function executeNotebookLM(
  request: NotebookLMRequest,
  options?: {
    onProgress?: (progress: NotebookLMProgress) => void;
    timeoutMs?: number;
  }
): Promise<NotebookLMResponse> {
  // Dynamic import to avoid bundling child_process in client code
  const { spawn } = await import("child_process");
  const path = await import("path");

  const scriptPath = path.resolve(process.cwd(), BRIDGE_SCRIPT);
  const timeout = options?.timeoutMs || PROCESS_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_CMD, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        stderr += line + "\n";
        try {
          const progress = JSON.parse(line) as NotebookLMProgress;
          options?.onProgress?.(progress);
        } catch {
          // Non-JSON stderr output — just log it
          console.error("[NotebookLM Bridge]", line);
        }
      }
    });

    proc.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(
          `NotebookLM bridge exited with code ${code}. stderr: ${stderr.slice(0, 500)}`
        ));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim()) as NotebookLMResponse;
        resolve(result);
      } catch (e) {
        reject(new Error(
          `Failed to parse NotebookLM bridge output: ${e}. stdout: ${stdout.slice(0, 500)}`
        ));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn NotebookLM bridge: ${err.message}`));
    });

    // Write request JSON to stdin
    const input = JSON.stringify(request);
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Generate full deck content using NotebookLM.
 * Creates a notebook, adds customer data, researches all sections,
 * and optionally generates a slide deck artifact.
 */
export async function generateDeckWithNotebookLM(
  customer: CustomerData,
  weatherEvents: WeatherEvent[],
  options?: {
    sections?: string[];
    notebookId?: string;
    intelItems?: Array<{ title: string; content: string; priority: string }>;
    onProgress?: (progress: NotebookLMProgress) => void;
  }
): Promise<NotebookLMResponse> {
  const request: NotebookLMRequest = {
    action: "generate",
    customer,
    weatherEvents,
    intelItems: options?.intelItems,
    notebookId: options?.notebookId,
    sections: options?.sections || NOTEBOOKLM_SECTIONS,
  };

  return executeNotebookLM(request, {
    onProgress: options?.onProgress,
  });
}

/**
 * Research-only mode — get deep insights without slide deck artifact.
 * Faster than full generate, good for on-demand requests.
 */
export async function researchWithNotebookLM(
  customer: CustomerData,
  weatherEvents: WeatherEvent[],
  sections?: string[],
  options?: {
    notebookId?: string;
    onProgress?: (progress: NotebookLMProgress) => void;
  }
): Promise<NotebookLMResponse> {
  const request: NotebookLMRequest = {
    action: "research",
    customer,
    weatherEvents,
    notebookId: options?.notebookId,
    sections: sections || NOTEBOOKLM_SECTIONS,
  };

  return executeNotebookLM(request, {
    onProgress: options?.onProgress,
  });
}

/**
 * Clean up a notebook when it's no longer needed.
 */
export async function cleanupNotebook(notebookId: string): Promise<void> {
  await executeNotebookLM({
    action: "cleanup",
    notebookId,
  });
}

/**
 * Check if NotebookLM is available (Python installed, credentials configured).
 */
export async function isNotebookLMAvailable(): Promise<boolean> {
  try {
    const { execSync } = await import("child_process");
    execSync(`${PYTHON_CMD} -c "import notebooklm"`, { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export { NOTEBOOKLM_SECTIONS };
