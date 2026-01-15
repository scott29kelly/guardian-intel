/**
 * Guardian Intel AI Service Types
 * 
 * Simplified architecture using Gemini for all tasks.
 * Additional models can be added for specialized use cases.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type AIProvider = "google" | "kimi" | "claude" | "perplexity" | "openai";

export type AIModel = 
  | "gemini-2.0-flash-exp"  // Primary - handles all tasks
  | "gemini-1.5-pro"        // Alternative Gemini model
  | "kimi-k2"               // Optional: specialized chat
  | "claude-opus-4.5"       // Optional: complex reasoning
  | "claude-sonnet-4.5"     // Optional: balanced performance
  | "claude-haiku-4.5"      // Optional: fast responses
  | "perplexity-sonar"      // Optional: web research
  | "gpt-4o";               // Optional: fallback

export type AITask = 
  | "chat"           // Conversational
  | "tool_call"      // Complex actions
  | "simple_tool"    // Simple actions
  | "research"       // Web search
  | "classify"       // Classification
  | "parse"          // Extract structured data
  | "summarize";     // Quick summaries

export interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id?: string;
  role: MessageRole;
  content: string;
  name?: string; // For tool messages
  toolCallId?: string;
  createdAt?: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AssistantMessage extends Message {
  role: "assistant";
  toolCalls?: ToolCall[];
}

// =============================================================================
// CUSTOMER CONTEXT
// =============================================================================

export interface CustomerContext {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  property: {
    type: string | null;
    yearBuilt: number | null;
    squareFootage: number | null;
    roofType: string | null;
    roofAge: number | null;
    propertyValue: number | null;
  };
  insurance: {
    carrier: string | null;
    policyType: string | null;
    deductible: number | null;
  };
  pipeline: {
    status: string;
    stage: string;
    leadScore: number;
    urgencyScore: number;
    profitPotential: number;
    churnRisk: number;
    assignedRep: string | null;
    lastContact: Date | string | null;
    nextAction: string | null;
    nextActionDate: Date | string | null;
  };
  weatherEvents: {
    id: string;
    type: string;
    date: Date | string;
    severity: string;
    hailSize?: number | null;
    windSpeed?: number | null;
    damageReported: boolean;
  }[];
  interactions: {
    id: string;
    type: string;
    date: Date;
    summary: string;
    outcome?: string;
    objections?: string[];
    sentiment?: "positive" | "neutral" | "negative";
  }[];
  intelItems: {
    id: string;
    category: string;
    title: string;
    content: string;
    priority: "low" | "medium" | "high" | "critical";
    actionable: boolean;
  }[];
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter; // For arrays
  properties?: Record<string, ToolParameter>; // For objects
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface ChatRequest {
  messages: Message[];
  context?: CustomerContext;
  task?: AITask;
  tools?: ToolDefinition[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  id: string;
  message: AssistantMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: AIModel;
  finishReason: "stop" | "tool_calls" | "length" | "error";
}

export interface StreamChunk {
  id: string;
  delta: string;
  toolCalls?: ToolCall[];
  finishReason?: ChatResponse["finishReason"];
}

// =============================================================================
// RESEARCH TYPES
// =============================================================================

export interface ResearchRequest {
  query: string;
  context?: string;
  sources?: ("web" | "news" | "academic")[];
  maxResults?: number;
}

export interface ResearchResult {
  answer: string;
  citations: {
    title: string;
    url: string;
    snippet: string;
  }[];
  relatedQueries?: string[];
}

// =============================================================================
// CLASSIFICATION TYPES
// =============================================================================

export interface ClassifyRequest {
  text: string;
  categories: string[];
  multiLabel?: boolean;
}

export interface ClassifyResult {
  categories: {
    label: string;
    confidence: number;
  }[];
}

export interface ParseRequest {
  text: string;
  schema: Record<string, ToolParameter>;
}

export interface ParseResult {
  data: Record<string, unknown>;
  confidence: number;
}

// =============================================================================
// REP ACTIVITY TYPES
// =============================================================================

export type ActivityType = "call" | "visit" | "email" | "text" | "note";
export type ActivityOutcome = 
  | "connected" 
  | "voicemail" 
  | "no_answer" 
  | "scheduled" 
  | "proposal_sent"
  | "closed_won"
  | "closed_lost"
  | "follow_up_needed";

export interface RepActivity {
  id?: string;
  customerId: string;
  repId: string;
  type: ActivityType;
  outcome?: ActivityOutcome;
  notes: string;
  objections?: string[];
  sentiment?: "positive" | "neutral" | "negative";
  nextAction?: string;
  nextActionDate?: Date;
  duration?: number; // minutes
  createdAt: Date;
  aiSummary?: string;
  aiInsights?: string[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

// Legacy AIResponse type for backward compatibility
export interface AIResponse {
  message: {
    role: "assistant";
    content: string;
    toolCalls?: ToolCall[];
  };
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIAdapter {
  readonly provider: AIProvider;
  readonly model: AIModel | string;
  
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): AsyncIterable<StreamChunk>;
  
  // Optional capabilities
  research?(request: ResearchRequest): Promise<ResearchResult>;
  classify?(request: ClassifyRequest): Promise<ClassifyResult>;
  parse?(request: ParseRequest): Promise<ParseResult>;
}
