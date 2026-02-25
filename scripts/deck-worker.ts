#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
/**
 * Deck Generation Worker
 * 
 * Processes pending ScheduledDeck jobs by:
 * 1. Querying Supabase for pending jobs
 * 2. Generating customer context files
 * 3. Running NotebookLM CLI to create slide decks
 * 4. Uploading PDFs to Supabase Storage
 * 5. Updating job status
 * 
 * Usage:
 *   # Continuous mode (polls every 60s)
 *   npm run deck-worker
 *   
 *   # Process once and exit
 *   npm run deck-worker -- --once
 *   
 *   # Run for specific duration
 *   npm run deck-worker -- --duration=2h
 *   
 *   # Custom poll interval
 *   npm run deck-worker -- --interval=30
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Polling interval in seconds (default: 60)
  pollInterval: parseInt(process.env.DECK_WORKER_INTERVAL || "60"),
  
  // NotebookLM notebook ID (your "Guardian Everything" notebook)
  notebookId: process.env.NOTEBOOKLM_NOTEBOOK_ID || "ed6b52aa-95a6-41b7-9d8a-b8135afcd490",
  
  // Path to notebooklm CLI (in WSL)
  notebooklmCli: process.env.NOTEBOOKLM_CLI || "notebooklm",
  
  // Temporary directory for customer context files
  tempDir: process.env.DECK_WORKER_TEMP || path.join(os.tmpdir(), "guardian-decks"),
  
  // Supabase Storage bucket for PDFs
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "deck-pdfs",
  
  // Max retries for failed jobs
  maxRetries: 3,
  
  // Processing timeout in minutes
  processingTimeout: 10,
};

// =============================================================================
// Clients
// =============================================================================

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for storage
);

// =============================================================================
// Types
// =============================================================================

interface ScheduledDeck {
  id: string;
  customerId: string;
  customerName: string;
  templateId: string;
  templateName: string;
  requestPayload: string;
  status: string;
  retryCount: number;
  createdAt: Date;
}

interface CustomerContext {
  customer: {
    name: string;
    address: { city: string; state: string };
    property: { type: string; yearBuilt: number; squareFootage: number };
    roof: { type: string; age: number; condition: string };
    insurance: { carrier: string; deductible: number };
    scores: { lead: number; urgency: number; profitPotential: number };
  };
  weatherEvents: Array<{ type: string; date: string; severity: string }>;
  intelItems: Array<{ title: string; content: string; priority: string }>;
}

// =============================================================================
// Utility Functions
// =============================================================================

function log(message: string, level: "info" | "warn" | "error" = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️ ",
    warn: "⚠️ ",
    error: "❌",
  }[level];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseArgs(): { once: boolean; duration: number | null; interval: number } {
  const args = process.argv.slice(2);
  let once = false;
  let duration: number | null = null;
  let interval = CONFIG.pollInterval;

  for (const arg of args) {
    if (arg === "--once") {
      once = true;
    } else if (arg.startsWith("--duration=")) {
      const value = arg.split("=")[1];
      const match = value.match(/^(\d+)(h|m|s)?$/);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2] || "m";
        duration = num * (unit === "h" ? 3600 : unit === "m" ? 60 : 1) * 1000;
      }
    } else if (arg.startsWith("--interval=")) {
      interval = parseInt(arg.split("=")[1]) || CONFIG.pollInterval;
    }
  }

  return { once, duration, interval };
}

// =============================================================================
// Core Processing Functions
// =============================================================================

/**
 * Fetch pending jobs from the database
 */
async function fetchPendingJobs(): Promise<ScheduledDeck[]> {
  const jobs = await prisma.scheduledDeck.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
      retryCount: { lt: CONFIG.maxRetries },
    },
    orderBy: [
      { scheduledFor: "asc" },
      { createdAt: "asc" },
    ],
    take: 5, // Process up to 5 at a time
  });

  return jobs as ScheduledDeck[];
}

/**
 * Mark a job as processing (with optimistic locking)
 */
