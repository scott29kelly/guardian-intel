/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at startup.
 * Provides type-safe access to configuration.
 */

import { z } from "zod";

const envSchema = z.object({
  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Supabase connection string"),
  DIRECT_URL: z.string().url().optional(), // For migrations

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // AI Services (at least one recommended)
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  MOONSHOT_API_KEY: z.string().optional(),

  // External Services
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Supabase (storage, realtime)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional().default("deck-pdfs"),

  // CRM Integration (Leap CRM for home improvement industry)
  CRM_PROVIDER: z.enum(["leap"]).optional(),
  LEAP_API_KEY: z.string().optional(),
  LEAP_COMPANY_ID: z.string().optional(),
  LEAP_BASE_URL: z.string().url().optional(),
  LEAP_WEBHOOK_SECRET: z.string().optional(), // For verifying incoming webhooks

  // Rate Limiting (optional - falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_ENABLED: z.enum(["true", "false"]).optional().default("true"),

  // Outreach Providers
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().optional().default("Guardian Roofing"),

  // Company Branding
  COMPANY_NAME: z.string().optional().default("Guardian Roofing"),
  COMPANY_PHONE: z.string().optional().default("(555) 123-4567"),
  COMPANY_WEBSITE: z.string().optional().default("guardianroofing.com"),

  // Deck Generation - NotebookLM Integration
  NOTEBOOKLM_NOTEBOOK_ID: z.string().optional(),
  NOTEBOOKLM_PYTHON_CMD: z.string().optional().default("python3"),
  NOTEBOOKLM_BRIDGE_SCRIPT: z.string().optional().default("scripts/notebooklm-bridge.py"),
  NOTEBOOKLM_TIMEOUT_MS: z.string().optional().default("300000"),
  NOTEBOOKLM_STORAGE_PATH: z.string().optional(), // Path to NotebookLM credentials (~/.notebooklm)

  // Cron Jobs (Vercel Cron or self-hosted)
  CRON_SECRET: z.string().optional(), // Shared secret for authenticating cron requests

  // Lead Intel (Phase 8)
  // n8n ingest shared-secret header auth — Phase 8 LG-06
  LEAD_INTEL_INGEST_SECRET: z.string().min(32).optional(),

  // Push Notifications (VAPID)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Internal API Key (for service-to-service calls)
  INTERNAL_API_KEY: z.string().optional(),

  // SalesRabbit Webhook
  SALESRABBIT_WEBHOOK_SECRET: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validate at module load time
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    
    // In development, warn but don't crash
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Running in development mode with invalid env vars");
      return getDefaultEnv();
    }
    
    throw new Error("Invalid environment variables");
  }
  
  // Warn if no AI keys configured
  const hasAIKey = !!(
    parsed.data.GOOGLE_API_KEY ||
    parsed.data.GOOGLE_AI_API_KEY ||
    parsed.data.GEMINI_API_KEY ||
    parsed.data.ANTHROPIC_API_KEY ||
    parsed.data.OPENAI_API_KEY
  );
  
  if (!hasAIKey) {
    console.warn("⚠️  No AI API keys configured. AI features will use mock responses.");
  }

  // Phase 8 LG-06: LEAD_INTEL_INGEST_SECRET is required in production so the
  // n8n ingest endpoint can't be hit without auth. In development we warn
  // and continue so local devs can run without configuring it.
  if (!parsed.data.LEAD_INTEL_INGEST_SECRET) {
    if (parsed.data.NODE_ENV === "production") {
      throw new Error(
        "LEAD_INTEL_INGEST_SECRET is required in production. Set a >=32 char shared secret that matches the n8n workflow header X-Lead-Intel-Ingest-Key.",
      );
    }
    console.warn(
      "⚠️  LEAD_INTEL_INGEST_SECRET not set. POST /api/lead-intel/ingest will reject all requests. Set the env var to enable.",
    );
  }

  return parsed.data;
}

function getDefaultEnv(): z.infer<typeof envSchema> {
  // In development without proper env vars, return placeholder
  // The app won't fully work but won't crash on import
  return {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://placeholder",
    NEXTAUTH_SECRET: "development-secret-do-not-use-in-production",
    NODE_ENV: "development",
    RATE_LIMIT_ENABLED: "true",
    CRM_PROVIDER: undefined,
    SUPABASE_STORAGE_BUCKET: "deck-pdfs",
    SENDGRID_FROM_NAME: "Guardian Roofing",
    COMPANY_NAME: "Guardian Roofing",
    COMPANY_PHONE: "(555) 123-4567",
    COMPANY_WEBSITE: "guardianroofing.com",
    NOTEBOOKLM_PYTHON_CMD: "python3",
    NOTEBOOKLM_BRIDGE_SCRIPT: "scripts/notebooklm-bridge.py",
    NOTEBOOKLM_TIMEOUT_MS: "300000",
    LEAD_INTEL_INGEST_SECRET: undefined,
  } as z.infer<typeof envSchema>;
}

export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

