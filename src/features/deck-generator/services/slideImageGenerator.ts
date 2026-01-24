/**
 * Slide Image Generator Service
 *
 * Calls the Nano Banana Pro (Gemini 3 Pro Image) API to generate
 * visually stunning slide images for the deck generator.
 */

import type { SlideType, SlideContent, BrandingConfig } from '../types/deck.types';

export interface SlideImageRequest {
  slide: {
    type: SlideType;
    sectionId: string;
    content: SlideContent;
  };
  branding: BrandingConfig;
  slideNumber: number;
  totalSlides: number;
}

export interface SlideImageResponse {
  success: boolean;
  imageData?: string; // Base64 PNG
  mimeType?: string;
  error?: string;
  code?: string;
  retryable?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // Exponential backoff: 1s, 2s, 4s
};

/**
 * Generate a slide image using Nano Banana Pro (Gemini 3 Pro Image)
 * Includes retry logic with exponential backoff (1s, 2s, 4s delays)
 *
 * @param request - The slide data, branding, and position info
 * @param retryConfig - Optional retry configuration
 * @returns Base64 encoded PNG image data
 * @throws Error if all retries exhausted
 */
export async function generateSlideImage(
  request: SlideImageRequest,
  retryConfig: Partial<RetryConfig> = {}
): Promise<string> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;
  let lastErrorCode: string | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch('/api/ai/generate-slide-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      // Handle 404 specifically - route may be briefly unavailable during hot reload
      if (response.status === 404) {
        const error = new Error('Slide image API route not found (404). Route may be initializing.');
        lastError = error;
        lastErrorCode = 'ROUTE_NOT_FOUND';

        if (attempt < config.maxRetries) {
          const delay = config.baseDelayMs * Math.pow(2, attempt);
          config.onRetry?.(attempt + 1, error, delay);
          console.warn(`[SlideImageGenerator] 404 on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }

      const data: SlideImageResponse = await response.json().catch(() => ({
        success: false,
        error: 'Invalid JSON response',
        code: 'PARSE_ERROR',
        retryable: true,
      }));

      // Success case
      if (response.ok && data.success && data.imageData) {
        if (attempt > 0) {
          console.log(`[SlideImageGenerator] Succeeded on attempt ${attempt + 1}`);
        }
        return data.imageData;
      }

      // Failure case - check if retryable
      const errorMessage = data.error || `Failed to generate slide image: ${response.status}`;
      const error = new Error(errorMessage);
      lastError = error;
      lastErrorCode = data.code || 'UNKNOWN';

      // Don't retry non-retryable errors (e.g., missing API key)
      if (data.retryable === false) {
        console.error(`[SlideImageGenerator] Non-retryable error: ${errorMessage}`);
        throw error;
      }

      // Retry if we have attempts left
      if (attempt < config.maxRetries) {
        const delay = config.baseDelayMs * Math.pow(2, attempt);
        config.onRetry?.(attempt + 1, error, delay);
        console.warn(
          `[SlideImageGenerator] Attempt ${attempt + 1} failed (${data.code}): ${errorMessage}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    } catch (networkError) {
      // Network-level errors (fetch failed, connection refused, etc.)
      lastError =
        networkError instanceof Error
          ? networkError
          : new Error('Network error during image generation');
      lastErrorCode = 'NETWORK_ERROR';

      if (attempt < config.maxRetries) {
        const delay = config.baseDelayMs * Math.pow(2, attempt);
        config.onRetry?.(attempt + 1, lastError, delay);
        console.warn(`[SlideImageGenerator] Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  const finalError = new Error(
    `Image generation failed after ${config.maxRetries + 1} attempts. ` +
      `Last error (${lastErrorCode}): ${lastError?.message || 'Unknown'}`
  );
  console.error(`[SlideImageGenerator] All retries exhausted:`, finalError.message);
  throw finalError;
}

/**
 * Generate images for multiple slides in sequence
 *
 * @param slides - Array of slide configurations
 * @param branding - Branding configuration
 * @param onProgress - Optional progress callback
 * @returns Array of base64 image data (or null for failed slides)
 */
export async function generateAllSlideImages(
  slides: Array<{ type: SlideType; sectionId: string; content: SlideContent }>,
  branding: BrandingConfig,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<Array<string | null>> {
  const results: Array<string | null> = [];
  const total = slides.length;

  for (let i = 0; i < total; i++) {
    const slide = slides[i];
    const slideNumber = i + 1;

    onProgress?.(slideNumber, total, `Generating image for ${slide.sectionId}...`);

    try {
      const imageData = await generateSlideImage({
        slide,
        branding,
        slideNumber,
        totalSlides: total,
      });
      results.push(imageData);
    } catch (error) {
      console.error(`Failed to generate image for slide ${slideNumber}:`, error);
      results.push(null);
    }
  }

  return results;
}