async function claimJob(jobId: string): Promise<boolean> {
  try {
    const result = await prisma.scheduledDeck.updateMany({
      where: {
        id: jobId,
        status: "pending", // Only claim if still pending
      },
      data: {
        status: "processing",
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}

/**
 * Generate a customer context file for NotebookLM
 */
function generateCustomerContextFile(job: ScheduledDeck): string {
  const payload = JSON.parse(job.requestPayload) as { 
    customer: CustomerContext["customer"]; 
    weatherEvents: CustomerContext["weatherEvents"];
    intelItems: CustomerContext["intelItems"];
  };
  
  ensureDir(CONFIG.tempDir);
  
  // Create a markdown file with customer context
  const contextContent = `# Sales Presentation Context: ${payload.customer.name}

## Customer Overview
- **Name:** ${payload.customer.name}
- **Location:** ${payload.customer.address.city}, ${payload.customer.address.state}
- **Property Type:** ${payload.customer.property.type || "Residential"}
- **Year Built:** ${payload.customer.property.yearBuilt || "Unknown"}
- **Square Footage:** ${payload.customer.property.squareFootage?.toLocaleString() || "Unknown"} sq ft

## Roof Information
- **Roof Type:** ${payload.customer.roof.type || "Unknown"}
- **Roof Age:** ${payload.customer.roof.age || "Unknown"} years
- **Condition:** ${payload.customer.roof.condition || "Unknown"}

## Insurance Details
- **Carrier:** ${payload.customer.insurance.carrier || "Unknown"}
- **Deductible:** $${payload.customer.insurance.deductible?.toLocaleString() || "Unknown"}

## Lead Intelligence
- **Lead Score:** ${payload.customer.scores.lead}/100
- **Urgency Score:** ${payload.customer.scores.urgency}/100
- **Profit Potential:** $${payload.customer.scores.profitPotential?.toLocaleString() || "Unknown"}

## Recent Weather Events
${payload.weatherEvents?.length > 0 
  ? payload.weatherEvents.map(e => `- ${e.date}: ${e.type} (${e.severity})`).join("\n")
  : "- No recent weather events recorded"}

## Key Intelligence Items
${payload.intelItems?.length > 0
  ? payload.intelItems.map(i => `### ${i.title}\n${i.content}\n*Priority: ${i.priority}*`).join("\n\n")
  : "- No intelligence items available"}

## Presentation Focus
Based on this customer's profile, the sales presentation should emphasize:
${payload.customer.scores.urgency > 70 ? "- URGENT: Recent storm damage or time-sensitive opportunity" : ""}
${payload.customer.roof.age && payload.customer.roof.age > 15 ? "- Roof age and potential replacement timeline" : ""}
${payload.customer.insurance.carrier ? `- Insurance claim process with ${payload.customer.insurance.carrier}` : ""}
${payload.customer.scores.profitPotential > 15000 ? "- Premium materials and warranty options" : ""}

---
*Generated: ${new Date().toISOString()}*
*Customer ID: ${job.customerId}*
`;

  const filePath = path.join(CONFIG.tempDir, `customer-${job.customerId}-${Date.now()}.md`);
  fs.writeFileSync(filePath, contextContent, "utf-8");
  
  return filePath;
}

/**
 * Run NotebookLM CLI to generate the deck
 */
async function runNotebookLM(contextFilePath: string, job: ScheduledDeck): Promise<string> {
  const outputDir = path.join(CONFIG.tempDir, `output-${job.id}`);
  ensureDir(outputDir);

  log(`Running NotebookLM CLI for job ${job.id}...`);

  // The notebooklm CLI command structure (adjust based on actual CLI)
  // This assumes the CLI can:
  // 1. Add a source to an existing notebook
  // 2. Generate a document/deck from the notebook
  
  const commands = [
    // Add customer context as a source
    `${CONFIG.notebooklmCli} source add --notebook ${CONFIG.notebookId} --file "${contextFilePath}" --title "Customer: ${job.customerName}"`,
    
    // Generate the deck (this might vary based on CLI capabilities)
    `${CONFIG.notebooklmCli} generate --notebook ${CONFIG.notebookId} --type slides --output "${outputDir}" --format pdf`,
  ];

  try {
    for (const cmd of commands) {
      log(`Executing: ${cmd}`);
      execSync(cmd, {
        encoding: "utf-8",
        timeout: CONFIG.processingTimeout * 60 * 1000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    // Find the generated PDF
    const files = fs.readdirSync(outputDir);
    const pdfFile = files.find(f => f.endsWith(".pdf"));
    
    if (!pdfFile) {
      throw new Error("No PDF file generated");
    }

    return path.join(outputDir, pdfFile);
  } catch (error) {
    log(`NotebookLM CLI error: ${error}`, "error");
    throw error;
  }
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadToStorage(pdfPath: string, job: ScheduledDeck): Promise<{ url: string; storagePath: string }> {
  const fileName = `${job.customerId}/${job.id}.pdf`;
  const fileBuffer = fs.readFileSync(pdfPath);

  log(`Uploading PDF to Supabase Storage: ${fileName}`);

  const { data, error } = await supabase.storage
    .from(CONFIG.storageBucket)
    .upload(fileName, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL (or signed URL if bucket is private)
  const { data: urlData } = supabase.storage
    .from(CONFIG.storageBucket)
    .getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    storagePath: fileName,
  };
}

/**
 * Update job status to completed
 */
async function markJobCompleted(
  jobId: string, 
  pdfUrl: string, 
  storagePath: string,
  processingTimeMs: number
) {
  await prisma.scheduledDeck.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      processingTimeMs,
      pdfUrl,
      pdfStoragePath: storagePath,
      resultPayload: JSON.stringify({ pdfUrl, storagePath }),
    },
  });
}

/**
 * Update job status to failed
 */
async function markJobFailed(jobId: string, errorMessage: string) {
  await prisma.scheduledDeck.update({
    where: { id: jobId },
    data: {
      status: "failed",
      errorMessage,
      retryCount: { increment: 1 },
    },
  });
}

/**
 * Process a single job
 */
async function processJob(job: ScheduledDeck): Promise<boolean> {
  const startTime = Date.now();
  log(`Processing job ${job.id} for customer: ${job.customerName}`);

  // Claim the job (prevents double-processing)
  const claimed = await claimJob(job.id);
  if (!claimed) {
    log(`Job ${job.id} was already claimed by another worker`, "warn");
    return false;
  }

  let contextFilePath: string | null = null;

  try {
    // Step 1: Generate customer context file
    contextFilePath = generateCustomerContextFile(job);
    log(`Generated context file: ${contextFilePath}`);

    // Step 2: Run NotebookLM to generate deck
    const pdfPath = await runNotebookLM(contextFilePath, job);
    log(`Generated PDF: ${pdfPath}`);

    // Step 3: Upload to Supabase Storage
    const { url, storagePath } = await uploadToStorage(pdfPath, job);
    log(`Uploaded to storage: ${url}`);

    // Step 4: Mark job as completed
    const processingTimeMs = Date.now() - startTime;
    await markJobCompleted(job.id, url, storagePath, processingTimeMs);
    
    log(`✅ Job ${job.id} completed in ${(processingTimeMs / 1000).toFixed(1)}s`);
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Job ${job.id} failed: ${errorMessage}`, "error");
    await markJobFailed(job.id, errorMessage);
    return false;

  } finally {
    // Cleanup temp files
    if (contextFilePath && fs.existsSync(contextFilePath)) {
      try {
        fs.unlinkSync(contextFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Main processing loop
 */
async function processPendingJobs(): Promise<number> {
  const jobs = await fetchPendingJobs();
  
  if (jobs.length === 0) {
    return 0;
  }

  log(`Found ${jobs.length} pending job(s)`);
  
  let processed = 0;
  for (const job of jobs) {
    const success = await processJob(job);
    if (success) processed++;
  }

  return processed;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const { once, duration, interval } = parseArgs();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Guardian Intel - Deck Generation Worker             ║
╠═══════════════════════════════════════════════════════════════╣
║  Mode: ${once ? "Once (process and exit)" : duration ? `Duration (${duration / 1000}s)` : "Continuous"}
║  Poll Interval: ${interval}s
║  Notebook ID: ${CONFIG.notebookId.slice(0, 8)}...
║  Storage Bucket: ${CONFIG.storageBucket}
╚═══════════════════════════════════════════════════════════════╝
`);

  // Verify environment
  if (!process.env.DATABASE_URL) {
    log("DATABASE_URL not set!", "error");
    process.exit(1);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log("Supabase credentials not set!", "error");
    process.exit(1);
  }

  // Check NotebookLM CLI availability
  try {
    execSync(`which ${CONFIG.notebooklmCli}`, { stdio: "pipe" });
    log(`NotebookLM CLI found: ${CONFIG.notebooklmCli}`);
  } catch {
    log(`NotebookLM CLI not found at: ${CONFIG.notebooklmCli}`, "warn");
    log("Make sure the CLI is installed and in your PATH");
  }

  ensureDir(CONFIG.tempDir);
  log(`Temp directory: ${CONFIG.tempDir}`);

  const startTime = Date.now();
  let totalProcessed = 0;

  // One-time mode
  if (once) {
    log("Running in one-time mode...");
    totalProcessed = await processPendingJobs();
    log(`Processed ${totalProcessed} job(s). Exiting.`);
    await prisma.$disconnect();
    return;
  }

  // Continuous or duration mode
  log("Starting polling loop...");
  
  const shouldContinue = () => {
    if (duration) {
      return Date.now() - startTime < duration;
    }
    return true; // Continuous mode
  };

  while (shouldContinue()) {
    try {
      const processed = await processPendingJobs();
      totalProcessed += processed;
      
      if (processed === 0) {
        log(`No pending jobs. Sleeping for ${interval}s...`);
      }
    } catch (error) {
      log(`Error in processing loop: ${error}`, "error");
    }

    // Wait for next poll
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
  }

  log(`Worker finished. Total jobs processed: ${totalProcessed}`);
  await prisma.$disconnect();
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  log("\nReceived SIGINT. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log("\nReceived SIGTERM. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Run
main().catch(async (error) => {
  log(`Fatal error: ${error}`, "error");
  await prisma.$disconnect();
  process.exit(1);
});
