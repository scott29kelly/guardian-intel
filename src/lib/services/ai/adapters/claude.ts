/**
 * Claude AI Adapter
 * 
 * Supports:
 * - Claude Opus 4.5 (complex tool calling)
 * - Claude Sonnet 4.5 (simple tool calling)
 * - Claude Haiku 4.5 (fast classification/parsing)
 */

import {
  AIAdapter,
  AIModel,
  AIProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ClassifyRequest,
  ClassifyResult,
  ParseRequest,
  ParseResult,
  Message,
  ToolDefinition,
  ToolCall,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

type ClaudeModel = "claude-opus-4.5" | "claude-sonnet-4.5" | "claude-haiku-4.5";

const CLAUDE_MODEL_IDS: Record<ClaudeModel, string> = {
  "claude-opus-4.5": "claude-opus-4-20250514", // Update with actual model ID
  "claude-sonnet-4.5": "claude-sonnet-4-20250514", // Update with actual model ID
  "claude-haiku-4.5": "claude-haiku-4-20250514", // Update with actual model ID
};

interface ClaudeConfig {
  apiKey: string;
  model: ClaudeModel;
  baseUrl?: string;
  maxTokens?: number;
  timeout?: number;
}

// =============================================================================
// CLAUDE ADAPTER CLASS
// =============================================================================

export class ClaudeAdapter implements AIAdapter {
  readonly provider: AIProvider = "claude";
  readonly model: AIModel;
  
  private apiKey: string;
  private modelId: string;
  private baseUrl: string;
  private maxTokens: number;
  private timeout: number;

  constructor(config: ClaudeConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.modelId = CLAUDE_MODEL_IDS[config.model];
    this.baseUrl = config.baseUrl || "https://api.anthropic.com";
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 60000;
  }

  // ===========================================================================
  // CHAT METHODS
  // ===========================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, tools, maxTokens, temperature } = request;
    
    // Convert messages to Claude format
    const claudeMessages = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    
    // Build request body
    const body: Record<string, unknown> = {
      model: this.modelId,
      max_tokens: maxTokens || this.maxTokens,
      messages: claudeMessages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("[Claude Adapter] Chat error:", error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { messages, tools, maxTokens, temperature } = request;
    
    const claudeMessages = this.convertMessages(messages);
    const systemPrompt = this.extractSystemPrompt(messages);
    
    const body: Record<string, unknown> = {
      model: this.modelId,
      max_tokens: maxTokens || this.maxTokens,
      messages: claudeMessages,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let messageId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              const chunk = this.parseStreamEvent(event, messageId);
              if (chunk) {
                messageId = chunk.id;
                yield chunk;
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("[Claude Adapter] Stream error:", error);
      throw error;
    }
  }

  // ===========================================================================
  // CLASSIFICATION & PARSING
  // ===========================================================================

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const { text, categories, multiLabel } = request;
    
    const prompt = multiLabel
      ? `Classify this text into one or more of these categories: ${categories.join(", ")}.
         Return a JSON array of objects with "label" and "confidence" (0-1).
         Only include categories that apply.`
      : `Classify this text into exactly one of these categories: ${categories.join(", ")}.
         Return a JSON object with "label" and "confidence" (0-1).`;

    const response = await this.chat({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: 0,
    });

    try {
      const result = JSON.parse(response.message.content);
      const categoriesResult = Array.isArray(result) ? result : [result];
      return { categories: categoriesResult };
    } catch {
      return {
        categories: [{ label: categories[0], confidence: 0.5 }],
      };
    }
  }

  async parse(request: ParseRequest): Promise<ParseResult> {
    const { text, schema } = request;
    
    const prompt = `Extract structured data from the text according to this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON matching the schema. Do not include any explanation.`;

    const response = await this.chat({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: 0,
    });

    try {
      // Try to extract JSON from the response
      let content = response.message.content.trim();
      
      // Handle markdown code blocks
      if (content.startsWith("```")) {
        content = content.replace(/```(?:json)?\n?/g, "").trim();
      }
      
      const data = JSON.parse(content);
      return { data, confidence: 0.9 };
    } catch {
      return { data: {}, confidence: 0 };
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
    return messages
      .filter(m => m.role !== "system") // System is handled separately
      .map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
  }

  private extractSystemPrompt(messages: Message[]): string | undefined {
    const systemMessages = messages.filter(m => m.role === "system");
    if (systemMessages.length === 0) return undefined;
    return systemMessages.map(m => m.content).join("\n\n");
  }

  private convertTools(tools: ToolDefinition[]): Array<Record<string, unknown>> {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.parameters.properties,
        required: tool.parameters.required || [],
      },
    }));
  }

  private parseResponse(data: Record<string, unknown>): ChatResponse {
    const content = data.content as Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
    
    let messageContent = "";
    const toolCalls: ToolCall[] = [];

    for (const block of content) {
      if (block.type === "text" && block.text) {
        messageContent += block.text;
      } else if (block.type === "tool_use" && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    const stopReason = data.stop_reason as string;
    let finishReason: ChatResponse["finishReason"] = "stop";
    if (stopReason === "tool_use") finishReason = "tool_calls";
    else if (stopReason === "max_tokens") finishReason = "length";

    return {
      id: data.id as string,
      message: {
        role: "assistant",
        content: messageContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      usage: data.usage ? {
        promptTokens: (data.usage as Record<string, number>).input_tokens,
        completionTokens: (data.usage as Record<string, number>).output_tokens,
        totalTokens: (data.usage as Record<string, number>).input_tokens + 
                     (data.usage as Record<string, number>).output_tokens,
      } : undefined,
      model: this.model,
      finishReason,
    };
  }

  private parseStreamEvent(
    event: Record<string, unknown>,
    currentId: string
  ): StreamChunk | null {
    const type = event.type as string;

    if (type === "message_start") {
      const message = event.message as Record<string, unknown>;
      return {
        id: message.id as string,
        delta: "",
      };
    }

    if (type === "content_block_delta") {
      const delta = event.delta as Record<string, unknown>;
      if (delta.type === "text_delta") {
        return {
          id: currentId,
          delta: delta.text as string,
        };
      }
    }

    if (type === "message_stop") {
      return {
        id: currentId,
        delta: "",
        finishReason: "stop",
      };
    }

    return null;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createClaudeOpusAdapter(apiKey: string): ClaudeAdapter {
  return new ClaudeAdapter({
    apiKey,
    model: "claude-opus-4.5",
  });
}

export function createClaudeSonnetAdapter(apiKey: string): ClaudeAdapter {
  return new ClaudeAdapter({
    apiKey,
    model: "claude-sonnet-4.5",
  });
}

export function createClaudeHaikuAdapter(apiKey: string): ClaudeAdapter {
  return new ClaudeAdapter({
    apiKey,
    model: "claude-haiku-4.5",
  });
}
