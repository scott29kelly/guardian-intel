/**
 * Deck Processing Service
 *
 * Shared pipeline for processing ScheduledDeck jobs via NotebookLM.
 * Used by /api/decks/process-now (immediate) and the infographic generation
 * routes (background, fired from inside the route handler).
 *
 * Also exports `recoverStuckDecks` (D-07): a sweep helper called from the
 * deck-status poll endpoint to transition stalled "processing" jobs to
 * "failed" without requiring a separate cron.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  generateCustomerArtifacts,
  healthCheck,
  deleteNotebook,
} from "@/lib/services/notebooklm/index";
import type {
  CustomerDeckRequest,
  ArtifactOutcome,
} from "@/lib/services/notebooklm/index";
import type {
  ArtifactStatus,
  ArtifactType,
} from "@/lib/services/notebooklm/types";
import {
  formatCustomerDataForNotebook,
  formatWeatherHistoryForNotebook,
  formatClaimsForNotebook,
  formatIntelItemsForNotebook,
  formatPhotosForNotebook,
  formatCarrierIntelForNotebook,
  formatNeighborhoodCustomersForNotebook,
  formatMultiCustomerDigestForNotebook,
  pdfToImages,
} from "@/lib/services/notebooklm/formatters";
import { getTemplateById } from "@/features/deck-generator/templates";
import { cacheResult as cacheInfographic } from "@/features/infographic-generator/services/infographicCache";
import * as fs from "fs/promises";

// =============================================================================
// TYPES
// =============================================================================

interface ProcessingResult {
  success: boolean;
  deckId: string;
  error?: string;
  slideCount?: number;
  processingTimeMs?: number;
}

// =============================================================================
// STUCK-JOB RECOVERY (D-07)
// =============================================================================

/**
 * Default stale threshold for stuck-job recovery, in minutes.
 *
 * Rationale: the longest legitimate NotebookLM run is ~12 minutes
 * (see notebooklm/index.ts), so 15 minutes leaves a 3-minute buffer
 * before a job is considered stalled.
 */
const DEFAULT_STALE_MINUTES = 15;

/**
 * Sweep stuck "processing" jobs and mark them as failed.
 *
 * Called from the deck status poll endpoint on every request — cheap
 * single-query updateMany, idempotent, and self-healing without a cron.
 *
 * @param staleMinutes - Jobs with updatedAt older than this many minutes
 *                       are considered stalled. Defaults to 15.
 * @returns The number of jobs that were recovered.
 */
