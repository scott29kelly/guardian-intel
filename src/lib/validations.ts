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
