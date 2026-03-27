/**
 * Deck Processing Service
 *
 * Shared pipeline for processing ScheduledDeck jobs via NotebookLM.
 * Used by both the /api/decks/process-now route (immediate) and
 * the /api/cron/process-scheduled-decks route (batch).
 */

import { prisma } from "@/lib/prisma";
import {
  generateCustomerDeck,
  generateCustomerInfographic,
  generateAudio,
  generateInfographic,
  generateReport,
  deleteNotebook,
  healthCheck,
} from "@/lib/services/notebooklm/index";
import type { CustomerDeckRequest } from "@/lib/services/notebooklm/index";
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
  deckId: string,
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
    const path = `decks/${deckId}/${storageName}`;

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

    // Step 4: Branch on requestedArtifacts
    const requestedArtifacts: string[] = deck.requestedArtifacts || ["slide-deck"];
    const needsSlideDeck = requestedArtifacts.includes("slide-deck");

    // =========================================================================
    // INFOGRAPHIC-ONLY PATH (no slide deck)
    // =========================================================================
    if (!needsSlideDeck) {
      console.log(`[DeckProcessing] Infographic-only path for ${deck.customerName}`);
      const infographicConfig = artifactConfigs.find((c: { type: string }) => c.type === "infographic");

      const infoResult = await generateCustomerInfographic(deckRequest, {
        orientation: infographicConfig?.orientation,
        detail: infographicConfig?.detail,
      });

      if (!infoResult.success || !infoResult.outputPath) {
        throw new Error(infoResult.error || "Infographic generation failed");
      }

      const uploaded = await uploadToSupabase(
        deckId,
        infoResult.outputPath,
        `${deck.customerName.replace(/\s+/g, "-")}-infographic.png`,
        "image/png",
      );

      fs.unlink(infoResult.outputPath).catch(() => {});

      const processingTimeMs = Date.now() - startTime;
      await prisma.scheduledDeck.update({
        where: { id: deckId },
        data: {
          status: "completed",
          infographicUrl: uploaded.url,
          ...(uploaded.storagePath ? { infographicStoragePath: uploaded.storagePath } : {}),
          resultPayload: JSON.stringify({ infographicOnly: true, infographicUrl: uploaded.url }),
          completedAt: new Date(),
          processingTimeMs,
        },
      });

      console.log(`[DeckProcessing] Infographic-only completed for ${deck.customerName} in ${processingTimeMs}ms`);
      await sendDeckCompletionNotification(deck.requestedById, deck.customerName, deckId);
      return { success: true, deckId, processingTimeMs };
    }

    // =========================================================================
    // SLIDE DECK PATH (existing)
    // =========================================================================
    console.log(`[DeckProcessing] Calling NotebookLM for ${deck.customerName}...`);
    const result = await generateCustomerDeck(deckRequest);

    if (!result.success || !result.outputPath) {
      throw new Error(result.error || "NotebookLM generation failed");
    }

    // Step 5: Convert PDF to slide images
    console.log(`[DeckProcessing] Converting PDF to images from: ${result.outputPath}`);
    let slideImages: string[] = [];
    let pdfData: string | undefined;

    try {
      slideImages = await pdfToImages(result.outputPath);
      console.log(`[DeckProcessing] Converted ${slideImages.length} slide images`);
    } catch (conversionError) {
      console.error("[DeckProcessing] PDF-to-image conversion failed:", conversionError);
      console.error("[DeckProcessing] PDF path preserved for debugging:", result.outputPath);
      const pdfBuffer = await fs.readFile(result.outputPath);
      pdfData = pdfBuffer.toString("base64");
      console.log(`[DeckProcessing] Stored PDF as base64 fallback (${Math.round(pdfBuffer.length / 1024)}KB)`);
    }

    // Step 6: Upload PDF to Supabase Storage (if configured)
    let pdfUrl: string | undefined;
    let pdfStoragePath: string | undefined;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "deck-pdfs";
        const storagePath = `decks/${deckId}/${deck.customerName.replace(/\s+/g, "-")}.pdf`;

        const pdfBuffer = await fs.readFile(result.outputPath);
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(storagePath);
          pdfUrl = urlData.publicUrl;
          pdfStoragePath = storagePath;
          console.log(`[DeckProcessing] PDF uploaded to: ${pdfUrl}`);
        } else {
          console.warn("[DeckProcessing] PDF upload failed:", uploadError.message);
        }
      }
    } catch (uploadErr) {
      console.warn("[DeckProcessing] Supabase upload error:", uploadErr);
    }

    // Clean up temp PDF (only if images were extracted successfully)
    if (slideImages.length > 0) {
      fs.unlink(result.outputPath).catch(() => {});
    } else {
      console.log(`[DeckProcessing] Keeping PDF for debugging: ${result.outputPath}`);
    }

    // =========================================================================
    // Step 6b: Generate additional requested artifacts (reuse the same notebook)
    // =========================================================================
    const notebookId = result.notebookId;
    let audioUrl: string | undefined;
    let audioStoragePath: string | undefined;
    let infographicUrl: string | undefined;
    let infographicStoragePath: string | undefined;
    let reportMarkdown: string | undefined;

    if (notebookId && artifactConfigs.length > 0) {
      // Multi-artifact path: generate additional artifacts, then clean up notebook
      console.log(`[DeckProcessing] Processing ${artifactConfigs.length} additional artifact configs...`);

      // Generate audio if requested
      const audioConfig = artifactConfigs.find((c: { type: string }) => c.type === "audio");
      if (audioConfig) {
        console.log(`[DeckProcessing] Generating audio briefing...`);
        try {
          const audioResult = await generateAudio(notebookId, {
            instructions: audioConfig.description,
            format: audioConfig.format,
            length: audioConfig.length,
          });
          if (audioResult.success && audioResult.outputPath) {
            const uploaded = await uploadToSupabase(
              deckId,
              audioResult.outputPath,
              `${deck.customerName.replace(/\s+/g, "-")}-audio.mp3`,
              "audio/mpeg",
            );
            audioUrl = uploaded.url;
            audioStoragePath = uploaded.storagePath;
            console.log(`[DeckProcessing] Audio uploaded: ${audioUrl || "upload skipped (no Supabase)"}`);
            fs.unlink(audioResult.outputPath).catch(() => {});
          } else {
            console.warn(`[DeckProcessing] Audio generation failed: ${audioResult.error}`);
          }
        } catch (audioErr) {
          console.warn("[DeckProcessing] Audio generation error:", audioErr);
        }
      }

      // Generate infographic if requested
      const infographicConfig = artifactConfigs.find((c: { type: string }) => c.type === "infographic");
      if (infographicConfig) {
        console.log(`[DeckProcessing] Generating infographic...`);
        try {
          const infoResult = await generateInfographic(notebookId, {
            instructions: infographicConfig.description,
            orientation: infographicConfig.orientation as "landscape" | "portrait" | "square" | undefined,
            detail: infographicConfig.detail as "brief" | "standard" | "detailed" | undefined,
          });
          if (infoResult.success && infoResult.outputPath) {
            const uploaded = await uploadToSupabase(
              deckId,
              infoResult.outputPath,
              `${deck.customerName.replace(/\s+/g, "-")}-infographic.png`,
              "image/png",
            );
            infographicUrl = uploaded.url;
            infographicStoragePath = uploaded.storagePath;
            console.log(`[DeckProcessing] Infographic uploaded: ${infographicUrl || "upload skipped (no Supabase)"}`);
            fs.unlink(infoResult.outputPath).catch(() => {});
          } else {
            console.warn(`[DeckProcessing] Infographic generation failed: ${infoResult.error}`);
          }
        } catch (infoErr) {
          console.warn("[DeckProcessing] Infographic generation error:", infoErr);
        }
      }

      // Generate report if requested
      const reportConfig = artifactConfigs.find((c: { type: string }) => c.type === "report");
      if (reportConfig) {
        console.log(`[DeckProcessing] Generating written report...`);
        try {
          const reportResult = await generateReport(notebookId, {
            format: reportConfig.format,
            appendInstructions: reportConfig.appendInstructions,
            description: reportConfig.description,
          });
          if (reportResult.success && reportResult.outputPath) {
            reportMarkdown = await fs.readFile(reportResult.outputPath, "utf-8");
            console.log(`[DeckProcessing] Report generated (${reportMarkdown.length} chars)`);
            fs.unlink(reportResult.outputPath).catch(() => {});
          } else {
            console.warn(`[DeckProcessing] Report generation failed: ${reportResult.error}`);
          }
        } catch (reportErr) {
          console.warn("[DeckProcessing] Report generation error:", reportErr);
        }
      }

      // Clean up the notebook now that all artifacts are generated
      try {
        await deleteNotebook(notebookId);
        console.log(`[DeckProcessing] Cleaned up notebook ${notebookId}`);
      } catch {
        console.warn(`[DeckProcessing] Failed to clean up notebook ${notebookId}`);
      }
    } else if (notebookId) {
      // No additional artifacts requested — clean up notebook from slide deck generation
      try {
        await deleteNotebook(notebookId);
        console.log(`[DeckProcessing] Cleaned up notebook ${notebookId}`);
      } catch {
        console.warn(`[DeckProcessing] Failed to clean up notebook ${notebookId}`);
      }
    }

    // Step 7: Build result payload
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
      // Otherwise the DB row balloons to 10MB+ and every status poll transfers it.
      ...(pdfData && !pdfUrl ? { pdfData } : {}),
      // Multi-artifact URLs (included in payload so DeckPreview can render them)
      ...(audioUrl ? { audioUrl } : {}),
      ...(infographicUrl ? { infographicUrl } : {}),
      ...(reportMarkdown ? { reportMarkdown } : {}),
      metadata: {
        totalSlides: slideImages.length,
        generationTimeMs: processingTimeMs,
        version: "2.0.0",
        pipeline: "NotebookLM",
      },
    };

    // Step 8: Update ScheduledDeck with all artifact URLs
    await prisma.scheduledDeck.update({
      where: { id: deckId },
      data: {
        status: "completed",
        resultPayload: JSON.stringify(resultPayload),
        completedAt: new Date(),
        actualSlides: slideImages.length,
        processingTimeMs,
        ...(pdfUrl ? { pdfUrl } : {}),
        ...(pdfStoragePath ? { pdfStoragePath } : {}),
        ...(audioUrl ? { audioUrl } : {}),
        ...(audioStoragePath ? { audioStoragePath } : {}),
        ...(infographicUrl ? { infographicUrl } : {}),
        ...(infographicStoragePath ? { infographicStoragePath } : {}),
        ...(reportMarkdown ? { reportMarkdown } : {}),
      },
    });

    console.log(`[DeckProcessing] Completed deck ${deckId} in ${processingTimeMs}ms (${slideImages.length} slides)`);

    // Step 9: Send push notification
    await sendDeckCompletionNotification(deck.requestedById, deck.customerName, deckId);

    return {
      success: true,
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

    // Notify user of failure
    await sendDeckFailureNotification(deck.requestedById, deck.customerName, deckId);

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

async function sendDeckCompletionNotification(
  userId: string,
  customerName: string,
  deckId: string
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload: {
          title: "Deck Ready",
          body: `Your deck for ${customerName} is ready to view.`,
          tag: `deck-${deckId}`,
          data: {
            type: "deal",
            url: `/decks?deckId=${deckId}`,
            entityId: deckId,
          },
        },
        userIds: [userId],
        type: "specific",
      }),
    });
  } catch (err) {
    console.warn("[DeckProcessing] Failed to send completion notification:", err);
  }
}

async function sendDeckFailureNotification(
  userId: string,
  customerName: string,
  deckId: string
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;

    await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload: {
          title: "Deck Generation Failed",
          body: `The deck for ${customerName} could not be generated. You can retry from the deck panel.`,
          tag: `deck-${deckId}`,
          data: {
            type: "deal",
            url: `/decks?deckId=${deckId}`,
            entityId: deckId,
          },
        },
        userIds: [userId],
        type: "specific",
      }),
    });
  } catch (err) {
    console.warn("[DeckProcessing] Failed to send failure notification:", err);
  }
}