export async function recoverStuckDecks(
  staleMinutes: number = DEFAULT_STALE_MINUTES,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const now = new Date();
  const stallError = "Artifact stalled — recovered by stuck-job sweep";
  let totalRecovered = 0;

  // D-20: per-artifact sweep. Four separate updateMany calls, one per type.
  // Because the orchestrator is sequential, at most one artifact per job is
  // in 'processing' state at any moment. Only the stalled artifact's three
  // columns flip; sibling completed/ready artifacts in the same row stay
  // untouched.
  //
  // D-21: threshold compares against row updatedAt (not createdAt). Every
  // per-artifact transition bumps updatedAt, so a healthy sequential job
  // where each artifact takes ~8 minutes stays out of the sweep.

  // Deck sweep
  const deckResult = await prisma.scheduledDeck.updateMany({
    where: {
      deckStatus: "processing",
      updatedAt: { lt: cutoff },
    },
    data: {
      deckStatus: "failed",
      deckError: stallError,
      deckCompletedAt: now,
    },
  });
  totalRecovered += deckResult.count;

  // Infographic sweep
  const infographicResult = await prisma.scheduledDeck.updateMany({
    where: {
      infographicStatus: "processing",
      updatedAt: { lt: cutoff },
    },
    data: {
      infographicStatus: "failed",
      infographicError: stallError,
      infographicCompletedAt: now,
    },
  });
  totalRecovered += infographicResult.count;

  // Audio sweep
  const audioResult = await prisma.scheduledDeck.updateMany({
    where: {
      audioStatus: "processing",
      updatedAt: { lt: cutoff },
    },
    data: {
      audioStatus: "failed",
      audioError: stallError,
      audioCompletedAt: now,
    },
  });
  totalRecovered += audioResult.count;

  // Report sweep
  const reportResult = await prisma.scheduledDeck.updateMany({
    where: {
      reportStatus: "processing",
      updatedAt: { lt: cutoff },
    },
    data: {
      reportStatus: "failed",
      reportError: stallError,
      reportCompletedAt: now,
    },
  });
  totalRecovered += reportResult.count;

  if (totalRecovered > 0) {
    console.warn(
      `[DeckProcessing] Recovered ${totalRecovered} stuck artifact(s) older than ${staleMinutes} minutes ` +
        `(deck=${deckResult.count}, infographic=${infographicResult.count}, audio=${audioResult.count}, report=${reportResult.count})`,
    );
  }

  // D-22: best-effort NotebookLM-side cleanup. Find rows where all per-artifact
  // statuses are terminal (ready/failed/skipped/null) AND notebookId is still set,
  // then attempt deleteNotebook for each. Failures are logged but never block.
  //
  // "Terminal" here means: NOT 'pending' and NOT 'processing'. A null value
  // counts as terminal (artifact was never requested or was skipped).
  try {
    const orphanCandidates = await prisma.scheduledDeck.findMany({
      where: {
        notebookId: { not: null },
        AND: [
          { deckStatus: { notIn: ["pending", "processing"] } },
          { infographicStatus: { notIn: ["pending", "processing"] } },
          { audioStatus: { notIn: ["pending", "processing"] } },
          { reportStatus: { notIn: ["pending", "processing"] } },
        ],
      },
      select: { id: true, notebookId: true },
      take: 20, // bound the sweep cost on every status poll
    });

    for (const candidate of orphanCandidates) {
      if (!candidate.notebookId) continue;
      try {
        await deleteNotebook(candidate.notebookId);
        await prisma.scheduledDeck.update({
          where: { id: candidate.id },
          data: { notebookId: null },
        });
        console.log(`[DeckProcessing] Cleaned up orphaned notebook ${candidate.notebookId} for job ${candidate.id}`);
      } catch (cleanupErr) {
        console.warn(
          `[DeckProcessing] Failed to clean up orphaned notebook ${candidate.notebookId} for job ${candidate.id}:`,
          cleanupErr,
        );
      }
    }
  } catch (orphanErr) {
    // Orphan query failure must never block the sweep — log and continue
    console.warn("[DeckProcessing] Orphan notebook query failed (non-fatal):", orphanErr);
  }

  return totalRecovered;
}

/** Guardian Roofing notebook persona — shapes all artifacts from the notebook */
const GUARDIAN_PERSONA = `You are an elite tactical sales intelligence analyst for Guardian Roofing. Your audience is experienced field sales reps who need actionable, data-driven briefings to close high-value roofing contracts.

When creating content:
- Lead with the most surprising or high-impact insight from the data
- Cross-reference insurance, weather, and property data to surface non-obvious risks
- Use specific dollar amounts, dates, scores, and percentages — never vague
- Frame everything through a sales lens: what should the rep SAY and DO
- Include objection handlers with psychological reasoning
- Provide step-by-step action timelines with specific deadlines
- Use professional, strategic language — think military intelligence briefing
- Color scheme: dark navy (#1E3A5F) and gold (#D4A656) with teal (#4A90A4) accents`;

// =============================================================================
// SUPABASE UPLOAD HELPER
// =============================================================================

async function uploadToSupabase(
  jobId: string,
  prefix: "decks" | "infographics" | "audio",
  filePath: string,
  storageName: string,
  contentType: string,
): Promise<{ url?: string; storagePath?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return {};

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "deck-pdfs";
    const path = `${prefix}/${jobId}/${storageName}`;

    const buffer = await fs.readFile(filePath);
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return { url: urlData.publicUrl, storagePath: path };
    }
    console.warn(`[DeckProcessing] Upload failed for ${storageName}:`, uploadError.message);
  } catch (err) {
    console.warn(`[DeckProcessing] Supabase upload error for ${storageName}:`, err);
  }
  return {};
}

