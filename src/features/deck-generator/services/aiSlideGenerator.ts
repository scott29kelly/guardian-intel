/**
 * AI-Powered Slide Content Generator
 *
 * Serves cached NotebookLM results for slide sections.
 * All generation goes through NotebookLM — no other AI paths.
 */

import type {
  SlideType,
  TitleSlideContent,
  StatsSlideContent,
  ListSlideContent,
  TimelineSlideContent,
  TalkingPointsSlideContent,
  ChartSlideContent,
} from '../types/deck.types';

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
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
  assignedRep?: { name: string };
}

export interface WeatherEvent {
  id: string;
  eventDate: string;
  eventType: string;
  severity?: string;
  hailSize?: number;
  windSpeed?: number;
  damageReported?: boolean;
  claimFiled?: boolean;
}

export interface SlideGenerationContext {
  customer: CustomerData;
  weatherEvents?: WeatherEvent[];
  slideType: SlideType;
  sectionId: string;
  sectionTitle: string;
}

// =============================================================================
// AI PROMPT TEMPLATES
// =============================================================================


// =============================================================================
// AI SLIDE GENERATOR
// =============================================================================

/**
 * NotebookLM-enhanced slide content cache.
 * When generateAllSlidesWithNotebookLM() pre-populates this,
 * individual generateAISlideContent() calls resolve instantly
 * from cached NotebookLM research. NotebookLM is the sole
 * generation path -- there is no per-section fallback.
 */
let notebookLMCache: Record<string, Record<string, unknown>> = {};
let notebookLMCacheCustomerId: string | null = null;
let notebookLMNotebookId: string | null = null;

/**
 * Pre-generate all slide content using NotebookLM.
 * Call this once before generating individual slides — it populates the cache
 * so each section resolves instantly from NotebookLM research.
 *
 * Returns false if NotebookLM is unavailable. There is no fallback --
 * generateAISlideContent() will return an empty object for any section
 * that was not pre-populated by this call.
 */
export async function generateAllSlidesWithNotebookLM(
  context: SlideGenerationContext,
  options?: {
    weatherEvents?: WeatherEvent[];
    onProgress?: (stage: string, detail?: string) => void;
  }
): Promise<boolean> {
  try {
    options?.onProgress?.("notebooklm-init", "Connecting to NotebookLM...");

    const response = await fetch("/api/decks/generate-notebooklm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: context.customer,
        weatherEvents: options?.weatherEvents || context.weatherEvents || [],
        mode: "research",
        notebookId: notebookLMNotebookId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `NotebookLM request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.success || !data.sections) {
      console.error("[AISlideGenerator] NotebookLM returned no sections");
      return false;
    }

    // Cache all section results
    notebookLMCache = data.sections;
    notebookLMCacheCustomerId = context.customer.id;
    notebookLMNotebookId = data.notebookId || null;

    options?.onProgress?.("notebooklm-complete", `NotebookLM researched ${Object.keys(data.sections).length} sections`);

    console.log(
      `[AISlideGenerator] NotebookLM pre-generated ${Object.keys(data.sections).length} sections for ${data.customerName}`
    );
    return true;
  } catch (error) {
    console.error("[AISlideGenerator] NotebookLM bridge error:", error);
    return false;
  }
}

/**
 * Clear the NotebookLM cache (e.g., when switching customers).
 */
export function clearNotebookLMCache() {
  notebookLMCache = {};
  notebookLMCacheCustomerId = null;
  // Intentionally keep notebookLMNotebookId for reuse
}

/**
 * Get the cached NotebookLM notebook ID for the current customer.
 */
export function getNotebookLMNotebookId(): string | null {
  return notebookLMNotebookId;
}

export async function generateAISlideContent(
  context: SlideGenerationContext
): Promise<Record<string, unknown>> {
  // NotebookLM is the sole generation path — no fallbacks
  const sectionId = context.sectionId;
  if (
    notebookLMCacheCustomerId === context.customer.id &&
    notebookLMCache[sectionId] &&
    !notebookLMCache[sectionId].error
  ) {
    console.log(`[AISlideGenerator] Using NotebookLM cache for section: ${sectionId}`);
    return notebookLMCache[sectionId];
  }

  // No cached NotebookLM result available for this section
  return {};
}

// =============================================================================
// HELPER: Fetch customer context for AI generation
// =============================================================================

export async function fetchCustomerContext(customerId: string): Promise<{
  customer: CustomerData;
  weatherEvents: WeatherEvent[];
} | null> {
  try {
    const [customerRes, weatherRes] = await Promise.all([
      fetch(`/api/customers/${customerId}`),
      fetch(`/api/customers/${customerId}/weather-events`).catch(() => null),
    ]);

    if (!customerRes.ok) {
      throw new Error('Failed to fetch customer');
    }

    const customerData = await customerRes.json();
    const weatherData = weatherRes?.ok ? await weatherRes.json() : { weatherEvents: [] };

    return {
      customer: customerData.customer,
      weatherEvents: weatherData.weatherEvents || [],
    };
  } catch (error) {
    console.error('Failed to fetch customer context:', error);
    return null;
  }
}
