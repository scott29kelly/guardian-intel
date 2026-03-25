/**
 * NotebookLM Data Formatters
 *
 * Shared helpers for formatting customer data into NotebookLM-friendly
 * markdown and converting generated PDFs to slide images.
 */

import * as fs from "fs/promises";

// =============================================================================
// CUSTOMER DATA FORMATTING
// =============================================================================

interface CustomerData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  roofType?: string;
  roofAge?: number;
  roofCondition?: string;
  roofPitch?: string;
  roofSquares?: number;
  propertyValue?: number;
  insuranceCarrier?: string;
  policyType?: string;
  deductible?: number;
  claimHistory?: number;
  leadScore?: number;
  urgencyScore?: number;
  profitPotential?: number;
  churnRisk?: number;
  engagementScore?: number;
  stage?: string;
  status?: string;
  leadSource?: string;
  estimatedJobValue?: number;
}

interface WeatherEvent {
  eventType: string;
  eventDate: string;
  severity?: string;
  hailSize?: number;
  windSpeed?: number;
  damageReported?: boolean;
  claimFiled?: boolean;
}

/**
 * Format customer data as markdown for a NotebookLM notebook source.
 */
export function formatCustomerDataForNotebook(customerData: CustomerData): string {
  const c = customerData;
  const lines = [
    `# Customer Profile: ${c.firstName} ${c.lastName}`,
    "",
    "## Property Information",
    `- Address: ${c.address}, ${c.city}, ${c.state} ${c.zipCode}`,
    c.propertyType ? `- Property Type: ${c.propertyType}` : null,
    c.yearBuilt ? `- Year Built: ${c.yearBuilt}` : null,
    c.squareFootage ? `- Square Footage: ${c.squareFootage.toLocaleString()} sq ft` : null,
    c.propertyValue ? `- Property Value: $${c.propertyValue.toLocaleString()}` : null,
    "",
    "## Roof Details",
    c.roofType ? `- Roof Type: ${c.roofType}` : null,
    c.roofAge ? `- Roof Age: ${c.roofAge} years` : null,
    c.roofCondition ? `- Roof Condition: ${c.roofCondition}` : null,
    c.roofPitch ? `- Roof Pitch: ${c.roofPitch}` : null,
    c.roofSquares ? `- Roof Squares: ${c.roofSquares}` : null,
    "",
    "## Insurance Information",
    c.insuranceCarrier ? `- Carrier: ${c.insuranceCarrier}` : null,
    c.policyType ? `- Policy Type: ${c.policyType}` : null,
    c.deductible ? `- Deductible: $${c.deductible.toLocaleString()}` : null,
    c.claimHistory != null ? `- Prior Claims: ${c.claimHistory}` : null,
    "",
    "## Sales Intelligence",
    c.leadScore != null ? `- Lead Score: ${c.leadScore}/100` : null,
    c.urgencyScore != null ? `- Urgency Score: ${c.urgencyScore}/100` : null,
    c.profitPotential != null ? `- Profit Potential: ${c.profitPotential}/100` : null,
    c.churnRisk != null ? `- Churn Risk: ${c.churnRisk}/100` : null,
    c.engagementScore != null ? `- Engagement Score: ${c.engagementScore}/100` : null,
    c.stage ? `- Pipeline Stage: ${c.stage}` : null,
    c.status ? `- Status: ${c.status}` : null,
    c.leadSource ? `- Lead Source: ${c.leadSource}` : null,
    c.estimatedJobValue ? `- Estimated Job Value: $${c.estimatedJobValue.toLocaleString()}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * Format weather events as markdown for a NotebookLM notebook source.
 */
export function formatWeatherHistoryForNotebook(
  events: WeatherEvent[] | undefined
): string {
  if (!events || events.length === 0) return "";

  const lines = [
    "# Weather & Storm History",
    "",
    ...events.map((e) => {
      const parts = [
        `## ${e.eventType} — ${new Date(e.eventDate).toLocaleDateString()}`,
        e.severity ? `- Severity: ${e.severity}` : null,
        e.hailSize ? `- Hail Size: ${e.hailSize} inches` : null,
        e.windSpeed ? `- Wind Speed: ${e.windSpeed} mph` : null,
        `- Damage Reported: ${e.damageReported ? "Yes" : "No"}`,
        `- Claim Filed: ${e.claimFiled ? "Yes" : "No"}`,
        "",
      ];
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

// =============================================================================
// CLAIMS & INTEL FORMATTING
// =============================================================================

interface ClaimData {
  id?: string;
  carrier?: string;
  dateOfLoss?: string;
  claimType?: string;
  status?: string;
  approvedValue?: number;
}

interface IntelItem {
  id?: string;
  category?: string;
  title?: string;
  content?: string;
  priority?: string;
  confidence?: number;
}

/**
 * Format insurance claims as markdown for NotebookLM source.
 */
export function formatClaimsForNotebook(
  claims: ClaimData[] | undefined
): string {
  if (!claims || claims.length === 0) return "";

  const lines = [
    "# Insurance Claims History",
    "",
    ...claims.map((c) => {
      const parts = [
        `## ${c.claimType || "Claim"} — ${c.dateOfLoss ? new Date(c.dateOfLoss).toLocaleDateString() : "Date unknown"}`,
        c.carrier ? `- Carrier: ${c.carrier}` : null,
        c.status ? `- Status: ${c.status}` : null,
        c.approvedValue ? `- Approved Value: $${c.approvedValue.toLocaleString()}` : null,
        "",
      ];
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

/**
 * Format intel items as markdown for NotebookLM source.
 */
export function formatIntelItemsForNotebook(
  items: IntelItem[] | undefined
): string {
  if (!items || items.length === 0) return "";

  const lines = [
    "# Intelligence & Insights",
    "",
    ...items.map((item) => {
      const parts = [
        `## ${item.title || "Intel"}${item.priority ? ` [${item.priority.toUpperCase()}]` : ""}`,
        item.category ? `- Category: ${item.category}` : null,
        item.content ? `- ${item.content}` : null,
        item.confidence != null ? `- Confidence: ${item.confidence}%` : null,
        "",
      ];
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

// =============================================================================
// PHOTO FORMATTING
// =============================================================================

interface PhotoData {
  id?: string;
  url?: string;
  category?: string;
  description?: string;
  aiAnalysis?: Record<string, unknown> | string;
  createdAt?: string;
}

/**
 * Format property photos as markdown for NotebookLM source.
 * Includes AI damage analysis when available.
 */
export function formatPhotosForNotebook(
  photos: PhotoData[] | undefined
): string {
  if (!photos || photos.length === 0) return "";

  const lines = [
    "# Property Photos & Damage Documentation",
    "",
    ...photos.map((p) => {
      const analysis = typeof p.aiAnalysis === "string"
        ? p.aiAnalysis
        : p.aiAnalysis
          ? JSON.stringify(p.aiAnalysis, null, 2)
          : null;
      const parts = [
        `## ${p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Photo"}${p.createdAt ? ` — ${new Date(p.createdAt).toLocaleDateString()}` : ""}`,
        p.description ? `- Description: ${p.description}` : null,
        analysis ? `- AI Analysis: ${analysis}` : null,
        "",
      ];
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

// =============================================================================
// CARRIER INTELLIGENCE FORMATTING
// =============================================================================

interface CarrierClaimStats {
  carrier: string;
  zipCode: string;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  avgApprovedValue: number;
  avgSupplementValue: number;
  supplementSuccessRate: number;
}

/**
 * Format aggregated carrier approval/denial stats as markdown for NotebookLM.
 * Gives NotebookLM the data needed to generate negotiation points.
 */
export function formatCarrierIntelForNotebook(
  stats: CarrierClaimStats | undefined,
  comparableClaims: ClaimData[] | undefined
): string {
  if (!stats) return "";

  const approvalRate = stats.totalClaims > 0
    ? ((stats.approvedClaims / stats.totalClaims) * 100).toFixed(1)
    : "N/A";

  const lines = [
    "# Carrier Intelligence Report",
    "",
    `## ${stats.carrier} — ${stats.zipCode} Area`,
    `- Total Claims Analyzed: ${stats.totalClaims}`,
    `- Approval Rate: ${approvalRate}%`,
    `- Average Approved Value: $${stats.avgApprovedValue.toLocaleString()}`,
    `- Supplement Success Rate: ${(stats.supplementSuccessRate * 100).toFixed(1)}%`,
    `- Average Supplement Value: $${stats.avgSupplementValue.toLocaleString()}`,
    "",
  ];

  if (comparableClaims && comparableClaims.length > 0) {
    lines.push("## Comparable Approved Properties");
    lines.push("");
    comparableClaims.forEach((c) => {
      const parts = [
        `### ${c.claimType || "Claim"} — ${c.dateOfLoss ? new Date(c.dateOfLoss).toLocaleDateString() : "Date unknown"}`,
        c.carrier ? `- Carrier: ${c.carrier}` : null,
        c.status ? `- Status: ${c.status}` : null,
        c.approvedValue ? `- Approved Value: $${c.approvedValue.toLocaleString()}` : null,
        "",
      ];
      lines.push(parts.filter(Boolean).join("\n"));
    });
  }

  return lines.join("\n");
}

// =============================================================================
// MULTI-CUSTOMER FORMATTING (Territory / Neighborhood)
// =============================================================================

interface CustomerSummary {
  name: string;
  address: string;
  roofAge?: number;
  roofType?: string;
  roofCondition?: string;
  insuranceCarrier?: string;
  urgencyScore?: number;
  leadScore?: number;
  profitPotential?: number;
  estimatedJobValue?: number;
  status?: string;
  stage?: string;
  recentStormExposure?: string;
}

/**
 * Format multiple customer summaries for territory/neighborhood analysis.
 * Used by Storm Command Center and Neighborhood Canvass decks.
 */
export function formatNeighborhoodCustomersForNotebook(
  customers: CustomerSummary[] | undefined,
  context?: { regionName?: string; stormEvent?: string }
): string {
  if (!customers || customers.length === 0) return "";

  const header = context?.stormEvent
    ? `# Territory Analysis — ${context.stormEvent}`
    : context?.regionName
      ? `# Territory Analysis — ${context.regionName}`
      : "# Territory Analysis";

  const lines = [
    header,
    "",
    `Total Properties: ${customers.length}`,
    "",
    ...customers.map((c, i) => {
      const parts = [
        `## ${i + 1}. ${c.name}`,
        `- Address: ${c.address}`,
        c.roofAge != null ? `- Roof Age: ${c.roofAge} years` : null,
        c.roofType ? `- Roof Type: ${c.roofType}` : null,
        c.roofCondition ? `- Roof Condition: ${c.roofCondition}` : null,
        c.insuranceCarrier ? `- Insurance: ${c.insuranceCarrier}` : null,
        c.urgencyScore != null ? `- Urgency Score: ${c.urgencyScore}/100` : null,
        c.leadScore != null ? `- Lead Score: ${c.leadScore}/100` : null,
        c.profitPotential != null ? `- Profit Potential: $${c.profitPotential.toLocaleString()}` : null,
        c.estimatedJobValue ? `- Est. Job Value: $${c.estimatedJobValue.toLocaleString()}` : null,
        c.status ? `- Status: ${c.status}` : null,
        c.recentStormExposure ? `- Recent Storm: ${c.recentStormExposure}` : null,
        "",
      ];
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

// =============================================================================
// MULTI-CUSTOMER DIGEST (Morning Briefing)
// =============================================================================

interface CustomerDigestEntry {
  name: string;
  address: string;
  urgencyScore?: number;
  leadScore?: number;
  stage?: string;
  estimatedJobValue?: number;
  lastContactDate?: string;
  lastContactType?: string;
  lastContactOutcome?: string;
  nextAction?: string;
  nextActionDate?: string;
  recentIntel?: string[];
  recentStorms?: string[];
}

/**
 * Format top priority customers with interaction history for morning digest.
 * Gives NotebookLM rich per-customer context to generate briefing slides.
 */
export function formatMultiCustomerDigestForNotebook(
  customers: CustomerDigestEntry[] | undefined,
  repName?: string
): string {
  if (!customers || customers.length === 0) return "";

  const lines = [
    `# Morning Briefing${repName ? ` for ${repName}` : ""}`,
    "",
    `Priority Customers: ${customers.length}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    "",
    ...customers.map((c, i) => {
      const parts = [
        `## ${i + 1}. ${c.name}`,
        `- Address: ${c.address}`,
        c.urgencyScore != null ? `- Urgency: ${c.urgencyScore}/100` : null,
        c.leadScore != null ? `- Lead Score: ${c.leadScore}/100` : null,
        c.stage ? `- Stage: ${c.stage}` : null,
        c.estimatedJobValue ? `- Est. Value: $${c.estimatedJobValue.toLocaleString()}` : null,
        c.lastContactDate ? `- Last Contact: ${new Date(c.lastContactDate).toLocaleDateString()} (${c.lastContactType || "unknown"}) — ${c.lastContactOutcome || "no outcome"}` : null,
        c.nextAction ? `- Next Action: ${c.nextAction}${c.nextActionDate ? ` by ${new Date(c.nextActionDate).toLocaleDateString()}` : ""}` : null,
      ];

      if (c.recentIntel && c.recentIntel.length > 0) {
        parts.push(`- Recent Intel:`);
        c.recentIntel.forEach((intel) => parts.push(`  - ${intel}`));
      }

      if (c.recentStorms && c.recentStorms.length > 0) {
        parts.push(`- Recent Storms:`);
        c.recentStorms.forEach((storm) => parts.push(`  - ${storm}`));
      }

      parts.push("");
      return parts.filter(Boolean).join("\n");
    }),
  ];

  return lines.join("\n");
}

// =============================================================================
// PDF CONVERSION
// =============================================================================

/**
 * Convert a PDF file to an array of base64 PNG images (one per page).
 * Retries at lower scale if the first attempt fails (memory/compat issues).
 */
export async function pdfToImages(pdfPath: string): Promise<string[]> {
  const pdfBuffer = await fs.readFile(pdfPath);
  console.log(`[pdfToImages] PDF file size: ${Math.round(pdfBuffer.length / 1024)}KB, path: ${pdfPath}`);

  let lastError: Error | unknown;

  // Try scale 2 first (crisp), then scale 1 (lower memory)
  for (const scale of [2, 1]) {
    try {
      console.log(`[pdfToImages] Attempting conversion at scale=${scale}...`);
      const { pdf } = await import("pdf-to-img");
      const images: string[] = [];
      const document = await pdf(pdfBuffer, { scale });

      for await (const page of document) {
        images.push(Buffer.from(page).toString("base64"));
      }

      if (images.length > 0) {
        console.log(`[pdfToImages] Converted ${images.length} pages at scale=${scale}`);
        return images;
      }
      console.warn(`[pdfToImages] scale=${scale} returned 0 pages`);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      console.error(`[pdfToImages] Failed at scale=${scale}:`, msg);
    }
  }

  throw new Error(`PDF-to-image conversion failed at all scale levels: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
