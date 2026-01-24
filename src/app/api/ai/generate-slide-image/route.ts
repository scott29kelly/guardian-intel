import { NextRequest, NextResponse } from "next/server";
import type { SlideType, SlideContent, BrandingConfig } from "@/features/deck-generator/types/deck.types";

// Ensure route stability during hot reload and prevent caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Timeout for Gemini API requests (60 seconds)
const GEMINI_TIMEOUT_MS = 60000;

// =============================================================================
// NANO BANANA PRO (GEMINI 3 PRO IMAGE) SLIDE GENERATOR
// =============================================================================

interface SlideImageRequest {
  slide: {
    type: SlideType;
    sectionId: string;
    content: SlideContent;
  };
  branding: BrandingConfig;
  slideNumber: number;
  totalSlides: number;
}

// =============================================================================
// PROMPT BUILDERS FOR EACH SLIDE TYPE
// =============================================================================

function buildTitlePrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    subtitle?: string;
    customerName?: string;
    address?: string;
    preparedFor?: string;
    date?: string;
  };

  const title = data.title || data.customerName || "Customer Prep Deck";
  const subtitle = data.subtitle || data.address || "";

  return `
TITLE SLIDE CONTENT:
- Main headline (large, bold, centered): "${title}"
${subtitle ? `- Subtitle (smaller, below headline): "${subtitle}"` : ""}
${data.preparedFor ? `- "Prepared for: ${data.preparedFor}"` : ""}
${data.date ? `- Date: ${data.date}` : ""}

DESIGN REQUIREMENTS:
- Make the title dramatically large and impactful
- Add subtle geometric decorations (lines, shapes) using the accent color
- Include a small company logo placeholder in the corner
- Create a sense of premium, professional quality
`;
}

function buildStatsPrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    stats?: Array<{ label: string; value: string | number; icon?: string }>;
    footnote?: string;
  };

  const statsText = data.stats
    ?.map((s, i) => `  ${i + 1}. ${s.label}: ${s.value}`)
    .join("\n") || "";

  return `
STATISTICS SLIDE CONTENT:
- Title: "${data.title || "Key Metrics"}"
- Key statistics to display prominently:
${statsText}

DESIGN REQUIREMENTS:
- Display each stat as a large, eye-catching number
- Use circular progress indicators or stylized gauges where appropriate
- Arrange stats in a balanced grid layout (2x2 or 1x3)
- Add subtle icons next to each stat
- Make the most important stat (first one) the largest/most prominent
${data.footnote ? `- Footer note: "${data.footnote}"` : ""}
`;
}

function buildListPrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    items?: Array<{ primary: string; secondary?: string; highlight?: boolean }>;
    numbered?: boolean;
  };

  const itemsText = data.items
    ?.map((item, i) => {
      const prefix = data.numbered ? `${i + 1}.` : "•";
      const highlight = item.highlight ? " [HIGHLIGHT THIS]" : "";
      return `  ${prefix} ${item.primary}${item.secondary ? ` - ${item.secondary}` : ""}${highlight}`;
    })
    .join("\n") || "";

  return `
LIST SLIDE CONTENT:
- Title: "${data.title || "Key Points"}"
- Items:
${itemsText}

DESIGN REQUIREMENTS:
- Create a clean, scannable list layout
- ${data.numbered ? "Use numbered list with stylized numbers" : "Use elegant bullet points"}
- Highlight important items with accent color background or border
- Add subtle icons for each item if relevant
- Ensure text is readable at presentation distance
`;
}

function buildTimelinePrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    events?: Array<{ date: string; title: string; description?: string; status?: string }>;
  };

  const eventsText = data.events
    ?.map((e) => `  - ${e.date}: ${e.title}${e.status ? ` (${e.status})` : ""}`)
    .join("\n") || "";

  return `
TIMELINE SLIDE CONTENT:
- Title: "${data.title || "Timeline"}"
- Events (chronological order):
${eventsText}

DESIGN REQUIREMENTS:
- Create a horizontal timeline flowing left to right
- Use connected nodes/circles for each event
- Add dates above and event titles below the timeline
- Use different colors/styles for completed vs upcoming events
- Add subtle connecting lines between events
- Make it visually engaging like an infographic
`;
}

function buildTalkingPointsPrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    points?: Array<{ topic: string; script: string; priority?: string }>;
  };

  const pointsText = data.points
    ?.map((p, i) => `  ${i + 1}. ${p.topic}: "${p.script.substring(0, 100)}..."`)
    .join("\n") || "";

  return `
TALKING POINTS SLIDE CONTENT:
- Title: "${data.title || "Key Talking Points"}"
- Discussion points:
${pointsText}

DESIGN REQUIREMENTS:
- Create a speaker-notes style layout
- Each point should have a bold topic header
- Include brief bullet summaries (not full scripts)
- Use visual hierarchy to show priority
- Add speech bubble or conversation icons
- Make it easy to glance at during a presentation
`;
}

function buildChartPrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    chartType?: string;
    data?: Array<Record<string, string | number>>;
    xKey?: string;
    yKey?: string;
  };

  return `
CHART SLIDE CONTENT:
- Title: "${data.title || "Data Visualization"}"
- Chart type: ${data.chartType || "bar"}
- Data visualization showing trends/comparisons

DESIGN REQUIREMENTS:
- Create a clean, professional ${data.chartType || "bar"} chart
- Use the accent color (gold) for data elements
- Include axis labels and a legend if needed
- Add subtle grid lines for readability
- Make data points/bars visually prominent
`;
}

