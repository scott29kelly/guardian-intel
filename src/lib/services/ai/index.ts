/**
 * Guardian Intel AI Service
 * 
 * Multi-model AI architecture:
 * - Kimi K2: Conversational chat
 * - Claude Opus 4.5: Complex tool calling
 * - Claude Sonnet 4.5: Simple tool calling
 * - Claude Haiku 4.5: Fast classification/parsing
 * - Perplexity: Web research
 * - GPT-4o: Fallback
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

let isInitialized = false;

/**
 * Initialize the AI service with all configured adapters
 */
export function initializeAI(): void {
  if (isInitialized) return;

  const adapters = [];

  // Claude adapters
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    adapters.push(createClaudeOpusAdapter(anthropicKey));
    adapters.push(createClaudeSonnetAdapter(anthropicKey));
    adapters.push(createClaudeHaikuAdapter(anthropicKey));
    console.log("[AI] Claude adapters initialized");
  }

  // Kimi adapter
  const kimiKey = process.env.MOONSHOT_API_KEY;
  if (kimiKey) {
    adapters.push(createKimiAdapter(kimiKey));
    console.log("[AI] Kimi K2 adapter initialized");
  }

  // Perplexity adapter
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey) {
    adapters.push(createPerplexityAdapter(perplexityKey));
    console.log("[AI] Perplexity adapter initialized");
  }

  // OpenAI fallback
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    adapters.push(createOpenAIAdapter(openaiKey));
    console.log("[AI] OpenAI fallback adapter initialized");
  }

  if (adapters.length > 0) {
    initializeAIRouter(adapters);
    isInitialized = true;
    console.log(`[AI] Service initialized with ${adapters.length} adapter(s)`);
  } else {
    console.warn("[AI] No API keys configured - AI features will be limited");
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