// =============================================================================
// MAIN PROCESSING FUNCTION
// =============================================================================

/**
 * Process a single ScheduledDeck via NotebookLM.
 *
 * 1. Parse requestPayload for customer data
 * 2. Format data for NotebookLM
 * 3. Generate deck via NotebookLM CLI
 * 4. Convert PDF to slide images
 * 5. Optionally upload PDF to Supabase Storage
 * 6. Update ScheduledDeck record with results
 * 7. Send push notification to requesting user
 */
export async function processDeckWithNotebookLM(
  deckId: string
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Fetch the deck record
  const deck = await prisma.scheduledDeck.findUnique({
    where: { id: deckId },
  });

  if (!deck) {
    return { success: false, deckId, error: "Deck not found" };
  }

  if (deck.status !== "processing") {
    return { success: false, deckId, error: `Unexpected status: ${deck.status}` };
  }

  console.log(`[DeckProcessing] Starting NotebookLM processing for deck ${deckId} (${deck.customerName})`);

  try {
    // Step 1: Check NotebookLM health
    const health = await healthCheck();
    if (!health.ok) {
      throw new Error(`NotebookLM unavailable: ${health.error}`);
    }

    // Step 2: Parse request payload and format for NotebookLM
    const requestData = JSON.parse(deck.requestPayload);
    const customer = requestData.customer;

    const customerDataText = formatCustomerDataForNotebook({
      firstName: customer.firstName,
      lastName: customer.lastName,
      address: customer.address?.street || "",
      city: customer.address?.city || "",
      state: customer.address?.state || "",
      zipCode: customer.address?.zipCode || "",
      propertyType: customer.property?.type,
      yearBuilt: customer.property?.yearBuilt,
      squareFootage: customer.property?.squareFootage,
      roofType: customer.roof?.type,
      roofAge: customer.roof?.age,
      roofCondition: customer.roof?.condition,
      roofPitch: customer.roof?.pitch,
      roofSquares: customer.roof?.squares,
      propertyValue: customer.property?.value,
      insuranceCarrier: customer.insurance?.carrier,
      policyType: customer.insurance?.policyType,
      deductible: customer.insurance?.deductible,
      claimHistory: customer.insurance?.claimHistory,
      leadScore: customer.scores?.lead,
      urgencyScore: customer.scores?.urgency,
      profitPotential: customer.scores?.profitPotential,
      churnRisk: customer.scores?.churnRisk,
      engagementScore: customer.scores?.engagement,
      stage: customer.pipeline?.stage,
      status: customer.pipeline?.status,
      leadSource: customer.pipeline?.leadSource,
      estimatedJobValue: customer.pipeline?.estimatedJobValue,
    });

    const weatherHistoryText = formatWeatherHistoryForNotebook(
      requestData.weatherEvents?.map((e: { type: string; date: string; severity?: string; hailSize?: number; windSpeed?: number }) => ({
        eventType: e.type,
        eventDate: e.date,
        severity: e.severity,
        hailSize: e.hailSize,
        windSpeed: e.windSpeed,
        damageReported: false,
        claimFiled: false,
      }))
    );

    // Format additional context available in requestPayload
    const claimsText = formatClaimsForNotebook(requestData.recentClaims);
    const intelText = formatIntelItemsForNotebook(requestData.intelItems);

    // Format template-specific data when present
    const photosText = requestData.photos
      ? formatPhotosForNotebook(requestData.photos)
      : "";
    const carrierIntelText = requestData.carrierStats
      ? formatCarrierIntelForNotebook(requestData.carrierStats, requestData.comparableClaims)
      : "";
    const neighborhoodText = requestData.neighborhoodCustomers
      ? formatNeighborhoodCustomersForNotebook(requestData.neighborhoodCustomers)
      : "";
    const digestText = requestData.customers
      ? formatMultiCustomerDigestForNotebook(requestData.customers, requestData.repName)
      : "";

    // Build separate sources for richer cross-referencing in NotebookLM
    // Each becomes its own source in the notebook (vs one giant concatenated blob)
    const additionalSources: Array<{ title: string; content: string }> = [];
    if (claimsText) additionalSources.push({ title: `${deck.customerName} - Insurance & Claims`, content: claimsText });
    if (intelText) additionalSources.push({ title: `${deck.customerName} - Intelligence Items`, content: intelText });
    if (carrierIntelText) additionalSources.push({ title: `${deck.customerName} - Carrier Intel`, content: carrierIntelText });
    if (neighborhoodText) additionalSources.push({ title: `${deck.customerName} - Market & Neighborhood`, content: neighborhoodText });
    if (photosText) additionalSources.push({ title: `${deck.customerName} - Property Photos`, content: photosText });
    if (digestText) additionalSources.push({ title: `${deck.customerName} - Multi-Customer Digest`, content: digestText });

    // Step 3: Build template-aware instructions
    const templateInstructions = buildTemplateInstructions(
      deck.templateId,
      deck.templateName,
      deck.customerName,
      requestData
    );

    const template = getTemplateById(deck.templateId);
    const audience = template?.audience === "customer" ? "customer-facing" as const : "internal" as const;

    // Parse artifact configs from request (if user selected additional artifacts)
    const artifactConfigs = requestData.artifactConfigs || [];

    const deckRequest: CustomerDeckRequest = {
      customerName: deck.customerName,
      customerData: customerDataText,
      additionalSources,
      weatherHistory: weatherHistoryText || undefined,
      templateInstructions,
      audience,
      persona: GUARDIAN_PERSONA,
      artifactConfigs,
    };

    // Step 4: Build requestedArtifacts list in ArtifactType format.
    // The DB column uses legacy "slide-deck" naming, but the orchestrator
    // uses the clean ArtifactType union ("deck" | "infographic" | "audio" | "report").
    // Map legacy → canonical here.
    const legacyRequestedArtifacts: string[] = deck.requestedArtifacts || ["slide-deck"];
    const typeMap: Record<string, ArtifactType> = {
      "slide-deck": "deck",
      "deck": "deck",
      "infographic": "infographic",
      "audio": "audio",
      "report": "report",
    };
    const requestedTypes: ArtifactType[] = Array.from(
      new Set(
        legacyRequestedArtifacts
          .map((t) => typeMap[t])
          .filter((t): t is ArtifactType => !!t),
      ),
    );

    if (requestedTypes.length === 0) {
      throw new Error(
        `No valid artifact types in requestedArtifacts: ${JSON.stringify(legacyRequestedArtifacts)}`,
      );
    }

    // Step 5: Delegate to the multi-artifact orchestrator (D-09 — no code duplication)
    const orchestrationResult = await generateCustomerArtifacts({
      jobId: deckId,
      customerName: deck.customerName,
      requestedArtifacts: requestedTypes,
      deckRequest,
    });

    if (orchestrationResult.aborted) {
      throw new Error(orchestrationResult.abortReason || "Orchestration aborted");
    }

    // Step 6: Upload artifacts + write per-artifact URL/status/completedAt columns
    const now = new Date();
    const updateData: Record<string, unknown> = {};
    let slideImages: string[] = [];
    let pdfData: string | undefined;
    let pdfUrl: string | undefined;
    let anyFailed = false;

    for (const outcome of orchestrationResult.outcomes as ArtifactOutcome[]) {
      const completedAtKey = `${outcome.type}CompletedAt`;
      const statusKey = `${outcome.type}Status`;
      const errorKey = `${outcome.type}Error`;

      if (outcome.status === "failed") {
        anyFailed = true;
        updateData[statusKey] = "failed" as ArtifactStatus;
        updateData[errorKey] = outcome.error ?? "Unknown error";
        updateData[completedAtKey] = now;
        continue;
      }

      // status === 'ready' (skipped outcomes are not emitted by the orchestrator,
      // so any non-failed outcome here is terminal-success)
      updateData[statusKey] = "ready" as ArtifactStatus;
      updateData[errorKey] = null;
      updateData[completedAtKey] = now;

      if (outcome.type === "deck" && outcome.outputPath) {
        // Convert PDF to slide images + upload PDF to Supabase under 'decks/' prefix
        try {
          slideImages = await pdfToImages(outcome.outputPath);
          console.log(`[DeckProcessing] Converted ${slideImages.length} slide images`);
        } catch (conversionError) {
          console.error("[DeckProcessing] PDF-to-image conversion failed:", conversionError);
          const pdfBuffer = await fs.readFile(outcome.outputPath);
          pdfData = pdfBuffer.toString("base64");
          console.log(
            `[DeckProcessing] Stored PDF as base64 fallback (${Math.round(pdfBuffer.length / 1024)}KB)`,
          );
        }
        const uploaded = await uploadToSupabase(
          deckId,
          "decks",
          outcome.outputPath,
          `${deck.customerName.replace(/\s+/g, "-")}.pdf`,
          "application/pdf",
        );
        pdfUrl = uploaded.url;
        if (uploaded.url) updateData.pdfUrl = uploaded.url;
        if (uploaded.storagePath) updateData.pdfStoragePath = uploaded.storagePath;
        if (slideImages.length > 0) fs.unlink(outcome.outputPath).catch(() => {});
      } else if (outcome.type === "infographic" && outcome.outputPath) {
        const uploaded = await uploadToSupabase(
          deckId,
          "infographics",
          outcome.outputPath,
          `${deck.customerName.replace(/\s+/g, "-")}-infographic.png`,
          "image/png",
        );
        if (uploaded.url) updateData.infographicUrl = uploaded.url;
        if (uploaded.storagePath) updateData.infographicStoragePath = uploaded.storagePath;
        fs.unlink(outcome.outputPath).catch(() => {});
      } else if (outcome.type === "audio" && outcome.outputPath) {
        const uploaded = await uploadToSupabase(
          deckId,
          "audio",
          outcome.outputPath,
          `${deck.customerName.replace(/\s+/g, "-")}-audio.mp3`,
          "audio/mpeg",
        );
        if (uploaded.url) updateData.audioUrl = uploaded.url;
        if (uploaded.storagePath) updateData.audioStoragePath = uploaded.storagePath;
        fs.unlink(outcome.outputPath).catch(() => {});
      } else if (outcome.type === "report" && outcome.markdown) {
        // D-17: report stays inline in reportMarkdown column
        updateData.reportMarkdown = outcome.markdown;
      }
    }

    // Mark unrequested artifacts as 'skipped'
    const allTypes: ArtifactType[] = ["deck", "infographic", "audio", "report"];
    for (const type of allTypes) {
      if (!requestedTypes.includes(type)) {
        updateData[`${type}Status`] = "skipped" as ArtifactStatus;
      }
    }

    // Best-effort: cache infographic result for fast retrieval on repeat requests
    // (preserves the pre-refactor infographic-only cache behavior)
    if (
      requestedTypes.includes("infographic") &&
      !requestedTypes.includes("deck") &&
      typeof updateData.infographicUrl === "string" &&
      deck.templateId
    ) {
      const presetId = deck.templateId.replace(/^infographic-/, "");
      cacheInfographic(
        {
          customerId: deck.customerId,
          presetId,
          imageUrl: updateData.infographicUrl,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          pipeline: "notebooklm",
        },
        audience,
      ).catch(() => {}); // best-effort
    }

    // D-02: derive top-level status from per-artifact rollup
    const derivedStatus: string = anyFailed ? "failed" : "completed";

    // Step 7: Build resultPayload (backward-compatible for existing UI callers)
    const processingTimeMs = Date.now() - startTime;
    const resultPayload = {
      id: deckId,
      templateId: deck.templateId,
      templateName: deck.templateName,
      generatedAt: new Date().toISOString(),
      context: { customerId: deck.customerId, customerName: deck.customerName },
      pipeline: "NotebookLM",
      slides: slideImages.map((imageData, index) => ({
        id: `${deckId}-slide-${index + 1}`,
        pageNumber: index + 1,
        imageData,
        mimeType: "image/png",
        generatedAt: new Date().toISOString(),
      })),
      // Only embed pdfData in resultPayload if Supabase upload failed (no pdfUrl).
      ...(pdfData && !pdfUrl ? { pdfData } : {}),
      ...(updateData.audioUrl ? { audioUrl: updateData.audioUrl } : {}),
      ...(updateData.infographicUrl ? { infographicUrl: updateData.infographicUrl } : {}),
      ...(updateData.reportMarkdown ? { reportMarkdown: updateData.reportMarkdown } : {}),
      metadata: {
        totalSlides: slideImages.length,
        generationTimeMs: processingTimeMs,
        version: "2.0.0",
        pipeline: "NotebookLM",
      },
    };

    // Step 8: Single atomic DB update — per-artifact columns + top-level rollup.
    //
    // The `as Prisma.ScheduledDeckUpdateInput` cast is type-safe: every key in
    // `updateData` is either a literal Prisma column name or a computed key of
    // the shape `${ArtifactType}Status|Error|CompletedAt`. Because `ArtifactType`
    // is a closed union derived from the TypeScript type system (no user input
    // reaches the key), each computed key is guaranteed at compile-time to be a
    // valid ScheduledDeck column.
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: {
        ...updateData,
        status: derivedStatus,
        resultPayload: JSON.stringify(resultPayload),
        completedAt: now,
        actualSlides: slideImages.length,
        processingTimeMs,
      } as Prisma.ScheduledDeckUpdateInput,
    });

    console.log(
      `[DeckProcessing] Completed job ${deckId} in ${processingTimeMs}ms — status=${derivedStatus}, outcomes: ${orchestrationResult.outcomes
        .map((o) => `${o.type}=${o.status}`)
        .join(", ")}`,
    );

    // Step 9: Single push notification per job (D-10 — overrides NLMA-15 + Phase 10 SC#4)
    await sendArtifactJobCompletionNotification(
      deck.requestedById,
      deck.customerName,
      deckId,
      anyFailed,
    );

    return {
      success: !anyFailed,
      deckId,
      slideCount: slideImages.length,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : (typeof error === "object" && error !== null && "message" in error)
        ? String((error as { message: unknown }).message)
        : `Non-Error thrown: ${JSON.stringify(error)}`;
    console.error(`[DeckProcessing] Failed to process deck ${deckId}:`, errorMessage, error);

    // Mark as failed
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: {
        status: "failed",
        errorMessage,
        retryCount: { increment: 1 },
        processingTimeMs: Date.now() - startTime,
      },
    });

    // Notify user of failure — single notification per job (D-10)
    await sendArtifactJobCompletionNotification(
      deck.requestedById,
      deck.customerName,
      deckId,
      true, // hasFailures
    );

    return { success: false, deckId, error: errorMessage };
  }
}

