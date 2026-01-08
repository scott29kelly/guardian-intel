/**
 * OpenAI Adapter (Fallback)
 * 
 * Uses GPT-4o as a fallback when other models are unavailable.
 */

import {
  AIAdapter,
  AIModel,
  AIProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  Message,
  ToolDefinition,
  ToolCall,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

// =============================================================================
// OPENAI ADAPTER CLASS
// =============================================================================

export class OpenAIAdapter implements AIAdapter {
  readonly provider: AIProvider = "openai";
  readonly model: AIModel = "gpt-4o";
  
  private apiKey: string;
  private baseUrl: string;
  private modelId: string;
  private maxTokens: number;
  private timeout: number;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
    this.modelId = config.model || "gpt-4o";
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 60000;
  }

  // ===========================================================================
  // CHAT METHODS
  // ===========================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, tools, maxTokens, temperature } = request;
    
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: this.convertMessages(messages),
      max_tokens: maxTokens || this.maxTokens,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
      body.tool_choice = "auto";
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
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("[OpenAI Adapter] Chat error:", error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { messages, tools, maxTokens, temperature } = request;
    
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: this.convertMessages(messages),
      max_tokens: maxTokens || this.maxTokens,
      stream: true,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
      body.tool_choice = "auto";
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
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let messageId = `openai-${Date.now()}`;

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
                messageId = chunk.id;
                yield chunk;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("[OpenAI Adapter] Stream error:", error);
      throw error;
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private convertMessages(messages: Message[]): Array<Record<string, unknown>> {
    return messages.map(m => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      };

      if (m.name) {
        msg.name = m.name;
      }

      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }

      return msg;
    });
  }

  private convertTools(tools: ToolDefinition[]): Array<Record<string, unknown>> {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private parseResponse(data: Record<string, unknown>): ChatResponse {
    const choices = data.choices as Array<{
      message: {
        role: string;
        content: string | null;
        tool_calls?: Array<{
          id: string;
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason: string;
    }>;

    const choice = choices[0];
    const usage = data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;

    let finishReason: ChatResponse["finishReason"] = "stop";
    if (choice.finish_reason === "tool_calls") finishReason = "tool_calls";
    else if (choice.finish_reason === "length") finishReason = "length";

    const toolCalls: ToolCall[] = [];
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        } catch {
          // Skip malformed tool calls
        }
      }
    }

    return {
      id: data.id as string || `openai-${Date.now()}`,
      message: {
        role: "assistant",
        content: choice.message.content || "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
    const id = event.id as string || currentId;
    const choices = event.choices as Array<{
      delta: { content?: string };
      finish_reason?: string;
    }> | undefined;

    if (!choices || choices.length === 0) return null;

    const choice = choices[0];
    const delta = choice.delta?.content || "";

    if (choice.finish_reason) {
      return {
        id,
        delta,
        finishReason: choice.finish_reason === "stop" ? "stop" : "length",
      };
    }

    if (delta) {
      return {
        id,
        delta,
      };
    }

    return null;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createOpenAIAdapter(apiKey: string): OpenAIAdapter {
  return new OpenAIAdapter({ apiKey });
}
