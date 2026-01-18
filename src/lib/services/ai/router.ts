/**
 * Guardian Intel AI Router
 * 
 * Simplified configuration - Gemini handles all tasks:
 * - Chat → Gemini Flash
 * - Tool Calls → Gemini Flash
 * - Research → Gemini Flash
 * - Classification → Gemini Flash
 * 
 * Can be extended later to route specific tasks to specialized models.
 */

import {
  AITask,
  AIModel,
  AIAdapter,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ResearchRequest,
  ResearchResult,
  ClassifyRequest,
  ClassifyResult,
  ParseRequest,
  ParseResult,
  CustomerContext,
  Message,
} from "./types";

// =============================================================================
// ROUTING CONFIGURATION
// =============================================================================

// Model routing configuration
// Prefer Claude for chat (better at following formatting instructions)
// Fallback to Gemini if Claude is not available
const TASK_MODEL_MAP: Record<AITask, AIModel> = {
  chat: "claude-sonnet-4.5",         // Claude Sonnet for formatted chat
  tool_call: "claude-sonnet-4.5",    // Claude for complex tool calls
  simple_tool: "claude-haiku-4.5",   // Claude Haiku for simple tools
  research: "gemini-2.0-flash-exp",  // Gemini for research
  classify: "claude-haiku-4.5",      // Claude Haiku for classification
  parse: "claude-haiku-4.5",         // Claude Haiku for parsing
  summarize: "gemini-2.0-flash-exp", // Gemini for summarization
};

// Gemini is the fallback when Claude is not configured
const FALLBACK_MODEL: AIModel = "gemini-2.0-flash-exp";

// =============================================================================
// AI ROUTER CLASS
// =============================================================================

export class AIRouter {
  private adapters: Map<AIModel | string, AIAdapter> = new Map();
  private fallbackAdapter: AIAdapter | null = null;

  constructor() {
    // Adapters will be registered after construction
  }

  /**
   * Register an adapter for a specific model
   */
  registerAdapter(adapter: AIAdapter): void {
    this.adapters.set(adapter.model, adapter);
    
    // Set fallback if it's the GPT-4o adapter
    if (adapter.model === FALLBACK_MODEL) {
      this.fallbackAdapter = adapter;
    }
  }

  /**
   * Get the adapter for a specific task
   */
  private getAdapter(task: AITask): AIAdapter {
    const preferredModel = TASK_MODEL_MAP[task];
    const adapter = this.adapters.get(preferredModel);
    
    if (adapter) {
      return adapter;
    }

    // Try fallback
    if (this.fallbackAdapter) {
      console.warn(`[AI Router] No adapter for ${preferredModel}, using fallback`);
      return this.fallbackAdapter;
    }

    throw new Error(`No adapter available for task: ${task}`);
  }

  /**
   * Get adapter by model name directly
   */
  private getAdapterByModel(model: AIModel): AIAdapter {
    const adapter = this.adapters.get(model);
    
    if (adapter) {
      return adapter;
    }

    if (this.fallbackAdapter) {
      console.warn(`[AI Router] No adapter for ${model}, using fallback`);
      return this.fallbackAdapter;
    }

    throw new Error(`No adapter available for model: ${model}`);
  }

  // ===========================================================================
  // CHAT METHODS
  // ===========================================================================

