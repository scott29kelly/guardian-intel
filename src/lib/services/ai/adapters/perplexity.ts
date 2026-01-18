/**
 * Perplexity AI Adapter
 * 
 * Purpose-built for web research with citations.
 * Uses Perplexity's Sonar model for research queries.
 */

import {
  AIAdapter,
  AIModel,
  AIProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ResearchRequest,
  ResearchResult,
  Message,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface PerplexityConfig {
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  timeout?: number;
}

// =============================================================================
// PERPLEXITY ADAPTER CLASS
// =============================================================================

export class PerplexityAdapter implements AIAdapter {
  readonly provider: AIProvider = "perplexity";
  readonly model: AIModel = "perplexity-sonar";
  
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;
  private timeout: number;

  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.perplexity.ai";
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 60000;
  }

  // ===========================================================================
  // CHAT METHODS
  // ===========================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, maxTokens, temperature } = request;
    
    const body: Record<string, unknown> = {
      model: "sonar", // Perplexity Sonar model
      messages: this.convertMessages(messages),
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
        throw new Error(`Perplexity API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("[Perplexity Adapter] Chat error:", error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { messages, maxTokens, temperature } = request;
    
    const body: Record<string, unknown> = {
      model: "sonar",
      messages: this.convertMessages(messages),
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
        throw new Error(`Perplexity API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let messageId = `pplx-${Date.now()}`;

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
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("[Perplexity Adapter] Stream error:", error);
      throw error;
    }
  }

  // ===========================================================================
  // RESEARCH METHOD (PERPLEXITY SPECIALTY)
  // ===========================================================================

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const { query, context, sources } = request;
    
    // Build a research-optimized prompt
    let systemPrompt = "You are a research assistant. Provide detailed, accurate information with citations.";
    
    if (sources && sources.length > 0) {
      systemPrompt += ` Focus on ${sources.join(", ")} sources.`;
    }

    let userPrompt = query;
    if (context) {
      userPrompt = `Context: ${context}\n\nQuery: ${query}`;
    }

    const response = await this.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // Perplexity includes citations in its response
    // Parse them out if present
    const citations = this.extractCitations(response.message.content);

    return {
      answer: response.message.content,
      citations,
    };
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

    // Extract citations if present in the response
    const citations = data.citations as Array<{ url: string; title?: string }> | undefined;

    let content = choice.message.content;
    
    // Append citations if present
    if (citations && citations.length > 0) {
      content += "\n\n**Sources:**\n";
      citations.forEach((c, i) => {
        content += `[${i + 1}] ${c.title || c.url} - ${c.url}\n`;
      });
    }

    return {
      id: data.id as string || `pplx-${Date.now()}`,
      message: {
        role: "assistant",
        content,
      },
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
      model: this.model,
      finishReason: "stop",
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
        finishReason: "stop",
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

  private extractCitations(content: string): ResearchResult["citations"] {
    const citations: ResearchResult["citations"] = [];
    
    // Look for common citation patterns
    // [1] Title - URL or [Source](URL) patterns
    const urlRegex = /\[(\d+)\]\s*([^-\n]+)\s*-?\s*(https?:\/\/[^\s\n]+)/g;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(content)) !== null) {
      citations.push({
        title: match[2].trim(),
        url: match[3].trim(),
        snippet: "",
      });
    }

    // Also try markdown link pattern
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let mdMatch: RegExpExecArray | null;
    while ((mdMatch = mdLinkRegex.exec(content)) !== null) {
      // Avoid duplicates
const url = mdMatch[2];
      if (!citations.some(c => c.url === url)) {
        citations.push({
          title: mdMatch[1].trim(),
          url: url.trim(),
          snippet: "",
        });
      }
    }

    return citations;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPerplexityAdapter(apiKey: string): PerplexityAdapter {
  return new PerplexityAdapter({ apiKey });
}
