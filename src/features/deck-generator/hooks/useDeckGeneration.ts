"use client";

import { useState, useCallback } from 'react';
import type {
  DeckTemplate,
  DeckGenerationRequest,
  DeckGenerationProgress,
  GeneratedDeck,
  GeneratedSlide,
  SlideSection,
} from '../types/deck.types';
import { fetchDataForSlide } from '../utils/dataAggregator';
import {
  generateAISlideContent,
  generateAllSlidesWithNotebookLM,
  clearNotebookLMCache,
  fetchCustomerContext,
  type SlideGenerationContext,
} from '../services/aiSlideGenerator';
import { generateSlideImage } from '../services/slideImageGenerator';

// Simple UUID generator (no external dependency needed)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface UseDeckGenerationReturn {
  isGenerating: boolean;
  progress: DeckGenerationProgress | null;
  generatedDeck: GeneratedDeck | null;
  error: string | null;
  generateDeck: (template: DeckTemplate, request: DeckGenerationRequest) => Promise<GeneratedDeck | null>;
  resetGeneration: () => void;
}

// Sections that should use AI generation
const AI_ENHANCED_SECTIONS = [
  'customer-overview',
  'talking-points',
  'objection-handling',
  'storm-exposure',
  'recommended-actions',
];

// =============================================================================
// NOTEBOOKLM DECK GENERATION
// =============================================================================

interface NotebookLMSlide {
  pageNumber: number;
  imageData: string;
  mimeType: string;
}

