/**
 * Proposal Service Types
 * 
 * Types for the smart proposal generation system that synthesizes
 * data from multiple sources to create AI-powered proposals.
 */

// =============================================================================
// INPUT DATA TYPES
// =============================================================================

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface PropertyData {
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  stories: number | null;
  roofType: string | null;
  roofAge: number | null;
  roofSquares: number | null;
  roofPitch: string | null;
  roofCondition: string | null;
  propertyValue: number | null;
}

export interface WeatherEventData {
  id: string;
  eventType: string;
  eventDate: Date;
  severity: string;
  hailSize: number | null;
  windSpeed: number | null;
  damageReported: boolean;
  claimFiled: boolean;
}

export interface InsuranceData {
  carrier: string | null;
  policyType: string | null;
  policyNumber: string | null;
  deductible: number | null;
  claimHistory: number;
}

export interface IntelItemData {
  id: string;
  category: string;
  title: string;
  content: string;
  priority: string;
  actionable: boolean;
}

export interface InteractionData {
  id: string;
  type: string;
  createdAt: Date;
  outcome: string | null;
  content: string | null;
}

// =============================================================================
// PRICING TYPES
// =============================================================================

export interface MaterialOption {
  id: string;
  name: string;
  grade: "economy" | "standard" | "premium" | "luxury";
  brand: string;
  description: string;
  pricePerSquare: number;
  warrantyYears: number;
  features: string[];
}

export interface LaborRates {
  baseRatePerSquare: number;
  pitchMultiplier: number;
  storiesMultiplier: number;
  tearOffCost: number;
  disposalCostPerSquare: number;
}

export interface PricingBreakdown {
  roofSquares: number;
  materialsCost: number;
  laborCost: number;
  tearOffCost: number;
  disposalCost: number;
  permitFees: number;
  miscFees: number;
  subtotal: number;
  discountAmount: number;
  discountReason: string | null;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

export interface PricingOption {
  id: string;
  name: string;
  description: string;
  material: MaterialOption;
  breakdown: PricingBreakdown;
  isRecommended: boolean;
  savingsVsHigher?: number;
}

// =============================================================================
// LINE ITEM TYPES
// =============================================================================

export interface LineItem {
  id: string;
  category: "materials" | "labor" | "permit" | "disposal" | "misc";
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// =============================================================================
// PROPOSAL GENERATION TYPES
// =============================================================================

export interface ProposalGenerationRequest {
  customerId: string;
  createdById: string;
  
  // Optional overrides
  materialGrade?: "economy" | "standard" | "premium" | "luxury";
  specificMaterial?: string;
  customDiscount?: {
    amount: number;
    reason: string;
  };
  
  // Options
  includeInsuranceAssistance?: boolean;
  includeFinancingOptions?: boolean;
  urgencyLevel?: "standard" | "high" | "urgent";
}

export interface ProposalGenerationResult {
  success: boolean;
  proposal?: GeneratedProposal;
  error?: string;
}

export interface GeneratedProposal {
  // Customer snapshot
  customer: CustomerData;
  property: PropertyData;
  insurance: InsuranceData;
  
  // Damage context
  weatherEvents: WeatherEventData[];
  damageAssessment: DamageAssessment;
  
  // Pricing
  pricingOptions: PricingOption[];
  recommendedOption: PricingOption;
  lineItems: LineItem[];
  
  // AI-generated content
  aiContent: AIGeneratedContent;
  
  // Metadata
  sourceDataSnapshot: SourceDataSnapshot;
}

export interface DamageAssessment {
  damageType: string;
  damageSeverity: string;
  damageDescription: string;
  affectedAreas: string[];
  urgencyLevel: string;
  recommendedAction: string;
  insuranceRecommendation: string;
}

export interface AIGeneratedContent {
  executiveSummary: string;
  scopeOfWork: string;
  scopeDetails: string;
  valueProposition: string;
  warrantyDetails: string;
  insuranceNotes: string;
  termsAndConditions: string;
  callToAction: string;
}

export interface SourceDataSnapshot {
  customerId: string;
  customerName: string;
  propertyAddress: string;
  weatherEventsCount: number;
  intelItemsCount: number;
  interactionsCount: number;
  generatedAt: Date;
  dataVersion: string;
}

// =============================================================================
// REGIONAL PRICING DATA
// =============================================================================

export interface RegionalPricing {
  state: string;
  laborRateMultiplier: number;
  permitFeeBase: number;
  taxRate: number;
  avgPropertyValue: number;
}

// =============================================================================
// PROPOSAL STATUS
// =============================================================================

export type ProposalStatus = 
  | "draft"
  | "sent" 
  | "viewed" 
  | "accepted" 
  | "rejected" 
  | "expired"
  | "revised";
