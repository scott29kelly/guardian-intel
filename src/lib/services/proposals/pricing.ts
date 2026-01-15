/**
 * Proposal Pricing Calculator
 * 
 * Calculates accurate pricing based on:
 * - Regional labor rates
 * - Material costs and grades
 * - Roof characteristics (pitch, stories, squares)
 * - Permit fees and disposal costs
 */

import type {
  MaterialOption,
  LaborRates,
  PricingBreakdown,
  PricingOption,
  PropertyData,
  RegionalPricing,
  LineItem,
} from "./types";

// =============================================================================
// REGIONAL PRICING DATA
// =============================================================================

const REGIONAL_PRICING: Record<string, RegionalPricing> = {
  PA: {
    state: "PA",
    laborRateMultiplier: 1.0,
    permitFeeBase: 150,
    taxRate: 0.06,
    avgPropertyValue: 280000,
  },
  NJ: {
    state: "NJ",
    laborRateMultiplier: 1.15,
    permitFeeBase: 200,
    taxRate: 0.06625,
    avgPropertyValue: 350000,
  },
  DE: {
    state: "DE",
    laborRateMultiplier: 1.0,
    permitFeeBase: 125,
    taxRate: 0,
    avgPropertyValue: 290000,
  },
  MD: {
    state: "MD",
    laborRateMultiplier: 1.05,
    permitFeeBase: 175,
    taxRate: 0.06,
    avgPropertyValue: 320000,
  },
  VA: {
    state: "VA",
    laborRateMultiplier: 0.95,
    permitFeeBase: 150,
    taxRate: 0.053,
    avgPropertyValue: 310000,
  },
  NY: {
    state: "NY",
    laborRateMultiplier: 1.25,
    permitFeeBase: 250,
    taxRate: 0.08,
    avgPropertyValue: 400000,
  },
};

const DEFAULT_REGIONAL_PRICING: RegionalPricing = {
  state: "DEFAULT",
  laborRateMultiplier: 1.0,
  permitFeeBase: 150,
  taxRate: 0.06,
  avgPropertyValue: 300000,
};

// =============================================================================
// MATERIAL OPTIONS
// =============================================================================

export const MATERIAL_OPTIONS: MaterialOption[] = [
  // Economy tier
  {
    id: "3-tab-economy",
    name: "3-Tab Shingle",
    grade: "economy",
    brand: "GAF Royal Sovereign",
    description: "Basic 3-tab asphalt shingle, reliable protection at the lowest cost",
    pricePerSquare: 85,
    warrantyYears: 25,
    features: ["Basic wind resistance", "Standard colors", "25-year warranty"],
  },
  // Standard tier
  {
    id: "arch-standard",
    name: "Architectural Shingle - Standard",
    grade: "standard",
    brand: "GAF Timberline HDZ",
    description: "Popular dimensional shingle with enhanced durability and curb appeal",
    pricePerSquare: 125,
    warrantyYears: 30,
    features: ["130 mph wind warranty", "StainGuard protection", "Layered design", "30-year warranty"],
  },
  // Premium tier
  {
    id: "arch-premium",
    name: "Architectural Shingle - Premium",
    grade: "premium",
    brand: "CertainTeed Landmark Pro",
    description: "High-performance shingle with superior protection and aesthetics",
    pricePerSquare: 165,
    warrantyYears: 50,
    features: ["Max defense warranty", "Impact resistant (Class 4)", "Premium colors", "50-year warranty"],
  },
  // Luxury tier
  {
    id: "designer-luxury",
    name: "Designer Shingle",
    grade: "luxury",
    brand: "GAF Grand Sequoia",
    description: "Premium designer shingle mimicking wood shake appearance",
    pricePerSquare: 225,
    warrantyYears: 50,
    features: ["Wood shake appearance", "Lifetime warranty", "Max wind resistance", "Artisan colors"],
  },
  // Metal option
  {
    id: "metal-standing-seam",
    name: "Standing Seam Metal",
    grade: "luxury",
    brand: "Englert",
    description: "Premium metal roofing with exceptional longevity and energy efficiency",
    pricePerSquare: 450,
    warrantyYears: 50,
    features: ["50+ year lifespan", "Energy efficient", "Fire resistant", "Low maintenance"],
  },
];

// =============================================================================
// BASE LABOR RATES (per square, before multipliers)
// =============================================================================

const BASE_LABOR_RATES: LaborRates = {
  baseRatePerSquare: 150,
  pitchMultiplier: 1.0,
  storiesMultiplier: 1.0,
  tearOffCost: 75, // per square
  disposalCostPerSquare: 35,
};

