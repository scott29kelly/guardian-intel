// Guardian Intel Type Definitions

export interface PropertyIntel {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  aerialImageUrl: string;
  streetViewUrl?: string;
  
  // Property details
  squareFootage: number;
  roofSquareFootage: number;
  stories: number;
  yearBuilt: number;
  roofType: RoofType;
  roofMaterial: RoofMaterial;
  estimatedRoofAge: number;
  
  // Features
  hasSolarPanels: boolean;
  hasSkylights: boolean;
  skylightCount?: number;
  hasChimney: boolean;
  hasGutters: boolean;
  poolPresent: boolean;
  
  // Last known work
  lastRoofWork?: {
    date: string;
    type: 'replacement' | 'repair' | 'inspection';
    permitNumber?: string;
  };
  
  // Value estimates
  estimatedPropertyValue: number;
  estimatedRoofValue: number;
}

export type RoofType = 'gable' | 'hip' | 'flat' | 'mansard' | 'gambrel' | 'shed' | 'mixed';
export type RoofMaterial = 'asphalt-shingle' | 'metal' | 'tile' | 'slate' | 'wood-shake' | 'tpo' | 'epdm' | 'unknown';

export interface StormEvent {
  id: string;
  date: string;
  type: 'hail' | 'wind' | 'tornado' | 'hurricane' | 'thunderstorm';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  
  // Hail specific
  hailSize?: number; // inches
  
  // Wind specific
  windSpeed?: number; // mph
  
  // Impact
  affectedRadius: number; // miles
  damageProbability: number; // 0-100
  
  // Insurance
  claimDeadline?: string;
  daysUntilDeadline?: number;
}

export interface StormHistory {
  recentEvents: StormEvent[];
  yearlyAverage: number;
  riskScore: number; // 0-100
  lastSignificantEvent?: StormEvent;
  inHighImpactZone: boolean;
}

export interface NeighborhoodProject {
  id: string;
  address: string;
  distance: number; // feet
  completionDate: string;
  projectType: 'replacement' | 'repair' | 'restoration';
  customerRating?: number;
  canReference: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface CompetitorSighting {
  id: string;
  companyName: string;
  address: string;
  spottedDate: string;
  type: 'yard-sign' | 'truck' | 'active-work';
  notes?: string;
}

export interface NeighborhoodContext {
  guardianProjects: NeighborhoodProject[];
  activeClaims: number;
  competitorSightings: CompetitorSighting[];
  averageRoofAge: number;
  recentStormDamage: boolean;
}

export interface CustomerInteraction {
  id: string;
  date: string;
  type: 'call' | 'visit' | 'email' | 'text' | 'inspection' | 'quote';
  repName: string;
  summary: string;
  outcome: 'positive' | 'neutral' | 'negative' | 'pending';
  notes?: string;
}

export interface CustomerHistory {
  isReturning: boolean;
  firstContact?: string;
  totalInteractions: number;
  interactions: CustomerInteraction[];
  previousQuotes: Quote[];
  referralSource?: string;
  preferredContactMethod?: 'phone' | 'email' | 'text' | 'in-person';
  doNotContact: boolean;
  tags: string[];
}

export interface Quote {
  id: string;
  date: string;
  amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  scope: string;
  expirationDate?: string;
}

export interface InsuranceIntel {
  knownCarrier?: string;
  carrierLogo?: string;
  typicalDeductible: {
    min: number;
    max: number;
  };
  carrierNotes?: string[];
  claimFilingDeadline?: string;
  daysUntilDeadline?: number;
  adjustersNotes?: string;
  approvalLikelihood: 'high' | 'medium' | 'low' | 'unknown';
}

export interface ConversationStarter {
  id: string;
  topic: string;
  opener: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ObjectionResponse {
  id: string;
  objection: string;
  response: string;
  supportingData?: string;
}

export interface ConversationPrep {
  starters: ConversationStarter[];
  objectionResponses: ObjectionResponse[];
  keyTalkingPoints: string[];
  testimonials: Testimonial[];
  relevantCaseStudies: CaseStudy[];
}

export interface Testimonial {
  id: string;
  customerName: string;
  neighborhood?: string;
  quote: string;
  rating: number;
  projectType: string;
  date: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  projectValue: number;
  insuranceCovered: boolean;
}

export interface LeadScore {
  overall: number; // 0-100
  factors: {
    roofAge: number;
    stormExposure: number;
    insuranceCoverage: number;
    engagementHistory: number;
    neighborhoodActivity: number;
  };
  recommendation: 'hot' | 'warm' | 'cold';
  insights: string[];
}

export interface Lead {
  id: string;
  customerName: string;
  phone?: string;
  email?: string;
  
  property: PropertyIntel;
  stormHistory: StormHistory;
  neighborhood: NeighborhoodContext;
  customerHistory: CustomerHistory;
  insurance: InsuranceIntel;
  conversationPrep: ConversationPrep;
  score: LeadScore;
  
  assignedRep?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status: 'new' | 'contacted' | 'scheduled' | 'inspected' | 'quoted' | 'closed-won' | 'closed-lost';
  
  createdAt: string;
  updatedAt: string;
}

// View types
export type ViewMode = 'nano' | 'full';
export type CardType = 'property' | 'storm' | 'neighborhood' | 'customer' | 'insurance' | 'conversation';
