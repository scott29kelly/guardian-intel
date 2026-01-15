/**
 * Customer Scoring Service
 * Calculates dynamic urgency, churn risk, and profit potential scores
 * based on real customer data signals.
 */

import type { Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";

// Regional pricing per square foot (profit margin after costs)
const REGIONAL_PROFIT_PER_SQFT: Record<string, number> = {
  PA: 4.5,
  NJ: 5.0,
  DE: 4.75,
  MD: 4.5,
  VA: 4.25,
  NY: 5.5,
  DEFAULT: 4.5,
};

// Roof type profit multipliers
const ROOF_TYPE_MULTIPLIERS: Record<string, number> = {
  "Architectural Shingle": 1.15,
  "Asphalt Shingle": 1.0,
  "Metal": 1.4,
  "Slate": 1.6,
  "Cedar Shake": 1.3,
  "Tile": 1.5,
  DEFAULT: 1.0,
};

// Pipeline stage urgency weights
const STAGE_URGENCY_WEIGHTS: Record<string, number> = {
  proposal: 10,
  negotiation: 8,
  qualified: 6,
  contacted: 4,
  new: 2,
  closed: 0,
};

// Pipeline stage churn weights (higher = more likely to churn)
const STAGE_CHURN_WEIGHTS: Record<string, number> = {
  new: 25,
  contacted: 20,
  qualified: 15,
  proposal: 10,
  negotiation: 8,
  closed: 0,
};

interface ScoringInput {
  customer: Customer;
  intelItems?: IntelItem[];
  weatherEvents?: WeatherEvent[];
}

interface ScoringResult {
  urgencyScore: number;
  churnRisk: number;
  retentionScore: number;
  profitPotential: number;
  factors: {
    urgency: UrgencyFactors;
    churn: ChurnFactors;
    profit: ProfitFactors;
  };
}

interface UrgencyFactors {
  roofAgeScore: number;
  stormScore: number;
  claimWindowScore: number;
  contactRecencyScore: number;
  stageScore: number;
}

interface ChurnFactors {
  contactSilenceScore: number;
  quoteAgeScore: number;
  stageScore: number;
  objectionScore: number;
  competitorScore: number;
}

interface ProfitFactors {
  baseProfitPerSqft: number;
  roofTypeMultiplier: number;
  propertyValueFactor: number;
  estimatedProfit: number;
}

/**
 * Calculate all customer scores based on available data
 */
export function calculateCustomerScores(input: ScoringInput): ScoringResult {
  const urgencyFactors = calculateUrgencyFactors(input);
  const churnFactors = calculateChurnFactors(input);
  const profitFactors = calculateProfitFactors(input);

  const urgencyScore = Math.round(
    urgencyFactors.roofAgeScore * 0.25 +
    urgencyFactors.stormScore * 0.30 +
    urgencyFactors.claimWindowScore * 0.20 +
    urgencyFactors.contactRecencyScore * 0.15 +
    urgencyFactors.stageScore * 0.10
  );

  const churnRisk = Math.round(
    churnFactors.contactSilenceScore * 0.30 +
    churnFactors.quoteAgeScore * 0.25 +
    churnFactors.stageScore * 0.20 +
    churnFactors.objectionScore * 0.15 +
    churnFactors.competitorScore * 0.10
  );

  return {
    urgencyScore: clamp(urgencyScore, 0, 100),
    churnRisk: clamp(churnRisk, 0, 100),
    retentionScore: clamp(100 - churnRisk, 0, 100),
    profitPotential: Math.round(profitFactors.estimatedProfit),
    factors: {
      urgency: urgencyFactors,
      churn: churnFactors,
      profit: profitFactors,
    },
  };
}

/**
 * Calculate urgency factors based on timing signals
 */
function calculateUrgencyFactors(input: ScoringInput): UrgencyFactors {
  const { customer, weatherEvents = [] } = input;
  const now = new Date();

  // Roof Age Score (0-100): Higher as roof approaches/exceeds 20 year lifespan
  const roofLifespan = 20;
  const roofAgeRatio = (customer.roofAge ?? 0) / roofLifespan;
  const roofAgeScore = roofAgeRatio >= 1 
    ? 100 
    : Math.min(100, roofAgeRatio * 100 + (roofAgeRatio > 0.8 ? 20 : 0));

  // Storm Score (0-100): Recent storms in area boost urgency
  const recentStorms = weatherEvents.filter(event => {
    const daysSinceEvent = daysBetween(event.eventDate, now);
    return daysSinceEvent <= 30;
  });
  
  let stormScore = 0;
  if (recentStorms.length > 0) {
    const mostRecent = recentStorms.reduce((latest, event) => 
      event.eventDate > latest.eventDate ? event : latest
    );
    const daysSinceStorm = daysBetween(mostRecent.eventDate, now);
    
    // Full score within 7 days, decays over 30 days
    if (daysSinceStorm <= 7) {
      stormScore = 100;
    } else if (daysSinceStorm <= 14) {
      stormScore = 85;
    } else if (daysSinceStorm <= 30) {
      stormScore = 60;
    }
    
    // Boost for severe events
    if (mostRecent.severity === "severe" || mostRecent.severity === "extreme") {
      stormScore = Math.min(100, stormScore + 15);
    }
    
    // Boost for reported damage
    if (mostRecent.damageReported) {
      stormScore = Math.min(100, stormScore + 10);
    }
  }

  // Claim Window Score (0-100): Insurance claims typically have 1-year window
  // Higher urgency if they have recent storm + no claim filed yet
  let claimWindowScore = 0;
  const unfiledClaimStorms = weatherEvents.filter(
    event => event.damageReported && !event.claimFiled
  );
  if (unfiledClaimStorms.length > 0) {
    const oldestUnfiled = unfiledClaimStorms.reduce((oldest, event) =>
      event.eventDate < oldest.eventDate ? event : oldest
    );
    const daysSinceEvent = daysBetween(oldestUnfiled.eventDate, now);
    const claimWindowDays = 365;
    const daysRemaining = claimWindowDays - daysSinceEvent;
    
    if (daysRemaining <= 30) {
      claimWindowScore = 100; // Urgent: window closing soon
    } else if (daysRemaining <= 90) {
      claimWindowScore = 80;
    } else if (daysRemaining <= 180) {
      claimWindowScore = 50;
    } else {
      claimWindowScore = 30;
    }
  }

  // Contact Recency Score (0-100): Decays if not contacted recently
  const daysSinceContact = daysBetween(customer.lastContact ?? new Date(), now);
  let contactRecencyScore = 100;
  if (daysSinceContact > 30) {
    contactRecencyScore = 30;
  } else if (daysSinceContact > 14) {
    contactRecencyScore = 60;
  } else if (daysSinceContact > 7) {
    contactRecencyScore = 80;
  }

  // Pipeline Stage Score (0-100)
  const stageScore = (STAGE_URGENCY_WEIGHTS[customer.stage] || 0) * 10;

  return {
    roofAgeScore: Math.round(roofAgeScore),
    stormScore: Math.round(stormScore),
    claimWindowScore: Math.round(claimWindowScore),
    contactRecencyScore: Math.round(contactRecencyScore),
    stageScore: Math.round(stageScore),
  };
}

/**
 * Calculate churn risk factors
 */
function calculateChurnFactors(input: ScoringInput): ChurnFactors {
  const { customer, intelItems = [] } = input;
  const now = new Date();

  // Contact Silence Score (0-100): Risk increases with silence
  const churnDaysSinceContact = daysBetween(customer.lastContact ?? new Date(), now);
  let contactSilenceScore = 0;
  if (churnDaysSinceContact > 60) {
    contactSilenceScore = 100;
  } else if (churnDaysSinceContact > 30) {
    contactSilenceScore = 70;
  } else if (churnDaysSinceContact > 14) {
    contactSilenceScore = 40;
  } else if (churnDaysSinceContact > 7) {
    contactSilenceScore = 20;
  }

  // Quote Age Score (0-100): Old proposals = higher churn risk
  // Using nextActionDate as proxy for quote date if in proposal stage
  let quoteAgeScore = 0;
  if (customer.stage === "proposal" || customer.stage === "negotiation") {
    const daysSinceAction = daysBetween(customer.nextActionDate ?? new Date(), now);
    if (daysSinceAction > 30) {
      quoteAgeScore = 100;
    } else if (daysSinceAction > 14) {
      quoteAgeScore = 60;
    } else if (daysSinceAction > 7) {
      quoteAgeScore = 30;
    }
  }

  // Stage Score: Early stages = higher churn risk
  const stageScore = STAGE_CHURN_WEIGHTS[customer.stage] || 0;

  // Objection Score: Look for objection-related intel items
  const objectionItems = intelItems.filter(
    item => item.category === "objection" || 
            item.title.toLowerCase().includes("objection") ||
            item.content.toLowerCase().includes("concerned about") ||
            item.content.toLowerCase().includes("too expensive")
  );
  const objectionScore = Math.min(100, objectionItems.length * 25);

  // Competitor Score: Look for competitor mentions
  const competitorItems = intelItems.filter(
    item => item.category === "competitor" ||
            item.content.toLowerCase().includes("other company") ||
            item.content.toLowerCase().includes("another quote") ||
            item.content.toLowerCase().includes("competitor")
  );
  const competitorScore = Math.min(100, competitorItems.length * 35);

  return {
    contactSilenceScore: Math.round(contactSilenceScore),
    quoteAgeScore: Math.round(quoteAgeScore),
    stageScore: Math.round(stageScore * 4), // Scale to 0-100
    objectionScore: Math.round(objectionScore),
    competitorScore: Math.round(competitorScore),
  };
}

/**
 * Calculate profit potential based on property and roof characteristics
 */
function calculateProfitFactors(input: ScoringInput): ProfitFactors {
  const { customer } = input;

  // Base profit per sqft for region
  const baseProfitPerSqft = REGIONAL_PROFIT_PER_SQFT[customer.state] || 
                            REGIONAL_PROFIT_PER_SQFT.DEFAULT;

  // Roof type multiplier
  const roofTypeMultiplier = ROOF_TYPE_MULTIPLIERS[customer.roofType ?? 'DEFAULT'] || 
                             ROOF_TYPE_MULTIPLIERS.DEFAULT;

  // Property value factor: Higher value homes = higher margin potential
  // Scale from 0.9 (low value) to 1.3 (high value)
  const avgPropertyValue = 350000;
  const propertyValueRatio = (customer.propertyValue ?? avgPropertyValue) / avgPropertyValue;
  const propertyValueFactor = clamp(0.9 + (propertyValueRatio - 1) * 0.2, 0.9, 1.3);

  // Calculate estimated profit
  // Assume roof is roughly 1.5x the square footage for a typical home
  const estimatedRoofSqft = (customer.squareFootage ?? 0) * 1.5;
  const estimatedProfit = estimatedRoofSqft * baseProfitPerSqft * 
                          roofTypeMultiplier * propertyValueFactor;

  return {
    baseProfitPerSqft,
    roofTypeMultiplier,
    propertyValueFactor,
    estimatedProfit,
  };
}

/**
 * Utility: Calculate days between two dates
 * Handles both Date objects and date strings
 */
function daysBetween(date1: Date | string, date2: Date | string): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / oneDay));
}

