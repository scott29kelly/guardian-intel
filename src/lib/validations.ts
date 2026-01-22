/**
 * Zod Validation Schemas
 * 
 * Centralized input validation for all API endpoints.
 * Prevents injection attacks and ensures data integrity.
 */

import { z } from "zod";

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email().max(255);
export const phoneSchema = z.string().regex(/^[\d\s\-\+\(\)]+$/).max(20);
export const stateSchema = z.enum(["PA", "NJ", "DE", "MD", "VA", "NY"]);

// =============================================================================
// AI CHAT SCHEMAS
// =============================================================================

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string().min(1).max(10000),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.string(), z.unknown()),
  })).optional(),
});

// Must match AITask type from services/ai/types.ts
export const aiTaskSchema = z.enum([
  "chat",
  "tool_call",
  "simple_tool",
  "research",
  "classify",
  "parse",
  "summarize",
] as const);

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1, "At least one message required").max(50, "Too many messages"),
  customerId: cuidSchema.optional(),
  task: aiTaskSchema.optional().default("chat"),
  enableTools: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// =============================================================================
// CUSTOMER SCHEMAS
// =============================================================================

export const customerStatusSchema = z.enum([
  "lead",
  "prospect",
  "customer",
  "closed-won",
  "closed-lost",
]);

export const customerStageSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed",
]);

export const propertyTypeSchema = z.enum([
  "Single Family",
  "Multi Family",
  "Townhouse",
  "Condo",
  "Commercial",
]);

export const roofTypeSchema = z.enum([
  "Asphalt Shingle",
  "Architectural Shingle",
  "3-Tab Shingle",
  "Metal Standing Seam",
  "Metal",
  "Slate",
  "Tile",
  "Cedar Shake",
  "Flat/TPO",
  "Other",
]);

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().min(1).max(255).trim(),
  city: z.string().min(1).max(100).trim(),
  state: stateSchema,
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  propertyType: propertyTypeSchema.optional(),
  roofType: roofTypeSchema.optional(),
  roofAge: z.number().int().min(0).max(100).optional(),
  insuranceCarrier: z.string().max(100).optional(),
  leadSource: z.string().max(100).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  status: customerStatusSchema.optional(),
  stage: customerStageSchema.optional(),
  assignedRepId: cuidSchema.optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// =============================================================================
// WEATHER SCHEMAS
// =============================================================================

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const weatherAlertQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const addressLookupSchema = z.object({
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: stateSchema,
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  lookbackDays: z.coerce.number().int().min(1).max(365).optional().default(90),
});

export type AddressLookupInput = z.infer<typeof addressLookupSchema>;

// =============================================================================
// INTERACTION SCHEMAS
// =============================================================================

export const interactionTypeSchema = z.enum([
  "call",
  "email",
  "text",
  "visit",
  "meeting",
  "video-call",
]);

export const interactionOutcomeSchema = z.enum([
  "connected",
  "voicemail",
  "no-answer",
  "scheduled",
  "closed",
  "callback",
]);

export const createInteractionSchema = z.object({
  customerId: cuidSchema,
  type: interactionTypeSchema,
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  subject: z.string().max(255).optional(),
  content: z.string().max(5000).optional(),
  outcome: interactionOutcomeSchema.optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  duration: z.number().int().min(0).optional(),
  nextAction: z.string().max(255).optional(),
  nextActionDate: z.coerce.date().optional(),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(100),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(1).max(100),
  phone: phoneSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const customerQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  status: customerStatusSchema.optional(),
  stage: customerStageSchema.optional(),
  state: stateSchema.optional(),
  assignedRepId: cuidSchema.optional(),
  minLeadScore: z.coerce.number().int().min(0).max(100).optional(),
  maxLeadScore: z.coerce.number().int().min(0).max(100).optional(),
  stormAffected: z.coerce.boolean().optional(),
});

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;

// =============================================================================
// BULK OPERATIONS SCHEMAS
// =============================================================================

