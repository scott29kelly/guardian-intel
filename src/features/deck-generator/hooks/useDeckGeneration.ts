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
  asyncJobId: string | null;
  generateDeck: (template: DeckTemplate, request: DeckGenerationRequest) => Promise<GeneratedDeck | null>;
  setDeckFromResult: (resultPayload: string, deckId: string) => void;
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
// NOTEBOOKLM ASYNC DECK GENERATION
// =============================================================================

// Sentinel value indicating an async job was kicked off
const ASYNC_JOB_MARKER = "__ASYNC_JOB__";

interface ScheduleResponse {
  success: boolean;
  job?: { id: string };
  error?: string;
}

interface ProcessNowResponse {
  success: boolean;
  deckId?: string;
  error?: string;
}

/**
 * Schedule a deck via the async pipeline:
 * 1. POST /api/decks/schedule — creates a ScheduledDeck (status=pending)
 * 2. POST /api/decks/process-now — triggers immediate background processing
 *
 * Returns the job ID so the UI can poll via useDeckStatus.
 */
async function scheduleNotebookLMDeck(
  customerId: string,
  templateId: string,
  templateName: string,
  onProgress: (update: Partial<DeckGenerationProgress>) => void
): Promise<{ asyncJobId: string } | null> {
  onProgress({
    status: "generating-slides",
    message: "Scheduling NotebookLM generation...",
    progress: 10,
  });

  try {
    // Step 1: Schedule the deck
    const scheduleResponse = await fetch("/api/decks/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, templateId, templateName }),
    });

    if (!scheduleResponse.ok) {
      const err = await scheduleResponse.json().catch(() => ({}));

      // 409 = existing pending/processing job — join that poll instead of falling back
      if (scheduleResponse.status === 409 && err.existingJobId) {
        console.log(`[NotebookLM] Existing job found: ${err.existingJobId} (status: ${err.status})`);
        return { asyncJobId: err.existingJobId };
      }

      console.error(`[NotebookLM] Schedule failed (${scheduleResponse.status}):`, err);
      return null;
    }

    const scheduleData: ScheduleResponse = await scheduleResponse.json();
    if (!scheduleData.success || !scheduleData.job?.id) {
      console.error("[NotebookLM] Schedule returned no job:", scheduleData);
      return null;
    }

    const jobId = scheduleData.job.id;

    onProgress({
      message: "Starting NotebookLM processing...",
      progress: 15,
    });

    // Step 2: Trigger immediate processing
    const processResponse = await fetch("/api/decks/process-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId: jobId }),
    });

    if (!processResponse.ok) {
      const err = await processResponse.json().catch(() => ({}));
      console.warn("[NotebookLM] Process-now failed (cron will pick it up):", err);
      // Don't return null — the job is still scheduled, cron will process it
    }

    console.log(`[NotebookLM] Async job started: ${jobId}`);
    return { asyncJobId: jobId };
  } catch (error) {
    console.error("[NotebookLM] Schedule error:", error);
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
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);

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
    setAsyncJobId(null);

    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    const totalSteps = enabledSections.length * 2 + 2;

    try {
      // Step 1: Initialize
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Loading customer intelligence...',
        progress: 5,
      });

      // Step 2: Try async NotebookLM pipeline first
      if (request.context.customerId) {
        const nlmResult = await scheduleNotebookLMDeck(
          request.context.customerId,
          template.id,
          template.name,
          updateProgress
        );

        if (nlmResult?.asyncJobId) {
          // Async job started — store job ID and return early.
          // The UI should use useDeckStatus (from src/lib/hooks/use-deck-generation.ts)
          // to poll for completion. That hook auto-polls every 10s while pending/processing.
          setAsyncJobId(nlmResult.asyncJobId);
          setIsGenerating(false);
          setProgress({
            status: 'generating-slides',
            currentStep: 2,
            totalSteps,
            message: 'NotebookLM is generating your deck in the background. You can navigate away — we\'ll notify you when it\'s ready.',
            progress: 20,
          });

          console.log(`[DeckGeneration] Async NotebookLM job started: ${nlmResult.asyncJobId}`);
          return null; // No synchronous deck — poll via useDeckStatus
        }
      }

      // Fallback to Gemini pipeline if NotebookLM scheduling failed
      console.log("[DeckGeneration] NotebookLM scheduling failed, falling back to Gemini pipeline");

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

      updateProgress({
        message: "Falling back to Gemini pipeline...",
        progress: 10,
      });

      const slides = await generateDeckViaGemini(
        template,
        request,
        customerContext,
        enabledSections,
        updateProgress,
        totalSteps
      );

      // Step 3: Finalize
      updateProgress({
        status: 'rendering',
        currentStep: totalSteps,
        message: 'Finalizing presentation...',
        progress: 95,
      });

      const generationTimeMs = Date.now() - startTime;
      const imageSlidesCount = slides.filter(s => s.imageData).length;

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

  /**
   * Parse an async result payload (from ScheduledDeck) into a GeneratedDeck for preview.
   */
  const setDeckFromResult = useCallback((resultPayload: string, deckId: string) => {
    try {
      const result = JSON.parse(resultPayload);
      const deck: GeneratedDeck = {
        id: result.id || deckId,
        templateId: result.templateId || "",
        templateName: result.templateName || "NotebookLM Deck",
        generatedAt: result.generatedAt || new Date().toISOString(),
        generatedBy: "current-user",
        context: result.context || {},
        slides: (result.slides || []).map((s: { id: string; pageNumber?: number; imageData?: string; generatedAt?: string }) => ({
          id: s.id || generateId(),
          type: "image" as const,
          sectionId: s.id || `slide-${s.pageNumber}`,
          content: { title: `Slide ${s.pageNumber || 1}`, nlmGenerated: true },
          aiGenerated: true,
          generatedAt: s.generatedAt || new Date().toISOString(),
          imageData: s.imageData,
        })),
        branding: {
          colors: {
            primary: "#1E3A5F",
            secondary: "#D4A656",
            accent: "#4A90A4",
            background: "#1E3A5F",
            backgroundAlt: "#162D4A",
            text: "#F9FAFB",
            textMuted: "#9CA3AF",
            success: "#10B981",
            warning: "#F59E0B",
            danger: "#EF4444",
          },
          fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
          logo: "/logo.png",
          footer: "Guardian Roofing",
          borderRadius: "8px",
        },
        metadata: {
          totalSlides: result.metadata?.totalSlides || result.slides?.length || 0,
          aiSlidesCount: result.slides?.length || 0,
          generationTimeMs: result.metadata?.generationTimeMs || 0,
          version: "2.0.0",
        },
      };
      setGeneratedDeck(deck);
      setAsyncJobId(null);
      setProgress({
        status: "complete",
        currentStep: 1,
        totalSteps: 1,
        message: `Generated ${deck.slides.length} slides via NotebookLM`,
        progress: 100,
      });
    } catch (err) {
      console.error("[DeckGeneration] Failed to parse result payload:", err);
      setError("Failed to load completed deck");
    }
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setGeneratedDeck(null);
    setError(null);
    setAsyncJobId(null);
  }, []);

  return {
    isGenerating,
    progress,
    generatedDeck,
    error,
    asyncJobId,
    generateDeck,
    setDeckFromResult,
    resetGeneration,
  };
}