// =============================================================================
// TEMPLATE INSTRUCTION BUILDER
// =============================================================================

/** Slide-type to prompting guidance — tells NotebookLM what KIND of content to produce */
const SLIDE_TYPE_GUIDANCE: Record<string, string> = {
  title: "Create a bold title slide with the deck name, customer/topic, date, and Guardian Roofing branding.",
  stats: "Present 3-5 headline metrics as large, scannable numbers. Include trend direction (up/down) and brief context for each stat. Prioritize the most actionable data point.",
  list: "Provide a concise, prioritized list. Each item should have a clear headline and a one-line supporting detail. Highlight the most critical items.",
  timeline: "Show events in chronological order with dates, descriptions, and severity/impact markers. Emphasize patterns and escalation.",
  chart: "Visualize the data trend. Include axis labels, a clear title, and a one-sentence insight about what the data shows.",
  image: "Summarize the key visual information. Frame it as what someone needs to know at a glance before taking action.",
  "talking-points": "Generate 3-5 specific, actionable talking points. Each should have: a topic headline, a suggested script (2-3 sentences a rep could say verbatim), and a data point that supports it. Make these feel like they were written by a seasoned sales coach.",
  comparison: "Create a side-by-side comparison with clear column headers and aligned rows. Highlight differentiators.",
  map: "Describe the geographic context — affected areas, proximity, density of activity.",
  quote: "Feature a compelling testimonial or key statement with attribution.",
};

