/**
 * AI Slide Content Generation API
 *
 * Uses Gemini Flash to generate compelling slide content
 * from customer data and prompts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIRouter } from '@/lib/services/ai/router';
import { initializeAI } from '@/lib/services/ai';

// Ensure AI is initialized
let aiInitialized = false;

async function ensureAIInitialized() {
  if (!aiInitialized) {
    await initializeAI();
    aiInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAIInitialized();

    const { prompt, slideType, customerId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const router = getAIRouter();

    if (!router.hasAdapters()) {
      // Return empty content if no AI is configured - fall back to static content
      console.warn('[AI Generate Slide] No AI adapters configured');
      return NextResponse.json({ content: {} });
    }

    // Build the full prompt with JSON output instructions
    const fullPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.
Start your response with { and end with }`;

    // Use the chat method with the 'summarize' task (uses Gemini)
    const response = await router.chat({
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      task: 'summarize', // Uses Gemini Flash
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse the JSON response
    let content: Record<string, unknown> = {};

    try {
      // Clean the response - remove any markdown code blocks if present
      let jsonStr = response.message.content;

      // Remove markdown code block markers
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Find the JSON object
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
        content = JSON.parse(jsonStr);
      } else {
        console.error('[AI Generate Slide] No JSON found in response:', jsonStr);
      }
    } catch (parseError) {
      console.error('[AI Generate Slide] Failed to parse JSON:', parseError);
      console.error('[AI Generate Slide] Raw response:', response.message.content);
    }

    return NextResponse.json({
      content,
      slideType,
      customerId,
      model: response.model,
      usage: response.usage,
    });

  } catch (error) {
    console.error('[AI Generate Slide] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate slide content', content: {} },
      { status: 500 }
    );
  }
}