export const bulkUpdateCustomersSchema = z.object({
  ids: z.array(cuidSchema).min(1, "At least one customer ID required").max(100, "Maximum 100 customers per batch"),
  updates: z.object({
    status: customerStatusSchema.optional(),
    stage: customerStageSchema.optional(),
    assignedRepId: cuidSchema.nullable().optional(),
  }).refine(
    (data) => data.status !== undefined || data.stage !== undefined || data.assignedRepId !== undefined,
    { message: "At least one update field required" }
  ),
});

export const bulkDeleteCustomersSchema = z.object({
  ids: z.array(cuidSchema).min(1, "At least one customer ID required").max(100, "Maximum 100 customers per batch"),
});

export type BulkUpdateCustomersInput = z.infer<typeof bulkUpdateCustomersSchema>;
export type BulkDeleteCustomersInput = z.infer<typeof bulkDeleteCustomersSchema>;

// =============================================================================
// CLAIM SCHEMAS
// =============================================================================

export const claimTypeSchema = z.enum([
  "roof",
  "siding",
  "gutters",
  "full-exterior",
  "interior",
]);

export const claimStatusSchema = z.enum([
  "pending",
  "filed",
  "adjuster-assigned",
  "inspection-scheduled",
  "approved",
  "denied",
  "supplement",
  "paid",
  "closed",
]);

export const causeOfLossSchema = z.enum([
  "hail",
  "wind",
  "tornado",
  "hurricane",
  "fire",
  "water",
  "lightning",
  "fallen-tree",
  "vandalism",
  "theft",
  "other",
]);

export const damageAreaSchema = z.object({
  type: z.string(),
  severity: z.enum(["minor", "moderate", "severe"]),
  description: z.string().optional(),
});

export const claimCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  carrier: z.string().min(1, "Insurance carrier is required"),
  dateOfLoss: z.string().transform((s) => new Date(s)),
  claimType: claimTypeSchema,
  claimNumber: z.string().optional(),
  status: claimStatusSchema.default("pending"),
  initialEstimate: z.number().optional(),
  deductible: z.number().optional(),
  adjusterName: z.string().optional(),
  adjusterPhone: z.string().optional(),
  adjusterEmail: z.string().optional(),
  adjusterCompany: z.string().optional(),
  inspectionDate: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional(),
});

export const claimUpdateSchema = z.object({
  claimNumber: z.string().optional(),
  carrier: z.string().optional(),
  dateOfLoss: z.string().transform((s) => new Date(s)).optional(),
  claimType: claimTypeSchema.optional(),
  status: claimStatusSchema.optional(),

  // Financials
  initialEstimate: z.number().nullable().optional(),
  approvedValue: z.number().nullable().optional(),
  supplementValue: z.number().nullable().optional(),
  totalPaid: z.number().nullable().optional(),
  deductible: z.number().nullable().optional(),
  acv: z.number().nullable().optional(),
  rcv: z.number().nullable().optional(),
  depreciation: z.number().nullable().optional(),

  // Adjuster
  adjusterName: z.string().nullable().optional(),
  adjusterPhone: z.string().nullable().optional(),
  adjusterEmail: z.string().nullable().optional(),
  adjusterCompany: z.string().nullable().optional(),
  inspectionDate: z.string().transform((s) => new Date(s)).nullable().optional(),
  reinspectionDate: z.string().transform((s) => new Date(s)).nullable().optional(),

  // Documents
  scopeOfWork: z.string().nullable().optional(),
  photos: z.string().nullable().optional(),

  // Notes
  notes: z.string().nullable().optional(),

  // Supplements
  supplementCount: z.number().optional(),
  lastSupplementDate: z.string().transform((s) => new Date(s)).nullable().optional(),
});

export const fileClaimSchema = z.object({
  claimId: z.string(),
  policyNumber: z.string().min(1),
  lossDescription: z.string().min(10),
  causeOfLoss: causeOfLossSchema,
  damageAreas: z.array(damageAreaSchema),
  emergencyRepairsNeeded: z.boolean().default(false),
  temporaryRepairsCost: z.number().optional(),
  photoIds: z.array(z.string()).optional(),
});

