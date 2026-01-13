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
  
  // CRM Integration (Leap CRM for home improvement industry)
  CRM_PROVIDER: z.enum(["leap", "placeholder"]).optional().default("placeholder"),
  LEAP_API_KEY: z.string().optional(),
  LEAP_COMPANY_ID: z.string().optional(),
  LEAP_BASE_URL: z.string().url().optional(),
  LEAP_WEBHOOK_SECRET: z.string().optional(), // For verifying incoming webhooks
  
  // Rate Limiting (optional - falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_ENABLED: z.enum(["true", "false"]).optional().default("true"),
  
  // Cron Jobs (Vercel Cron or self-hosted)
  CRON_SECRET: z.string().optional(), // Shared secret for authenticating cron requests
  
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
    CRM_PROVIDER: "placeholder",
  };
}

export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

// Helper functions
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

export function hasAICapability(): boolean {
  return !!(
    env.GOOGLE_API_KEY ||
    env.GOOGLE_AI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.ANTHROPIC_API_KEY ||
    env.OPENAI_API_KEY
  );
}

export function hasLeapIntegration(): boolean {
  return !!(env.LEAP_API_KEY && env.LEAP_COMPANY_ID);
}

export function hasRedisCache(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export function hasGoogleMaps(): boolean {
  return !!env.GOOGLE_MAPS_API_KEY;
}
