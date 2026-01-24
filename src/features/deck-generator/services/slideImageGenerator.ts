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
}

/**
 * Generate a slide image using Nano Banana Pro (Gemini 3 Pro Image)
 *
 * @param request - The slide data, branding, and position info
 * @returns Base64 encoded PNG image data
 * @throws Error if generation fails
 */
export async function generateSlideImage(request: SlideImageRequest): Promise<string> {
  const response = await fetch('/api/ai/generate-slide-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to generate slide image: ${response.status}`);
  }

  const data: SlideImageResponse = await response.json();

  if (!data.success || !data.imageData) {
    throw new Error(data.error || 'No image data returned');
  }

  return data.imageData;
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
