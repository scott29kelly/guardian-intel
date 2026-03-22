/**
 * Gemini Pro Image Adapter (NB Pro — gemini-3-pro-image)
 *
 * High-fidelity image generation adapter for complex compositions.
 * No web search grounding. Supports reference images (up to 10) and resolution tiers.
 * Retry with exponential backoff (1s, 2s, 4s).
 */

import type {
  AIAdapter,
  AIModel,
  ChatRequest,
  ChatResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

interface GeminiImageApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // base64
        };
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    message: string;
    code: number;
  };
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

// =============================================================================
// ADAPTER
// =============================================================================

export class GeminiProImageAdapter implements AIAdapter {
  readonly provider = 'google' as const;
  readonly model: AIModel = 'gemini-3-pro-image' as AIModel;

  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Standard chat — required by AIAdapter interface.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, temperature = 0.7, maxTokens = 2048 } = request;

    const contents = messages
      .filter(m => m.role !== 'system')
      .map((msg, index) => {
        const systemMessages = messages.filter(m => m.role === 'system');
        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
        let content = msg.content;
        if (index === 0 && msg.role === 'user' && systemPrompt) {
          content = `${systemPrompt}\n\n---\n\n${content}`;
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content }],
        };
      });

    const response = await fetch(
      `${this.baseUrl}/models/gemini-3-pro-image:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini Pro Image API error: ${error.error?.message || response.statusText}`);
    }

    const data: GeminiImageApiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      id: `gemini-pro-image-${Date.now()}`,
      message: { role: 'assistant' as const, content: text },
      model: this.model,
      finishReason: 'stop' as const,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  /**
   * Generate an image using Gemini Pro Image model (NB Pro).
   * High-fidelity generation for complex compositions and customer-facing output.
   * Supports reference images (up to 10). No web search grounding.
   * Retry with exponential backoff (1s, 2s, 4s).
   */
  async generateImage(
    request: ImageGenerationRequest,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<ImageGenerationResponse> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await this.callImageApi(request);
        if (attempt > 0) {
          console.log(`[GeminiProImage] Succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (isNonRetryable(error)) {
          console.error(`[GeminiProImage] Non-retryable error: ${lastError.message}`);
          throw lastError;
        }

        if (attempt < config.maxRetries) {
          const delay = config.baseDelayMs * Math.pow(2, attempt);
          config.onRetry?.(attempt + 1, lastError, delay);
          console.warn(
            `[GeminiProImage] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw new Error(
      `Image generation failed after ${config.maxRetries + 1} attempts. ` +
        `Last error: ${lastError?.message || 'Unknown'}`
    );
  }

  /**
   * Core API call for image generation.
   * NB Pro: no web search grounding, max 10 reference images, emphasis on visual fidelity.
   */
  private async callImageApi(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];

    // Add reference images (max 10 for NB Pro)
    if (request.referenceImages) {
      for (const ref of request.referenceImages.slice(0, 10)) {
        parts.push({
          inlineData: {
            mimeType: ref.mimeType || 'image/png',
            data: ref.data,
          },
        });
      }
    }

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.4,
      },
    };

    // NB Pro does NOT support web search grounding — intentionally omitted

    const response = await fetch(
      `${this.baseUrl}/models/gemini-3-pro-image:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = (errorData as GeminiImageApiResponse).error?.message || response.statusText;
      const error = new Error(`Gemini Pro Image API error (${response.status}): ${message}`);
      if (response.status === 401 || response.status === 403) {
        (error as Error & { nonRetryable: boolean }).nonRetryable = true;
      }
      throw error;
    }

    const data: GeminiImageApiResponse = await response.json();
    const candidate = data.candidates?.[0];
    const responseParts = candidate?.content?.parts || [];

    const imagePart = responseParts.find(p => p.inlineData);
    if (!imagePart?.inlineData) {
      throw new Error('No image data in response — model may have returned text only');
    }

    return {
      imageData: imagePart.inlineData.data,
      model: 'gemini-3-pro-image',
    };
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function isNonRetryable(error: unknown): boolean {
  if (error instanceof Error && 'nonRetryable' in error) {
    return (error as Error & { nonRetryable: boolean }).nonRetryable === true;
  }
  return false;
}

// =============================================================================
// FACTORY
// =============================================================================

export function createGeminiProImageAdapter(apiKey: string): GeminiProImageAdapter {
  return new GeminiProImageAdapter(apiKey);
}
