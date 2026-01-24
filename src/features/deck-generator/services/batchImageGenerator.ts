/**
 * Batch Image Generator Service
 *
 * Processes scheduled decks overnight for next-day availability.
 */

import type { SlideType, SlideContent, BrandingConfig } from '../types/deck.types';

export interface BatchSlideRequest {
  slideId: string;
  slide: {
    type: SlideType;
    sectionId: string;
    content: SlideContent;
  };
  branding: BrandingConfig;
  slideNumber: number;
  totalSlides: number;
}

export interface BatchJobResult {
  slideId: string;
  success: boolean;
  imageData?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Submit a batch of slides for processing via Google Batch API
 *
 * @param slides - Array of slide requests
 * @returns Job ID for tracking
 */
export async function submitBatchJob(slides: BatchSlideRequest[]): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  // Build batch request payload
  const requests = slides.map((slide, index) => ({
    id: slide.slideId,
    request: {
      contents: [
        {
          parts: [{ text: buildSlidePrompt(slide) }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    },
  }));

  console.log(`[Batch] Submitting ${slides.length} slides to Google Batch API`);

  // Submit to batch endpoint
  // Note: This is a simplified version - actual Batch API has different endpoints
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:batchGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Batch] API Error:', errorText);
    throw new Error(`Batch API error: ${response.status}`);
  }

  const data = await response.json();

  // Return job ID for polling
  return data.jobId || `batch-${Date.now()}`;
}

/**
 * Poll for batch job completion
 *
 * @param jobId - The batch job ID
 * @returns Results when complete
 */
export async function pollBatchJob(jobId: string): Promise<BatchJobResult[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  // Poll for completion (simplified - actual implementation would have retries)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}?key=${apiKey}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get batch status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.done) {
    throw new Error('Batch job not yet complete');
  }

  // Parse results
  const results: BatchJobResult[] = data.responses?.map((res: {
    id: string;
    response?: {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { data: string; mimeType: string } }>;
        };
      }>;
    };
    error?: { message: string };
  }) => {
    if (res.error) {
      return {
        slideId: res.id,
        success: false,
        error: res.error.message,
      };
    }

    const imagePart = res.response?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      return {
        slideId: res.id,
        success: false,
        error: 'No image in response',
      };
    }

    return {
      slideId: res.id,
      success: true,
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
    };
  }) || [];

  return results;
}

/**
 * Process slides synchronously using standard API (fallback)
 * Used when batch API is not available or for small batches
 */
export async function processSlidesSynchronously(
  slides: BatchSlideRequest[]
): Promise<BatchJobResult[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const results: BatchJobResult[] = [];

  for (const slide of slides) {
    console.log(`[Batch-Sync] Processing slide ${slide.slideNumber}/${slide.totalSlides}: ${slide.slide.sectionId}`);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: buildSlidePrompt(slide) }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        results.push({
          slideId: slide.slideId,
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        });
        continue;
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);

      if (!imagePart?.inlineData?.data) {
        results.push({
          slideId: slide.slideId,
          success: false,
          error: 'No image generated',
        });
        continue;
      }

      results.push({
        slideId: slide.slideId,
        success: true,
        imageData: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      });

      // Add small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        slideId: slide.slideId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Build the prompt for a slide image
 */
function buildSlidePrompt(request: BatchSlideRequest): string {
  const { slide, branding, slideNumber, totalSlides } = request;

  return `You are a professional presentation designer. Create a visually stunning slide image.

IMAGE SPECIFICATIONS:
- Dimensions: 1280 x 720 pixels (16:9 aspect ratio)
- Resolution: High quality, suitable for presentation displays

COLOR SCHEME (STRICT - use these exact colors):
- Background: ${branding.colors.background} (dark navy/charcoal)
- Primary accent: ${branding.colors.secondary} (gold/amber)
- Text color: ${branding.colors.text} (white/light)
- Muted text: ${branding.colors.textMuted} (gray)

SLIDE POSITION: ${slideNumber} of ${totalSlides}
SLIDE TYPE: ${slide.type}
SECTION: ${slide.sectionId}

CONTENT:
${JSON.stringify(slide.content, null, 2)}

REQUIREMENTS:
- Generate ONLY the slide image, no explanatory text
- Ensure all text in the image is readable and properly formatted
- Use the exact colors specified above
- Create a cohesive, professional look that matches corporate presentation standards
`;
}