// Pitch multipliers (steeper = more expensive)
const PITCH_MULTIPLIERS: Record<string, number> = {
  "4/12": 1.0,
  "5/12": 1.0,
  "6/12": 1.05,
  "7/12": 1.1,
  "8/12": 1.15,
  "9/12": 1.2,
  "10/12": 1.25,
  "11/12": 1.3,
  "12/12": 1.35,
  "steep": 1.4,
  "default": 1.1,
};

// Stories multipliers (higher = more expensive)
const STORIES_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.25,
};

// =============================================================================
// PRICING CALCULATOR
// =============================================================================

export class PricingCalculator {
  private regionalPricing: RegionalPricing;
  private laborRates: LaborRates;

  constructor(state: string) {
    this.regionalPricing = REGIONAL_PRICING[state] || DEFAULT_REGIONAL_PRICING;
    this.laborRates = { ...BASE_LABOR_RATES };
  }

  /**
   * Calculate roof squares from property data
   */
  calculateRoofSquares(property: PropertyData): number {
    // If roof squares already known, use it
    if (property.roofSquares && property.roofSquares > 0) {
      return property.roofSquares;
    }

    // Estimate from square footage
    // Roof area is typically 1.1-1.5x floor area depending on roof style
    const sqft = property.squareFootage || 2000;
    const stories = property.stories || 1;
    const footprint = sqft / stories;
    
    // Apply pitch factor for roof area
    const pitchFactor = this.getPitchFactor(property.roofPitch);
    const roofSqft = footprint * pitchFactor;
    
    // Convert to roofing squares (100 sqft = 1 square)
    return Math.ceil(roofSqft / 100);
  }

  /**
   * Get pitch factor for roof area calculation
   */
  private getPitchFactor(pitch: string | null): number {
    // Steeper pitch = more roof area
    const pitchMultipliers: Record<string, number> = {
      "4/12": 1.05,
      "5/12": 1.08,
      "6/12": 1.12,
      "7/12": 1.16,
      "8/12": 1.20,
      "9/12": 1.25,
      "10/12": 1.30,
      "12/12": 1.41,
    };
    return pitchMultipliers[pitch || "6/12"] || 1.15;
  }

  /**
   * Get labor rate multiplier based on roof characteristics
   */
  private getLaborMultiplier(property: PropertyData): number {
    const pitchMult = PITCH_MULTIPLIERS[property.roofPitch || "default"] || 1.1;
    const storiesMult = STORIES_MULTIPLIERS[property.stories || 1] || 1.0;
    const regionalMult = this.regionalPricing.laborRateMultiplier;
    
    return pitchMult * storiesMult * regionalMult;
  }

  /**
   * Calculate pricing for a specific material
   */
  calculatePricing(
    property: PropertyData,
    material: MaterialOption,
    discount?: { amount: number; reason: string }
  ): PricingBreakdown {
    const roofSquares = this.calculateRoofSquares(property);
    const laborMultiplier = this.getLaborMultiplier(property);

    // Materials cost
    const materialsCost = roofSquares * material.pricePerSquare;

    // Labor cost with multipliers
    const laborCost = roofSquares * this.laborRates.baseRatePerSquare * laborMultiplier;

    // Tear-off (assume 1 layer existing)
    const tearOffCost = roofSquares * this.laborRates.tearOffCost;

    // Disposal
    const disposalCost = roofSquares * this.laborRates.disposalCostPerSquare;

    // Permit fees (base + per-square adjustment)
    const permitFees = this.regionalPricing.permitFeeBase + (roofSquares * 2);

    // Misc fees (ridge vents, flashing, etc.) - estimate 8% of materials
    const miscFees = materialsCost * 0.08;

    // Subtotal before discount
    const subtotalBeforeDiscount = 
      materialsCost + laborCost + tearOffCost + disposalCost + permitFees + miscFees;

    // Apply discount
    const discountAmount = discount?.amount || 0;
    const subtotal = subtotalBeforeDiscount - discountAmount;

    // Tax (some states don't tax labor, simplified here)
    const taxRate = this.regionalPricing.taxRate;
    const taxAmount = subtotal * taxRate;

    // Total
    const totalPrice = subtotal + taxAmount;

    return {
      roofSquares,
      materialsCost: Math.round(materialsCost),
      laborCost: Math.round(laborCost),
      tearOffCost: Math.round(tearOffCost),
      disposalCost: Math.round(disposalCost),
      permitFees: Math.round(permitFees),
      miscFees: Math.round(miscFees),
      subtotal: Math.round(subtotal),
      discountAmount: Math.round(discountAmount),
      discountReason: discount?.reason || null,
      taxRate,
      taxAmount: Math.round(taxAmount),
      totalPrice: Math.round(totalPrice),
    };
  }

