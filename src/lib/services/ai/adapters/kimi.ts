/**
 * Kimi K2 AI Adapter
 * 
 * Moonshot AI's Kimi K2 model for conversational chat.
 * Known for:
 * - Excellent conversational style
 * - Long context window (up to 1M tokens)
 * - Strong reasoning capabilities
 */

import {
  AIAdapter,
  AIModel,
  AIProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  Message,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface KimiConfig {
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  timeout?: number;
}

// =============================================================================
// KIMI K2 ADAPTER CLASS
// =============================================================================

export class KimiAdapter implements AIAdapter {
  readonly provider: AIProvider = "kimi";
  readonly model: AIModel = "kimi-k2";
  
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;
  private timeout: number;

  constructor(config: KimiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.moonshot.cn/v1";
    this.maxTokens = config.maxTokens || 8192;
    this.timeout = config.timeout || 60000;
  }

  // ===========================================================================
  // CHAT METHODS
  // ===========================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, maxTokens, temperature } = request;
    
    // Convert messages to Kimi format (OpenAI-compatible)
    const kimiMessages = this.convertMessages(messages);
    
    const body: Record<string, unknown> = {
      model: "moonshot-v1-128k", // Kimi K2 model identifier
      messages: kimiMessages,
      max_tokens: maxTokens || this.maxTokens,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("[Kimi Adapter] Chat error:", error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { messages, maxTokens, temperature } = request;
    
    const kimiMessages = this.convertMessages(messages);
    
    const body: Record<string, unknown> = {
      model: "moonshot-v1-128k",
      messages: kimiMessages,
      max_tokens: maxTokens || this.maxTokens,
      stream: true,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kimi API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let messageId = `kimi-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              yield {
                id: messageId,
                delta: "",
                finishReason: "stop",
              };
              continue;
            }

            try {
              const event = JSON.parse(data);
              const chunk = this.parseStreamEvent(event, messageId);
              if (chunk) {
                yield chunk;
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("[Kimi Adapter] Stream error:", error);
      throw error;
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
    return messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  private parseResponse(data: Record<string, unknown>): ChatResponse {
    const choices = data.choices as Array<{
      message: { role: string; content: string };
      finish_reason: string;
    }>;

    const choice = choices[0];
    const usage = data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;

    let finishReason: ChatResponse["finishReason"] = "stop";
    if (choice.finish_reason === "length") finishReason = "length";

    return {
      id: data.id as string || `kimi-${Date.now()}`,
      message: {
        role: "assistant",
        content: choice.message.content,
      },
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
      model: this.model,
      finishReason,
    };
  }

  private parseStreamEvent(
    event: Record<string, unknown>,
    currentId: string
  ): StreamChunk | null {
    const choices = event.choices as Array<{
      delta: { content?: string };
      finish_reason?: string;
    }> | undefined;

    if (!choices || choices.length === 0) return null;

    const choice = choices[0];
    const delta = choice.delta?.content || "";

    if (choice.finish_reason) {
      return {
        id: currentId,
        delta,
        finishReason: choice.finish_reason === "stop" ? "stop" : "length",
      };
    }

    if (delta) {
      return {
        id: currentId,
        delta,
      };
    }

    return null;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createKimiAdapter(apiKey: string): KimiAdapter {
  return new KimiAdapter({ apiKey });
}
