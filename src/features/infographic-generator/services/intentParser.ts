/**
 * Intent Parser Service
 *
 * Classifies natural language input into structured TopicModule selections
 * and audience inference for Mode 3 (conversational) infographic generation.
 *
 * Uses the AI Router classify task (Claude Haiku) for multi-label module
 * classification, with a keyword-based fallback if the AI call fails.
 */

import { getAIRouter } from "@/lib/services/ai/router";
import type {
  TopicModule,
  InfographicAudience,
} from "../types/infographic.types";

// -----------------------------------------------------------------------------
// Intent Parse Result
// -----------------------------------------------------------------------------

/**
 * Result of parsing a natural language input into structured parameters.
 */
export interface IntentParseResult {
  modules: TopicModule[];
  audience: InfographicAudience;
  confidence: number;
}

// -----------------------------------------------------------------------------
// Available Topic Modules
// -----------------------------------------------------------------------------

/**
 * Full set of available topic modules for infographic generation.
 * These are the building blocks that presets compose from (Phase 3).
 * Each module maps to a data source function and visual element description.
 */
export const AVAILABLE_MODULES: TopicModule[] = [
  {
    id: "property-overview",
    label: "Property Overview",
    dataSource: "getPropertyIntelData",
    requiresWebSearch: false,
    visualElement: "Property photo with key stats overlay",
  },
  {
    id: "roof-assessment",
    label: "Roof Assessment",
    dataSource: "getPropertyIntelData",
    requiresWebSearch: false,
    visualElement: "Roof condition indicators and age timeline",
  },
  {
    id: "storm-timeline",
    label: "Storm History",
    dataSource: "getStormHistoryTimeline",
    requiresWebSearch: false,
    visualElement: "Timeline of storm events with severity indicators",
  },
  {
    id: "lead-scoring",
    label: "Lead Scoring",
    dataSource: "getCustomerOverviewStats",
    requiresWebSearch: false,
    visualElement: "Score gauges and trend indicators",
  },
  {
    id: "interaction-history",
    label: "Interaction History",
    dataSource: "daysSinceLastContact",
    requiresWebSearch: false,
    visualElement: "Contact timeline with outcome icons",
  },
  {
    id: "next-steps",
    label: "Next Steps",
    dataSource: "getCustomerOverviewStats",
    requiresWebSearch: false,
    visualElement: "Action item checklist with priority indicators",
  },
  {
    id: "live-weather",
    label: "Live Weather",
    dataSource: "getStormHistoryTimeline",
    requiresWebSearch: true,
    visualElement: "Current conditions and forecast panel",
  },
  {
    id: "neighborhood-context",
    label: "Neighborhood Context",
    dataSource: "neighborhoodConversionRate",
    requiresWebSearch: false,
    visualElement: "Neighborhood conversion map and stats",
  },
  {
    id: "insurance-status",
    label: "Insurance Status",
    dataSource: "insuranceDeadlineCountdown",
    requiresWebSearch: false,
    visualElement: "Claim status timeline with deadline countdown",
  },
  {
    id: "carrier-intel",
    label: "Carrier Intel",
    dataSource: "getCustomerOverviewStats",
    requiresWebSearch: true,
    visualElement: "Carrier approval rates and strategy notes",
  },
  {
    id: "competitor-landscape",
    label: "Competitor Landscape",
    dataSource: "getCustomerOverviewStats",
    requiresWebSearch: false,
    visualElement: "Competitive positioning comparison grid",
  },
  {
    id: "company-credentials",
    label: "Company Credentials",
    dataSource: "getCustomerTitleData",
    requiresWebSearch: false,
    visualElement: "Certifications, warranties, and trust indicators",
  },
  {
    id: "contact-info",
    label: "Contact Info",
    dataSource: "getCustomerTitleData",
    requiresWebSearch: false,
    visualElement: "Rep contact card with QR code",
  },
];

// -----------------------------------------------------------------------------
// Audience Detection
// -----------------------------------------------------------------------------

/**
 * Language patterns that indicate customer-facing audience.
 * Case-insensitive matching against user input.
 */