export type ClaimCreateInput = z.infer<typeof claimCreateSchema>;
export type ClaimUpdateInput = z.infer<typeof claimUpdateSchema>;
export type FileClaimInput = z.infer<typeof fileClaimSchema>;

// =============================================================================
// AI DAMAGE ANALYSIS SCHEMAS
// =============================================================================

export const damageAnalysisSchema = z.object({
  photoId: z.string().optional(),
  photoIds: z.array(z.string()).optional(),
  photoUrl: z.string().url().optional(),
  photoBase64: z.string().optional(),
  customerId: z.string().optional(),
  claimId: z.string().optional(),
  additionalContext: z.string().optional(),
  saveResults: z.boolean().default(true),
});

export type DamageAnalysisInput = z.infer<typeof damageAnalysisSchema>;

// =============================================================================
// AI ROLEPLAY SCHEMAS
// =============================================================================

export const roleplayPersonaSchema = z.enum([
  "skeptical_homeowner",
  "price_conscious",
  "insurance_hesitant",
  "busy_professional",
  "comparison_shopper",
  "storm_victim",
  "elderly_homeowner",
  "aggressive_negotiator",
]);

export const roleplayRequestSchema = z.object({
  action: z.enum(["start", "continue", "end", "coach"]),
  persona: roleplayPersonaSchema.optional(),
  scenario: z.string().max(500).optional(),
  playbookId: cuidSchema.optional(),
  customerId: cuidSchema.optional(),
  sessionId: z.string().optional(),
  userMessage: z.string().max(2000).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional(),
});

export type RoleplayPersona = z.infer<typeof roleplayPersonaSchema>;
export type RoleplayRequestInput = z.infer<typeof roleplayRequestSchema>;

// =============================================================================
// PLAYBOOK RATING/USAGE SCHEMAS
// =============================================================================

export const playbookRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

export const playbookUsageContextSchema = z.enum([
  "practice",
  "customer_call",
  "meeting",
  "reference",
  "roleplay",
]);

export const playbookUsageOutcomeSchema = z.enum([
  "closed_won",
  "follow_up",
  "no_result",
  "objection_handled",
]);

export const playbookUsageSchema = z.object({
  customerId: cuidSchema.optional(),
  context: playbookUsageContextSchema,
  duration: z.number().int().min(0).optional(),
  completed: z.boolean().optional().default(false),
  outcome: playbookUsageOutcomeSchema.optional(),
});

export type PlaybookRatingInput = z.infer<typeof playbookRatingSchema>;
export type PlaybookUsageInput = z.infer<typeof playbookUsageSchema>;

// =============================================================================
// PLAYBOOK SCHEMAS
// =============================================================================

export const playbookCategorySchema = z.enum([
  "objection-handling",
  "closing",
  "discovery",
  "presentation",
  "follow-up",
  "storm",
  "cold-call",
  "retention",
]);

export const playbookTypeSchema = z.enum([
  "script",
  "checklist",
  "guide",
  "template",
]);

export const playbookStepSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  tips: z.array(z.string().max(200)).max(10).optional(),
});

export const createPlaybookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(1000).optional(),
  category: playbookCategorySchema,
  type: playbookTypeSchema.default("script"),
  content: z.string().max(50000).optional(), // Markdown content
  stage: z.string().max(50).optional(),
  scenario: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPublished: z.boolean().optional().default(true),
});

export const updatePlaybookSchema = createPlaybookSchema.partial();

export const playbookQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  category: playbookCategorySchema.optional(),
  type: playbookTypeSchema.optional(),
  isPublished: z.coerce.boolean().optional(),
});

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;
export type PlaybookQueryInput = z.infer<typeof playbookQuerySchema>;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Safely parse and validate input, returning typed result or error
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError<unknown>): string {
  return error.issues
    .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");
}
