/**
 * Gemini AI Adapter
 * 
 * Uses Google's Gemini models for chat and tool calling.
 * - Gemini 2.0 Flash: Fast, cost-effective responses
 */

import type { AIAdapter, Message, ChatResponse, ChatRequest, ToolDefinition, AITask, StreamChunk, AIModel } from "../types";

export class GeminiAdapter implements AIAdapter {
  readonly name = "gemini";
  readonly provider = "google" as const;
  readonly model: AIModel;
  
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private modelName: string;

  constructor(apiKey: string, model: AIModel = "gemini-2.0-flash-exp") {
    this.apiKey = apiKey;
    this.model = model;
    this.modelName = model;
  }

  supports(task: AITask): boolean {
    // Gemini Flash is good for chat and simple tasks
    return ["chat", "fast", "simple_tool"].includes(task);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, temperature = 0.7, maxTokens = 2048 } = request;

    // Convert messages to Gemini format
    const contents = this.convertMessages(messages);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              topP: 0.95,
              topK: 40,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      return {
        id: `gemini-${Date.now()}`,
        message: {
          role: "assistant" as const,
          content,
        },
model: this.model as AIModel,
        finishReason: "stop" as const,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error("[Gemini] Chat error:", error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const { messages, temperature = 0.7 } = request;
    const contents = this.convertMessages(messages);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const streamId = `gemini-stream-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { id: streamId, delta: "", finishReason: "stop" };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                yield { id: streamId, delta: text };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { id: streamId, delta: "", finishReason: "stop" };
    } catch (error) {
      console.error("[Gemini] Stream error:", error);
      throw error;
    }
  }

  async callToolWithMessages(
    messages: Message[],
    tools: ToolDefinition[],
    temperature: number = 0.3
  ): Promise<ChatResponse> {
    // Convert messages and tools to Gemini format
    const contents = this.convertMessages(messages);
    const functionDeclarations = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            tools: [{ functionDeclarations }],
            generationConfig: {
              temperature,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check for function calls
      const functionCalls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
      
      if (functionCalls.length > 0) {
        return {
          id: `gemini-${Date.now()}`,
          message: {
            role: "assistant",
            content: "",
            toolCalls: functionCalls.map((fc: { functionCall: { name: string; args: Record<string, unknown> } }, index: number) => ({
              id: `call_${Date.now()}_${index}`,
              name: fc.functionCall.name,
              arguments: fc.functionCall.args,
            })),
          },
          model: this.model,
          finishReason: "tool_calls",
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        };
      }

      // No function calls, return text response
      const textContent = parts.find((p: { text?: string }) => p.text)?.text || "";
      
      return {
        id: `gemini-${Date.now()}`,
        message: {
          role: "assistant",
          content: textContent,
        },
        model: this.model,
        finishReason: "stop",
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error("[Gemini] Tool call error:", error);
      throw error;
    }
  }

  private convertMessages(messages: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    // Gemini uses "user" and "model" roles
    // System messages need to be prepended to the first user message
    const systemMessages = messages.filter(m => m.role === "system");
    const nonSystemMessages = messages.filter(m => m.role !== "system");

    const systemPrompt = systemMessages.map(m => m.content).join("\n\n");

    return nonSystemMessages.map((msg, index) => {
      let content = msg.content;
      
      // Prepend system prompt to first user message
      if (index === 0 && msg.role === "user" && systemPrompt) {
        content = `${systemPrompt}\n\n---\n\n${content}`;
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      };
    });
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createGeminiFlashAdapter(apiKey: string): GeminiAdapter {
  return new GeminiAdapter(apiKey, "gemini-2.0-flash-exp");
}

export function createGeminiProAdapter(apiKey: string): GeminiAdapter {
  return new GeminiAdapter(apiKey, "gemini-1.5-pro");
}