const CUSTOMER_FACING_SIGNALS: string[] = [
  "send to",
  "share with",
  "for the homeowner",
  "for the customer",
  "leave behind",
  "leave-behind",
  "hand out",
  "give to",
  "email to customer",
  "show the customer",
];

/**
 * Infers audience from natural language input by checking for customer-facing signals.
 * Defaults to 'internal' when no customer-facing signals are detected.
 */
function inferAudience(text: string): InfographicAudience {
  const lowerText = text.toLowerCase();
  const isCustomerFacing = CUSTOMER_FACING_SIGNALS.some((signal) =>
    lowerText.includes(signal),
  );
  return isCustomerFacing ? "customer-facing" : "internal";
}

// -----------------------------------------------------------------------------
// Keyword Fallback
// -----------------------------------------------------------------------------

/**
 * Keyword-to-module mapping used as fallback when AI Router is unavailable.
 */
const KEYWORD_MODULE_MAP: Record<string, string[]> = {
  weather: ["live-weather"],
  storm: ["storm-timeline"],
  insurance: ["insurance-status"],
  roof: ["roof-assessment"],
  property: ["property-overview"],
  competitor: ["competitor-landscape"],
  meeting: ["insurance-status", "carrier-intel"],
  lead: ["lead-scoring"],
  contact: ["interaction-history", "contact-info"],
  neighborhood: ["neighborhood-context"],
  credential: ["company-credentials"],
  carrier: ["carrier-intel"],
};

/**
 * Falls back to keyword matching when AI classification is unavailable.
 * Scans input text for known keywords and maps to module IDs.
 */
function keywordFallback(text: string): TopicModule[] {
  const lowerText = text.toLowerCase();
  const matchedIds = new Set<string>();

  for (const [keyword, moduleIds] of Object.entries(KEYWORD_MODULE_MAP)) {
    if (lowerText.includes(keyword)) {
      moduleIds.forEach((id) => matchedIds.add(id));
    }
  }

  if (matchedIds.size === 0) {
    return getDefaultModules();
  }

  return AVAILABLE_MODULES.filter((m) => matchedIds.has(m.id));
}

/**
 * Returns the default module set when no specific modules are identified.
 */
function getDefaultModules(): TopicModule[] {
  const defaultIds = [
    "property-overview",
    "storm-timeline",
    "lead-scoring",
    "next-steps",
  ];
  return AVAILABLE_MODULES.filter((m) => defaultIds.includes(m.id));
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

/**
 * Parses natural language input into structured TopicModule selections and audience.
 * Uses AI Router classify (Claude Haiku) for multi-label classification with
 * keyword-based fallback on error.
 *
 * @param text - Natural language description of desired infographic content
 * @returns IntentParseResult with modules, audience, and confidence score
 */
export async function parseIntent(text: string): Promise<IntentParseResult> {
  const audience = inferAudience(text);

  try {
    const router = getAIRouter();
    const result = await router.classify({
      text,
      categories: AVAILABLE_MODULES.map((m) => m.id),
      multiLabel: true,
    });

    // Filter by confidence threshold
    const matchedCategories = result.categories.filter(
      (c) => c.confidence >= 0.3,
    );

    if (matchedCategories.length === 0) {
      // No modules above threshold -- use defaults
      return {
        modules: getDefaultModules(),
        audience,
        confidence: 0.3,
      };
    }

    // Map category labels back to TopicModule objects
    const modules = matchedCategories
      .map((c) => AVAILABLE_MODULES.find((m) => m.id === c.label))
      .filter((m): m is TopicModule => m !== undefined);

    if (modules.length === 0) {
      return {
        modules: getDefaultModules(),
        audience,
        confidence: 0.3,
      };
    }

    // Calculate average confidence across matched modules
    const avgConfidence =
      matchedCategories.reduce((sum, c) => sum + c.confidence, 0) /
      matchedCategories.length;

    return {
      modules,
      audience,
      confidence: avgConfidence,
    };
  } catch (error) {
    // AI Router unavailable -- fall back to keyword matching
    console.error("[IntentParser] AI classification failed, using keyword fallback:", error);

    const modules = keywordFallback(text);
    return {
      modules,
      audience,
      confidence: 0.5,
    };
  }
}