function buildImagePrompt(content: SlideContent): string {
  const data = content as {
    title?: string;
    imageUrl?: string;
    caption?: string;
    notes?: string[];
  };

  return `
IMAGE SLIDE CONTENT:
- Title: "${data.title || "Property View"}"
${data.caption ? `- Caption: "${data.caption}"` : ""}

DESIGN REQUIREMENTS:
- Create a slide with a large image placeholder area (16:9 ratio)
- Add a subtle frame/border around the image area
- Include the title at the top
- Leave space for caption at the bottom
- Use a "photo placeholder" style indicator
`;
}

function buildGenericPrompt(content: SlideContent, sectionId: string): string {
  // Extract any text content we can find
  const contentStr = JSON.stringify(content, null, 2).substring(0, 500);

  return `
CONTENT SLIDE:
- Section: "${sectionId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}"
- Content summary: ${contentStr}

DESIGN REQUIREMENTS:
- Create a professional content slide
- Organize information in a clear, visual hierarchy
- Use the accent color for emphasis
- Keep it clean and not cluttered
`;
}

// =============================================================================
// MAIN PROMPT BUILDER
// =============================================================================

function buildSlidePrompt(
  slide: SlideImageRequest["slide"],
  branding: BrandingConfig,
  slideNumber: number,
  totalSlides: number
): string {
  const basePrompt = `You are a professional presentation designer. Create a visually stunning slide image.

IMAGE SPECIFICATIONS:
- Dimensions: 1280 x 720 pixels (16:9 aspect ratio)
- Resolution: High quality, suitable for presentation displays

COLOR SCHEME (STRICT - use these exact colors):
- Background: ${branding.colors.background} (dark navy/charcoal)
- Primary accent: ${branding.colors.secondary} (gold/amber)
- Text color: ${branding.colors.text} (white/light)
- Muted text: ${branding.colors.textMuted} (gray)
- Success indicators: ${branding.colors.success}
- Warning indicators: ${branding.colors.warning}

TYPOGRAPHY:
- Headlines: Bold, modern sans-serif (like Inter, Montserrat)
- Body text: Clean, readable sans-serif
- Numbers/stats: Extra bold, slightly condensed

STYLE GUIDELINES:
- Premium, corporate aesthetic
- Subtle gradients and shadows for depth
- No clip art or cartoonish elements
- Minimal but impactful design
- Professional roofing/construction industry feel

SLIDE POSITION: ${slideNumber} of ${totalSlides}
`;

  // Add type-specific prompt
  let typePrompt: string;
  switch (slide.type) {
    case "title":
      typePrompt = buildTitlePrompt(slide.content);
      break;
    case "stats":
      typePrompt = buildStatsPrompt(slide.content);
      break;
    case "list":
      typePrompt = buildListPrompt(slide.content);
      break;
    case "timeline":
      typePrompt = buildTimelinePrompt(slide.content);
      break;
    case "talking-points":
      typePrompt = buildTalkingPointsPrompt(slide.content);
      break;
    case "chart":
      typePrompt = buildChartPrompt(slide.content);
      break;
    case "image":
      typePrompt = buildImagePrompt(slide.content);
      break;
    default:
      typePrompt = buildGenericPrompt(slide.content, slide.sectionId);
  }

  return basePrompt + "\n" + typePrompt + `

FINAL INSTRUCTIONS:
- Generate ONLY the slide image, no explanatory text
- Ensure all text in the image is readable and properly formatted
- Use the exact colors specified above
- Create a cohesive, professional look that matches corporate presentation standards
`;
}

// =============================================================================
// API ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: SlideImageRequest = await request.json();
    const { slide, branding, slideNumber, totalSlides } = body;

    // Get API key
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google AI API key not configured", code: "API_KEY_MISSING", retryable: false },
        { status: 500 }
      );
    }

    // Build the prompt
    const prompt = buildSlidePrompt(slide, branding, slideNumber, totalSlides);

    console.log(`[Nano Banana Pro] Generating slide ${slideNumber}/${totalSlides}: ${slide.sectionId}`);

    // Set up timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let response: Response;
    try {
      // Call Gemini 3 Pro Image (Nano Banana Pro) API
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[Nano Banana Pro] Request timeout after ${GEMINI_TIMEOUT_MS}ms for slide ${slideNumber}`);
        return NextResponse.json(
          { error: `Image generation timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`, code: "TIMEOUT", retryable: true },
          { status: 504 }
        );
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Nano Banana Pro] API Error:", errorText);
      // 5xx and 429 errors are retryable
      const retryable = response.status >= 500 || response.status === 429;
      return NextResponse.json(
        {
          error: `Gemini API error: ${response.status}`,
          code: "GEMINI_API_ERROR",
          details: errorText.substring(0, 200),
          retryable
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);

    if (!imagePart?.inlineData?.data) {
      console.error("[Nano Banana Pro] No image in response:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: "Gemini returned no image data", code: "NO_IMAGE_GENERATED", retryable: true },
        { status: 500 }
      );
    }

    console.log(`[Nano Banana Pro] Successfully generated slide ${slideNumber}`);

    return NextResponse.json({
      success: true,
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    });

  } catch (error) {
    console.error("[Nano Banana Pro] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", code: "UNKNOWN", retryable: true },
      { status: 500 }
    );
  }
}
