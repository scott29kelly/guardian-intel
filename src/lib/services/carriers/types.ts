/**
 * Insurance Carrier Integration Types
 * 
 * Type definitions for carrier API adapters.
 */

// ============================================================
// Carrier Configuration
// ============================================================

export interface CarrierConfig {
  carrierCode: string;
  carrierName: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  webhookSecret?: string;
  isTestMode: boolean;
}

// ============================================================
// Claim Data Structures
// ============================================================

export interface ClaimSubmission {
  // Policyholder Info
  policyNumber: string;
  policyholderFirstName: string;
  policyholderLastName: string;
  policyholderEmail?: string;
  policyholderPhone?: string;
  
  // Property Info
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZipCode: string;
  propertyType?: string;
  
  // Loss Details
  dateOfLoss: Date;
  timeOfLoss?: string;
  causeOfLoss: CauseOfLoss;
  lossDescription: string;
  
  // Damage Details
  damageType: DamageType[];
  damageAreas: DamageArea[];
  emergencyRepairsNeeded: boolean;
  emergencyRepairsPerformed?: boolean;
  temporaryRepairsCost?: number;
  
  // Estimate
  initialEstimate?: number;
  estimateDocument?: string; // URL or base64
  
  // Photos
  photos?: ClaimPhoto[];
  
  // Additional Info
  previousClaims?: number;
  mortgageCompany?: string;
  
  // Internal reference
  internalClaimId: string;
}

export interface ClaimPhoto {
  url?: string;
  base64?: string;
  filename: string;
  category: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: Date;
}

export type CauseOfLoss = 
  | "hail"
  | "wind"
  | "tornado"
  | "hurricane"
  | "fire"
  | "water"
  | "lightning"
  | "fallen-tree"
  | "vandalism"
  | "theft"
  | "other";

export type DamageType = 
  | "roof"
  | "siding"
  | "gutters"
  | "windows"
  | "doors"
  | "interior"
  | "hvac"
  | "fence"
  | "garage"
  | "deck"
  | "other";

export interface DamageArea {
  type: DamageType;
  severity: "minor" | "moderate" | "severe";
  description?: string;
  photos?: string[];
}

// ============================================================
// API Response Types
// ============================================================

export interface CarrierResponse<T = any> {
  success: boolean;
  data?: T;
  error?: CarrierError;
  rawResponse?: any;
}

export interface CarrierError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export interface ClaimFilingResult {
  carrierClaimId: string;
  claimNumber: string;
  status: CarrierClaimStatus;
  statusMessage?: string;
  assignedAdjuster?: AdjusterInfo;
  nextSteps?: string[];
  estimatedResponseDate?: Date;
  trackingUrl?: string;
}

export interface ClaimStatusResult {
  carrierClaimId: string;
  claimNumber: string;
  status: CarrierClaimStatus;
  statusCode: string;
  statusMessage: string;
  lastUpdated: Date;
  
  // Financial updates
  approvedAmount?: number;
  paidAmount?: number;
  depreciation?: number;
  acv?: number;
  rcv?: number;
  
  // Adjuster info
  adjuster?: AdjusterInfo;
  
  // Inspection
  inspectionScheduled?: boolean;
  inspectionDate?: Date;
  inspectionNotes?: string;
  
  // Documents
  documents?: CarrierDocument[];
  
  // Timeline
  timeline?: ClaimTimelineEvent[];
}

export type CarrierClaimStatus = 
  | "received"
  | "assigned"
  | "inspection-scheduled"
  | "inspection-complete"
  | "under-review"
  | "approved"
  | "partially-approved"
  | "denied"
  | "supplement-requested"
  | "supplement-approved"
  | "payment-processing"
  | "payment-issued"
  | "closed";

export interface AdjusterInfo {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  assignedDate?: Date;
}

export interface CarrierDocument {
  id: string;
  type: string;
  name: string;
  url?: string;
  uploadedAt: Date;
}

export interface ClaimTimelineEvent {
  date: Date;
  event: string;
  description?: string;
  actor?: string;
}

// ============================================================
// Supplement Types
// ============================================================

export interface SupplementSubmission {
  carrierClaimId: string;
  claimNumber: string;
  
  // Supplement details
  reason: string;
  additionalDamage: DamageArea[];
  additionalAmount: number;
  
  // Documentation
  scopeOfWork?: string;
  photos?: ClaimPhoto[];
  supportingDocuments?: string[];
  
  // Internal reference
  internalClaimId: string;
}

export interface SupplementResult {
  supplementId: string;
  status: "submitted" | "under-review" | "approved" | "denied";
  submittedAt: Date;
  approvedAmount?: number;
  notes?: string;
}

// ============================================================
// Document Upload Types
// ============================================================

export interface DocumentUpload {
  carrierClaimId: string;
  documentType: DocumentType;
  filename: string;
  content: string; // base64 or URL
  contentType: string;
  description?: string;
}

export type DocumentType = 
  | "estimate"
  | "invoice"
  | "photo"
  | "contract"
  | "scope-of-work"
  | "certificate-of-completion"
  | "supplement"
  | "other";

export interface DocumentUploadResult {
  documentId: string;
  status: "uploaded" | "processing" | "accepted" | "rejected";
  message?: string;
}

// ============================================================
// Webhook Types
// ============================================================

export interface CarrierWebhookPayload {
  eventType: CarrierWebhookEvent;
  carrierCode: string;
  claimId: string;
  claimNumber: string;
  timestamp: Date;
  data: Record<string, any>;
}

export type CarrierWebhookEvent = 
  | "claim.status_changed"
  | "claim.adjuster_assigned"
  | "claim.inspection_scheduled"
  | "claim.inspection_complete"
  | "claim.approved"
  | "claim.denied"
  | "claim.payment_issued"
  | "claim.document_requested"
  | "supplement.received"
  | "supplement.approved"
  | "supplement.denied";

// ============================================================
// Adapter Interface
// ============================================================

export interface CarrierAdapter {
  readonly carrierCode: string;
  readonly carrierName: string;
  
  // Connection
  initialize(config: CarrierConfig): Promise<void>;
  testConnection(): Promise<boolean>;
  refreshToken?(): Promise<void>;
  
  // Claim Filing
  fileClaim(claim: ClaimSubmission): Promise<CarrierResponse<ClaimFilingResult>>;
  
  // Status
  getClaimStatus(carrierClaimId: string): Promise<CarrierResponse<ClaimStatusResult>>;
  getClaimByNumber(claimNumber: string): Promise<CarrierResponse<ClaimStatusResult>>;
  
  // Supplements
  fileSuplement(supplement: SupplementSubmission): Promise<CarrierResponse<SupplementResult>>;
  
  // Documents
  uploadDocument(document: DocumentUpload): Promise<CarrierResponse<DocumentUploadResult>>;
  getDocuments(carrierClaimId: string): Promise<CarrierResponse<CarrierDocument[]>>;
  
  // Webhooks
  verifyWebhook(payload: string, signature: string): boolean;
  parseWebhook(payload: string): CarrierWebhookPayload;
  
  // Status mapping
  mapStatus(carrierStatus: string): CarrierClaimStatus;
  mapStatusToInternal(carrierStatus: CarrierClaimStatus): string;
}