const AUDIENCE_CONTEXT: Record<string, string> = {
  rep: "This is an internal briefing for a field sales rep. Be direct, actionable, and focused on what they need to say and do at the door. Skip corporate fluff.",
  manager: "This is for a sales manager. Balance tactical detail with strategic overview. Highlight coaching opportunities and resource allocation decisions.",
  leadership: "This is for executive leadership. Lead with business impact, revenue implications, and strategic recommendations. Keep tactical details in supporting data.",
  customer: "This is customer-facing. Use professional, reassuring language. Focus on value, expertise, and next steps. Never expose internal scoring or competitive intelligence.",
};

function buildTemplateInstructions(
  templateId: string,
  templateName: string,
  customerName: string,
  requestData: Record<string, unknown>
): string {
  const template = getTemplateById(templateId);

  // Fallback if template not found — still better than the old generic prompt
  if (!template) {
    return `Create a detailed "${templateName}" presentation for Guardian Roofing about ${customerName}.

For each slide:
- Lead with the most important insight, not just restated data
- Include specific numbers, dates, and actionable recommendations
- Make every slide useful enough that a rep could act on it immediately

Style: Dark navy (#1E3A5F) and gold (#D4A656) color scheme. Professional, data-rich, easy to scan.`;
  }

  const enabledSections = template.sections.filter(
    (s) => s.defaultEnabled !== false
  );

  const sectionInstructions = enabledSections
    .map((section, i) => {
      const guidance = SLIDE_TYPE_GUIDANCE[section.type] || "Present the information clearly with actionable detail.";
      const aiNote = section.aiEnhanced ? " Use the source data to generate original analysis — do not just reformat what's given." : "";
      return `Slide ${i + 1} — "${section.title}" (${section.type}):
${guidance}${aiNote}`;
    })
    .join("\n\n");

  const audienceNote = AUDIENCE_CONTEXT[template.audience] || AUDIENCE_CONTEXT.rep;

  return `Create a "${templateName}" presentation for Guardian Roofing about ${customerName}.

AUDIENCE: ${audienceNote}

Generate exactly ${enabledSections.length} slides with this structure:

${sectionInstructions}

QUALITY REQUIREMENTS:
- Every slide must contain ANALYSIS, not just restated data. Transform raw numbers into insights.
- Talking points should sound like a seasoned sales coach wrote them — specific, conversational, backed by data.
- When storm/weather data is provided, connect it to damage likelihood, urgency, and insurance claim potential.
- When lead/urgency scores are high, explain WHY and what action to take.
- Style: Dark navy (#1E3A5F) and gold (#D4A656) color scheme. Clean, data-rich, scannable.`;
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Send ONE push notification per multi-artifact job (D-10).
 *
 * Overrides NLMA-15 and Phase 10 Success Criterion #4. Per user decision,
 * per-artifact notifications are "wearisome and annoying" — a 15-minute
 * max wall time does not justify four separate pushes. One push per job.
 *
 * @param hasFailures - true if ANY artifact in the job failed; controls copy
 */
async function sendArtifactJobCompletionNotification(
  userId: string,
  customerName: string,
  jobId: string,
  hasFailures: boolean,
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    const title = hasFailures ? "Generation Finished with Errors" : "Artifacts Ready";
    const body = hasFailures
      ? `Generation finished with errors for ${customerName}. Tap to review.`
      : `All artifacts ready for ${customerName}.`;

    await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload: {
          title,
          body,
          tag: `artifacts-${jobId}`,
          data: {
            type: "deal",
            url: `/decks?jobId=${jobId}`,
            entityId: jobId,
          },
        },
        userIds: [userId],
        type: "specific",
      }),
    });
  } catch (err) {
    console.warn("[DeckProcessing] Failed to send artifact job notification:", err);
  }
}