/**
 * Utility: Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Get a human-readable explanation of the urgency score
 */
export function getUrgencyExplanation(factors: UrgencyFactors): string {
  const parts: string[] = [];
  
  if (factors.stormScore >= 80) {
    parts.push("recent storm activity");
  }
  if (factors.roofAgeScore >= 80) {
    parts.push("aging roof");
  }
  if (factors.claimWindowScore >= 60) {
    parts.push("insurance claim window");
  }
  if (factors.contactRecencyScore <= 40) {
    parts.push("needs follow-up");
  }
  
  if (parts.length === 0) {
    return "Standard priority";
  }
  
  return parts.join(", ");
}

/**
 * Get a human-readable explanation of churn risk
 */
export function getChurnExplanation(factors: ChurnFactors): string {
  const parts: string[] = [];
  
  if (factors.contactSilenceScore >= 70) {
    parts.push("low engagement");
  }
  if (factors.quoteAgeScore >= 60) {
    parts.push("stale quote");
  }
  if (factors.competitorScore >= 35) {
    parts.push("competitor interest");
  }
  if (factors.objectionScore >= 25) {
    parts.push("unresolved objections");
  }
  
  if (parts.length === 0) {
    return "Healthy engagement";
  }
  
  return "Risk factors: " + parts.join(", ");
}