  /**
   * Send a chat message (uses Kimi K2)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const task = request.task || "chat";
    const adapter = this.getAdapter(task);
    return adapter.chat(request);
  }

  /**
   * Stream a chat response
   */
  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const task = request.task || "chat";
    const adapter = this.getAdapter(task);
    if (!adapter.chatStream) {
      throw new Error(`Adapter ${adapter.model} does not support streaming`);
    }
    yield* adapter.chatStream(request);
  }

  /**
   * Chat with customer context automatically injected
   */
  async chatWithContext(
    messages: Message[],
    context: CustomerContext,
    task: AITask = "chat"
  ): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const messagesWithContext: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    return this.chat({
      messages: messagesWithContext,
      context,
      task,
    });
  }

  // ===========================================================================
  // TOOL CALLING METHODS
  // ===========================================================================

  /**
   * Execute a tool call (uses Claude Opus 4.5 for complex, Sonnet for simple)
   */
  async callTool(request: ChatRequest, isComplex: boolean = true): Promise<ChatResponse> {
    const task: AITask = isComplex ? "tool_call" : "simple_tool";
    const adapter = this.getAdapter(task);
    return adapter.chat({ ...request, task });
  }

  // ===========================================================================
  // RESEARCH METHODS
  // ===========================================================================

  /**
   * Perform web research (uses Perplexity)
   */
  async research(request: ResearchRequest): Promise<ResearchResult> {
    const adapter = this.getAdapter("research");
    
    if (!adapter.research) {
      // Fallback: use chat to simulate research
      console.warn("[AI Router] Research not supported, using chat fallback");
      const response = await adapter.chat({
        messages: [
          { role: "system", content: "You are a research assistant. Provide detailed, factual information with sources when possible." },
          { role: "user", content: request.query },
        ],
      });
      return {
        answer: response.message.content,
        citations: [],
      };
    }

    return adapter.research(request);
  }

  // ===========================================================================
  // CLASSIFICATION & PARSING METHODS
  // ===========================================================================

  /**
   * Classify text into categories (uses Claude Haiku 4.5)
   */
  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const adapter = this.getAdapter("classify");
    
    if (!adapter.classify) {
      // Fallback: use structured chat
      const response = await adapter.chat({
        messages: [
          {
            role: "system",
            content: `Classify the following text into one or more of these categories: ${request.categories.join(", ")}. 
            Respond with a JSON array of objects with "label" and "confidence" (0-1) properties.`,
          },
          { role: "user", content: request.text },
        ],
      });

      try {
        const categories = JSON.parse(response.message.content);
        return { categories };
      } catch {
        return {
          categories: [{ label: request.categories[0], confidence: 0.5 }],
        };
      }
    }

    return adapter.classify(request);
  }

  /**
   * Parse text into structured data (uses Claude Haiku 4.5)
   */
  async parse(request: ParseRequest): Promise<ParseResult> {
    const adapter = this.getAdapter("parse");
    
    if (!adapter.parse) {
      // Fallback: use structured chat
      const response = await adapter.chat({
        messages: [
          {
            role: "system",
            content: `Extract structured data from the following text according to this schema: ${JSON.stringify(request.schema)}.
            Respond with valid JSON matching the schema.`,
          },
          { role: "user", content: request.text },
        ],
      });

      try {
        const data = JSON.parse(response.message.content);
        return { data, confidence: 0.8 };
      } catch {
        return { data: {}, confidence: 0 };
      }
    }

    return adapter.parse(request);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Build a system prompt with customer context
   */
  private buildSystemPrompt(context: CustomerContext): string {
    return `You are an AI assistant for Guardian Roofing & Siding, a storm damage restoration company serving PA, NJ, DE, MD, VA, and NY.

CURRENT CUSTOMER CONTEXT:
=========================
Name: ${context.customer.name}
Location: ${context.customer.city}, ${context.customer.state} ${context.customer.zipCode}
Phone: ${context.customer.phone ?? 'N/A'}
Email: ${context.customer.email ?? 'N/A'}

PROPERTY DETAILS:
- Type: ${context.property.type ?? 'Unknown'}
- Year Built: ${context.property.yearBuilt ?? 'Unknown'}
- Size: ${context.property.squareFootage?.toLocaleString() ?? 'Unknown'} sqft
- Roof Type: ${context.property.roofType ?? 'Unknown'}
- Roof Age: ${context.property.roofAge ?? 'Unknown'} years
- Property Value: $${context.property.propertyValue?.toLocaleString() ?? 'Unknown'}

INSURANCE:
- Carrier: ${context.insurance.carrier ?? 'Unknown'}
- Policy: ${context.insurance.policyType ?? 'Unknown'}
- Deductible: $${context.insurance.deductible?.toLocaleString() ?? 'Unknown'}

PIPELINE STATUS:
- Status: ${context.pipeline.status}
- Stage: ${context.pipeline.stage}
- Lead Score: ${context.pipeline.leadScore}/100
- Urgency: ${context.pipeline.urgencyScore}/100
- Profit Potential: $${context.pipeline.profitPotential?.toLocaleString() ?? '0'}
- Churn Risk: ${context.pipeline.churnRisk}%
- Assigned Rep: ${context.pipeline.assignedRep ?? 'Unassigned'}
- Last Contact: ${context.pipeline.lastContact ? (typeof context.pipeline.lastContact === 'string' ? context.pipeline.lastContact : context.pipeline.lastContact.toLocaleDateString()) : 'Never'}
- Next Action: ${context.pipeline.nextAction ?? 'None'}

WEATHER EVENTS:
${context.weatherEvents.map(e => 
  `- ${e.type.toUpperCase()} on ${new Date(e.date).toLocaleDateString()}: ${e.severity} severity${e.hailSize ? `, ${e.hailSize}" hail` : ""}${e.windSpeed ? `, ${e.windSpeed} mph winds` : ""}`
).join("\n")}

RECENT INTERACTIONS:
${context.interactions.slice(0, 5).map(i =>
  `- ${new Date(i.date).toLocaleDateString()} (${i.type}): ${i.summary}${i.objections?.length ? ` [Objections: ${i.objections.join(", ")}]` : ""}`
).join("\n")}

KEY INTELLIGENCE:
${context.intelItems.filter(i => i.priority === "high" || i.priority === "critical").map(i =>
  `- [${i.priority.toUpperCase()}] ${i.title}: ${i.content}`
).join("\n")}

YOUR ROLE:
- Provide actionable insights and next-step recommendations
- Be specific to this customer's situation
- Consider their position in the pipeline
- Factor in weather events and property condition
- Help the rep close this deal effectively
- Be concise but thorough`;
  }

  /**
   * Check if any adapters are registered
   */
  hasAdapters(): boolean {
    return this.adapters.size > 0;
  }

  /**
   * Get list of registered models
   */
  getRegisteredModels(): (AIModel | string)[] {
    return Array.from(this.adapters.keys());
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let routerInstance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter();
  }
  return routerInstance;
}

export function initializeAIRouter(adapters: AIAdapter[]): AIRouter {
  const router = getAIRouter();
  adapters.forEach(adapter => router.registerAdapter(adapter));
  return router;
}