  /**
   * Generate all pricing options for a property
   */
  generatePricingOptions(
    property: PropertyData,
    discount?: { amount: number; reason: string },
    preferredGrade?: "economy" | "standard" | "premium" | "luxury"
  ): PricingOption[] {
    // Filter to one option per grade
    const grades = ["economy", "standard", "premium", "luxury"] as const;
    const options: PricingOption[] = [];

    for (const grade of grades) {
      const material = MATERIAL_OPTIONS.find(m => m.grade === grade);
      if (!material) continue;

      const breakdown = this.calculatePricing(property, material, discount);
      
      options.push({
        id: material.id,
        name: material.name,
        description: material.description,
        material,
        breakdown,
        isRecommended: grade === (preferredGrade || "standard"),
      });
    }

    // Calculate savings vs higher tier
    for (let i = 0; i < options.length - 1; i++) {
      options[i].savingsVsHigher = options[i + 1].breakdown.totalPrice - options[i].breakdown.totalPrice;
    }

    return options;
  }

  /**
   * Generate line items for a pricing breakdown
   */
  generateLineItems(
    property: PropertyData,
    material: MaterialOption,
    breakdown: PricingBreakdown
  ): LineItem[] {
    const items: LineItem[] = [];

    // Materials
    items.push({
      id: `material-${material.id}`,
      category: "materials",
      description: `${material.brand} ${material.name}`,
      quantity: breakdown.roofSquares,
      unit: "squares",
      unitPrice: material.pricePerSquare,
      totalPrice: breakdown.materialsCost,
      notes: `${material.warrantyYears}-year warranty`,
    });

    // Underlayment
    items.push({
      id: "underlayment",
      category: "materials",
      description: "Synthetic Underlayment",
      quantity: breakdown.roofSquares,
      unit: "squares",
      unitPrice: 15,
      totalPrice: breakdown.roofSquares * 15,
    });

    // Ice & Water Shield
    items.push({
      id: "ice-water",
      category: "materials",
      description: "Ice & Water Shield (eaves, valleys)",
      quantity: Math.ceil(breakdown.roofSquares * 0.15),
      unit: "squares",
      unitPrice: 45,
      totalPrice: Math.ceil(breakdown.roofSquares * 0.15) * 45,
    });

    // Starter and ridge
    items.push({
      id: "starter-ridge",
      category: "materials",
      description: "Starter Strip & Ridge Cap Shingles",
      quantity: 1,
      unit: "lot",
      unitPrice: Math.round(breakdown.miscFees * 0.6),
      totalPrice: Math.round(breakdown.miscFees * 0.6),
    });

    // Flashing
    items.push({
      id: "flashing",
      category: "materials",
      description: "Drip Edge, Step & Counter Flashing",
      quantity: 1,
      unit: "lot",
      unitPrice: Math.round(breakdown.miscFees * 0.4),
      totalPrice: Math.round(breakdown.miscFees * 0.4),
    });

    // Labor - Installation
    items.push({
      id: "labor-install",
      category: "labor",
      description: "Professional Roof Installation",
      quantity: breakdown.roofSquares,
      unit: "squares",
      unitPrice: Math.round(breakdown.laborCost / breakdown.roofSquares),
      totalPrice: breakdown.laborCost,
      notes: property.roofPitch ? `Includes ${property.roofPitch} pitch adjustment` : undefined,
    });

    // Labor - Tear-off
    items.push({
      id: "labor-tearoff",
      category: "labor",
      description: "Existing Roof Tear-off",
      quantity: breakdown.roofSquares,
      unit: "squares",
      unitPrice: Math.round(breakdown.tearOffCost / breakdown.roofSquares),
      totalPrice: breakdown.tearOffCost,
    });

    // Disposal
    items.push({
      id: "disposal",
      category: "disposal",
      description: "Debris Removal & Disposal",
      quantity: breakdown.roofSquares,
      unit: "squares",
      unitPrice: Math.round(breakdown.disposalCost / breakdown.roofSquares),
      totalPrice: breakdown.disposalCost,
    });

    // Permit
    items.push({
      id: "permit",
      category: "permit",
      description: "Building Permit",
      quantity: 1,
      unit: "each",
      unitPrice: breakdown.permitFees,
      totalPrice: breakdown.permitFees,
    });

    return items;
  }
}

/**
 * Get material by grade
 */
export function getMaterialByGrade(grade: "economy" | "standard" | "premium" | "luxury"): MaterialOption {
  return MATERIAL_OPTIONS.find(m => m.grade === grade) || MATERIAL_OPTIONS[1]; // Default to standard
}

/**
 * Get material by ID
 */
export function getMaterialById(id: string): MaterialOption | undefined {
  return MATERIAL_OPTIONS.find(m => m.id === id);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