interface NotebookLMDeckResponse {
  success: boolean;
  format: "images" | "pdf";
  slideCount: number;
  slides: NotebookLMSlide[];
  pdfData?: string;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Build NotebookLM instructions from a template and its enabled sections.
 */
function buildTemplateInstructions(
  template: DeckTemplate,
  enabledSections: SlideSection[]
): string {
  const sectionDescriptions = enabledSections
    .map((s, i) => `${i + 1}. ${s.title}${s.description ? ` — ${s.description}` : ""}`)
    .join("\n");

  return `Create a professional ${template.name} presentation for Guardian Roofing.

This deck is for ${template.audience === "customer" ? "a customer" : `the ${template.audience} team`}.

Include the following sections:
${sectionDescriptions}

Style requirements:
- Use a dark navy (#1E3A5F) and gold (#D4A656) color scheme
- Professional, corporate aesthetic suitable for the roofing industry
- Include data visualizations where relevant
- Make it visually impactful and easy to scan quickly`;
}

/**
 * Generate a deck via the NotebookLM pipeline.
 */
async function generateDeckViaNotebookLM(
  template: DeckTemplate,
  request: DeckGenerationRequest,
  customerContext: SlideGenerationContext | null,
  enabledSections: SlideSection[],
  onProgress: (update: Partial<DeckGenerationProgress>) => void
): Promise<{ slides: GeneratedSlide[] } | null> {
  if (!customerContext) {
    console.warn("[NotebookLM] No customer context — cannot generate deck");
    return null;
  }

  const c = customerContext.customer;
  const templateInstructions = buildTemplateInstructions(template, enabledSections);

  onProgress({
    status: "generating-slides",
    message: "NotebookLM: Creating research notebook...",
    progress: 15,
  });

  try {
    const response = await fetch("/api/ai/generate-deck-notebooklm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: `${c.firstName} ${c.lastName}`,
        customerData: {
          firstName: c.firstName,
          lastName: c.lastName,
          address: c.address,
          city: c.city,
          state: c.state,
          zipCode: c.zipCode,
          propertyType: c.propertyType,
          yearBuilt: c.yearBuilt,
          squareFootage: c.squareFootage,
          roofType: c.roofType,
          roofAge: c.roofAge,
          propertyValue: c.propertyValue,
          insuranceCarrier: c.insuranceCarrier,
          policyType: c.policyType,
          deductible: c.deductible,
          leadScore: c.leadScore,
          urgencyScore: c.urgencyScore,
          stage: c.stage,
          status: c.status,
          leadSource: c.leadSource,
        },
        weatherEvents: customerContext.weatherEvents,
        templateInstructions,
        audience: template.audience === "customer" ? "customer-facing" : "internal",
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const isRedirect = response.redirected || responseText.includes("login") || responseText.includes("<!DOCTYPE");
      console.error(`[NotebookLM] API error: status=${response.status}, redirected=${response.redirected}, isHTML=${isRedirect}`);
      if (!isRedirect) {
        try { console.error("[NotebookLM] Error body:", JSON.parse(responseText)); } catch { console.error("[NotebookLM] Raw response:", responseText.substring(0, 200)); }
      }
      return null;
    }

    const data: NotebookLMDeckResponse = await response.json();

    if (!data.success) {
      console.error("[NotebookLM] Generation failed:", data.error);
      return null;
    }

    onProgress({
      message: `NotebookLM: Processing ${data.slideCount} slides...`,
      progress: 75,
    });

    // Map NotebookLM slides to GeneratedSlide format
    const slides: GeneratedSlide[] = data.slides.map((nlmSlide, index) => {
      // Map page numbers to section IDs where possible
      const section = enabledSections[index] || enabledSections[enabledSections.length - 1];

      return {
        id: generateId(),
        type: section?.type || "image",
        sectionId: section?.id || `nlm-slide-${nlmSlide.pageNumber}`,
        content: {
          title: section?.title || `Slide ${nlmSlide.pageNumber}`,
          nlmGenerated: true,
        },
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
        imageData: nlmSlide.imageData,
      };
    });

    return { slides };
  } catch (error) {
    console.error("[NotebookLM] Fetch error:", error);
    return null;
  }
}

// =============================================================================
// LEGACY GEMINI PIPELINE (FALLBACK)
// =============================================================================

async function generateDeckViaGemini(
  template: DeckTemplate,
  request: DeckGenerationRequest,
  customerContext: SlideGenerationContext | null,
  enabledSections: SlideSection[],
  onProgress: (update: Partial<DeckGenerationProgress>) => void,
  totalSteps: number
): Promise<GeneratedSlide[]> {
  const slides: GeneratedSlide[] = [];

  for (let i = 0; i < enabledSections.length; i++) {
    const section = enabledSections[i];
    const isAISection = AI_ENHANCED_SECTIONS.includes(section.id);

    onProgress({
      status: isAISection ? 'ai-enhancement' : 'fetching-data',
      currentStep: i + 2,
      totalSteps,
      currentSlide: section.title,
      message: isAISection
        ? `AI generating ${section.title}...`
        : `Fetching ${section.title}...`,
      progress: Math.round(((i + 1) / enabledSections.length) * 40) + 5,
    });

    try {
      let content: Record<string, unknown> | null = null;

      if (isAISection && customerContext) {
        const aiContent = await generateAISlideContent({
          ...customerContext,
          slideType: section.type,
          sectionId: section.id,
          sectionTitle: section.title,
        });

        if (aiContent && Object.keys(aiContent).length > 0) {
          content = mapAIContent(section, aiContent);
        }
      }

      if (!content && request.context.customerId && section.dataSource) {
        content = await fetchDataForSlide(section.dataSource, request.context) as Record<string, unknown> | null;
      }

      if (content) {
        slides.push({
          id: generateId(),
          type: section.type,
          sectionId: section.id,
          content,
          aiGenerated: isAISection,
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (slideError) {
      console.error(`Error generating slide ${section.id}:`, slideError);
    }
  }

  // Generate images for each slide
  const branding = request.options.customBranding
    ? { ...template.branding, ...request.options.customBranding }
    : template.branding;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideName = slide.sectionId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    onProgress({
      status: 'generating-slides',
      currentStep: enabledSections.length + i + 2,
      totalSteps,
      currentSlide: slide.sectionId,
      message: `Creating visual for ${slideName}...`,
      progress: Math.round(((i + 1) / slides.length) * 45) + 45,
    });

    try {
      const imageData = await generateSlideImage(
        {
          slide: {
            type: slide.type,
            sectionId: slide.sectionId,
            content: slide.content,
          },
          branding,
          slideNumber: i + 1,
          totalSlides: slides.length,
        },
        {
          onRetry: (attempt) => {
            onProgress({
              message: `Retrying ${slideName} (attempt ${attempt + 1}/4)...`,
            });
          },
        }
      );
      slides[i] = { ...slide, imageData };
    } catch (imageError) {
      const errorMessage = imageError instanceof Error
        ? imageError.message
        : 'Image generation failed after multiple attempts';
      console.error(`[DeckGeneration] Image generation failed for ${slide.sectionId}:`, errorMessage);
      slides[i] = { ...slide, imageError: errorMessage };
      onProgress({ message: `Using fallback for ${slideName}` });
    }
  }

  return slides;
}

/**
 * Map AI-generated content to the expected slide structure.
 */
function mapAIContent(
  section: SlideSection,
  aiContent: Record<string, unknown>
): Record<string, unknown> {
  if (section.type === 'stats' && aiContent.stats) {
    return {
      title: aiContent.title || section.title,
      stats: (aiContent.stats as Array<{
        label: string;
        value: string | number;
        insight?: string;
        icon?: string;
      }>).map(stat => ({
        label: stat.label,
        value: stat.value,
        trend: 'neutral' as const,
        icon: stat.icon || 'Target',
      })),
      footnote: (aiContent as { bottomLine?: string }).bottomLine ||
        `AI-generated insights as of ${new Date().toLocaleDateString()}`,
    };
  }

  if (section.type === 'talking-points' && aiContent.points) {
    return {
      title: aiContent.title || section.title,
      aiGenerated: true,
      points: (aiContent.points as Array<{
        topic: string;
        script: string;
        priority?: string;
      }>).map(point => ({
        topic: point.topic,
        script: point.script,
        priority: (point.priority || 'medium') as 'high' | 'medium' | 'low',
      })),
    };
  }

  if (section.type === 'list' && aiContent.items) {
    const items = aiContent.items as Array<{
      objection?: string;
      response?: string;
      action?: string;
      timing?: string;
      script?: string;
      primary?: string;
      secondary?: string;
      icon?: string;
      priority?: string;
    }>;
    return {
      title: aiContent.title || section.title,
      items: items.map(item => ({
        primary: item.objection || item.action || item.primary || '',
        secondary: item.response || item.script || item.timing || item.secondary || '',
        icon: item.icon || 'CheckCircle',
        highlight: item.priority === 'high',
      })),
      numbered: section.id === 'recommended-actions',
    };
  }

  if (section.type === 'timeline' && aiContent.events) {
    return {
      title: aiContent.title || section.title,
      events: (aiContent.events as Array<{
        date: string;
        title: string;
        description?: string;
        status?: string;
        opportunity?: string;
      }>).map(event => ({
        date: event.date,
        title: event.title,
        description: event.description || event.opportunity || undefined,
        status: (event.status || 'upcoming') as 'completed' | 'current' | 'upcoming',
      })),
    };
  }

  return aiContent;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useDeckGeneration(): UseDeckGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DeckGenerationProgress | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback((update: Partial<DeckGenerationProgress>) => {
    setProgress(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const generateDeck = useCallback(async (
    template: DeckTemplate,
    request: DeckGenerationRequest
  ): Promise<GeneratedDeck | null> => {
    const startTime = Date.now();
    setIsGenerating(true);
    setError(null);
    setGeneratedDeck(null);

    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    const totalSteps = enabledSections.length * 2 + 2;

    try {
      // Step 1: Initialize and fetch customer context
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Loading customer intelligence...',
        progress: 5,
      });

      let customerContext: SlideGenerationContext | null = null;
      if (request.context.customerId) {
        const contextData = await fetchCustomerContext(request.context.customerId);
        if (contextData) {
          customerContext = {
            customer: contextData.customer,
            weatherEvents: contextData.weatherEvents,
            slideType: 'title',
            sectionId: '',
            sectionTitle: '',
          };

          // Pre-generate all slide content via NotebookLM (deep research)
          // Falls back to per-section Gemini Flash if unavailable
          clearNotebookLMCache();
          updateProgress({
            status: 'ai-enhancement',
            message: 'NotebookLM deep research in progress...',
            progress: 8,
          });

          const notebookLMSuccess = await generateAllSlidesWithNotebookLM(
            customerContext,
            {
              weatherEvents: contextData.weatherEvents,
              onProgress: (stage, detail) => {
                updateProgress({
                  message: detail || `NotebookLM: ${stage}...`,
                  progress: stage === 'notebooklm-complete' ? 15 : 10,
                });
              },
            }
          );

          if (notebookLMSuccess) {
            updateProgress({
              message: 'NotebookLM research complete — generating slides...',
              progress: 18,
            });
          }
        }
      }

      // Step 2: Try NotebookLM pipeline first
      let slides: GeneratedSlide[] = [];
      let usedNotebookLM = false;

      setProgress({
        status: 'generating-slides',
        currentStep: 2,
        totalSteps,
        message: 'NotebookLM: Generating research-backed deck...',
        progress: 10,
      });

      const nlmResult = await generateDeckViaNotebookLM(
        template,
        request,
        customerContext,
        enabledSections,
        updateProgress
      );

      if (nlmResult && nlmResult.slides.length > 0) {
        slides = nlmResult.slides;
        usedNotebookLM = true;
        console.log(`[DeckGeneration] NotebookLM generated ${slides.length} slides`);
      } else {
        // Fallback to Gemini pipeline
        console.log("[DeckGeneration] NotebookLM unavailable, falling back to Gemini pipeline");
        updateProgress({
          message: "Falling back to Gemini pipeline...",
          progress: 10,
        });
        slides = await generateDeckViaGemini(
          template,
          request,
          customerContext,
          enabledSections,
          updateProgress,
          totalSteps
        );
      }

      // Step 3: Finalize
      updateProgress({
        status: 'rendering',
        currentStep: totalSteps,
        message: 'Finalizing presentation...',
        progress: 95,
      });

      const generationTimeMs = Date.now() - startTime;
      const imageSlidesCount = slides.filter(s => s.imageData).length;
      const pipeline = usedNotebookLM ? "NotebookLM" : "Gemini";

      const deck: GeneratedDeck = {
        id: generateId(),
        templateId: template.id,
        templateName: template.name,
        generatedAt: new Date().toISOString(),
        generatedBy: 'current-user',
        context: request.context,
        slides,
        branding: request.options.customBranding
          ? { ...template.branding, ...request.options.customBranding }
          : template.branding,
        metadata: {
          totalSlides: slides.length,
          aiSlidesCount: slides.filter(s => s.aiGenerated).length,
          generationTimeMs,
          version: '2.0.0',
        },
      };

      setGeneratedDeck(deck);
      setProgress({
        status: 'complete',
        currentStep: totalSteps,
        totalSteps,
        message: `Generated ${slides.length} slides via Gemini with ${imageSlidesCount} visuals (${(generationTimeMs / 1000).toFixed(1)}s)`,
        progress: 100,
      });

      return deck;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate deck';
      setError(errorMessage);
      setProgress({
        status: 'error',
        currentStep: 0,
        totalSteps,
        message: errorMessage,
        progress: 0,
      });
      return null;

    } finally {
      setIsGenerating(false);
    }
  }, [updateProgress]);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setGeneratedDeck(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    generatedDeck,
    error,
    generateDeck,
    resetGeneration,
  };
}
