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
  propertyValue?: number;
  insuranceCarrier?: string;
  policyType?: string;
  deductible?: number;
  leadScore?: number;
  urgencyScore?: number;
  stage?: string;
  status?: string;
  leadSource?: string;
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
    "",
    "## Insurance Information",
    c.insuranceCarrier ? `- Carrier: ${c.insuranceCarrier}` : null,
    c.policyType ? `- Policy Type: ${c.policyType}` : null,
    c.deductible ? `- Deductible: $${c.deductible.toLocaleString()}` : null,
    "",
    "## Sales Intelligence",
    c.leadScore != null ? `- Lead Score: ${c.leadScore}/100` : null,
    c.urgencyScore != null ? `- Urgency Score: ${c.urgencyScore}/100` : null,
    c.stage ? `- Pipeline Stage: ${c.stage}` : null,
    c.status ? `- Status: ${c.status}` : null,
    c.leadSource ? `- Lead Source: ${c.leadSource}` : null,
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
// PDF CONVERSION
// =============================================================================

/**
 * Convert a PDF file to an array of base64 PNG images (one per page).
 */
export async function pdfToImages(pdfPath: string): Promise<string[]> {
  const { pdf } = await import("pdf-to-img");

  const images: string[] = [];
  const pdfBuffer = await fs.readFile(pdfPath);

  const document = await pdf(pdfBuffer, {
    scale: 2, // 2x for crisp images at 1280x720-ish
  });

  for await (const page of document) {
    images.push(Buffer.from(page).toString("base64"));
  }

  return images;
}
