/**
 * Guardian Intel AI Service
 * 
 * Simplified configuration using Gemini for all tasks.
 * 
 * Required environment variable:
 * - GOOGLE_API_KEY (or GOOGLE_AI_API_KEY or GEMINI_API_KEY)
 * 
 * Optional: Additional models can be added later for specialized tasks:
 * - Claude for complex reasoning
 * - Perplexity for web research
 * - etc.
 */

// Types
export * from "./types";

// Router
export { AIRouter, getAIRouter, initializeAIRouter } from "./router";

// Adapters
export { ClaudeAdapter, createClaudeOpusAdapter, createClaudeSonnetAdapter, createClaudeHaikuAdapter } from "./adapters/claude";
export { KimiAdapter, createKimiAdapter } from "./adapters/kimi";
export { PerplexityAdapter, createPerplexityAdapter } from "./adapters/perplexity";
export { OpenAIAdapter, createOpenAIAdapter } from "./adapters/openai";
export { GeminiAdapter, createGeminiFlashAdapter, createGeminiProAdapter } from "./adapters/gemini";

// Tools
export { AI_TOOLS, executeTool, getToolsByCategory } from "./tools";

// Context
export { CustomerContextBuilder, getCustomerContext, getCustomerContexts, getContextSummary, buildCustomerSystemPrompt } from "./context";

// =============================================================================
// INITIALIZATION
// =============================================================================

import { getAIRouter, initializeAIRouter } from "./router";
import { createClaudeOpusAdapter, createClaudeSonnetAdapter, createClaudeHaikuAdapter } from "./adapters/claude";
import { createKimiAdapter } from "./adapters/kimi";
import { createPerplexityAdapter } from "./adapters/perplexity";
import { createOpenAIAdapter } from "./adapters/openai";
import { createGeminiFlashAdapter } from "./adapters/gemini";

let isInitialized = false;

/**
 * Initialize the AI service with configured adapters
 * 
 * Simplified setup: Only Gemini is required.
 * Add GOOGLE_API_KEY to .env.local for full AI functionality.
 */
export function initializeAI(): void {
  if (isInitialized) return;

  const adapters = [];

  // Gemini - Primary AI (handles all tasks)
  const geminiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    adapters.push(createGeminiFlashAdapter(geminiKey));
    console.log("[AI] ✓ Gemini Flash initialized (primary)");
  }

  // Optional: Claude for enhanced reasoning (if configured)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    adapters.push(createClaudeOpusAdapter(anthropicKey));
    adapters.push(createClaudeSonnetAdapter(anthropicKey));
    adapters.push(createClaudeHaikuAdapter(anthropicKey));
    console.log("[AI] + Claude adapters added");
  }

  // Optional: Kimi for specialized chat (if configured)
  const kimiKey = process.env.MOONSHOT_API_KEY;
  if (kimiKey) {
    adapters.push(createKimiAdapter(kimiKey));
    console.log("[AI] + Kimi K2 adapter added");
  }

  // Optional: Perplexity for web research (if configured)
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey) {
    adapters.push(createPerplexityAdapter(perplexityKey));
    console.log("[AI] + Perplexity adapter added");
  }

  // Optional: OpenAI as additional fallback (if configured)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    adapters.push(createOpenAIAdapter(openaiKey));
    console.log("[AI] + OpenAI adapter added");
  }

  if (adapters.length > 0) {
    initializeAIRouter(adapters);
    isInitialized = true;
    console.log(`[AI] Service ready with ${adapters.length} adapter(s)`);
  } else {
    console.warn("[AI] ⚠ No API keys configured - using demo mode");
    console.warn("[AI] Add GOOGLE_API_KEY to .env.local for real AI");
  }
}

/**
 * Get the AI router instance
 */
export function getAI() {
  if (!isInitialized) {
    initializeAI();
  }
  return getAIRouter();
}
