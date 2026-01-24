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

export function useDeckGeneration(): UseDeckGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DeckGenerationProgress | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback((update: Partial<DeckGenerationProgress>) => {
    setProgress(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const generateSlideContent = useCallback(async (
    section: SlideSection,
    context: DeckGenerationRequest['context'],
    customerContext: SlideGenerationContext | null
  ): Promise<Record<string, unknown> | null> => {
    const customerId = context.customerId;

    // Check if this section should use AI generation
    const shouldUseAI = AI_ENHANCED_SECTIONS.includes(section.id) && customerContext;

    if (shouldUseAI && customerContext) {
      // Try AI generation first
      const aiContent = await generateAISlideContent({
        ...customerContext,
        slideType: section.type,
        sectionId: section.id,
        sectionTitle: section.title,
      });

      // If AI returned content, merge it with any required base data
      if (aiContent && Object.keys(aiContent).length > 0) {
        // For stats slides, ensure the structure matches what the renderer expects
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
              trend: 'neutral' as const, // Could derive from insight
              icon: stat.icon || 'Target',
            })),
            footnote: (aiContent as { bottomLine?: string }).bottomLine ||
              `AI-generated insights as of ${new Date().toLocaleDateString()}`,
          };
        }

        // For talking points, ensure structure
        if (section.type === 'talking-points' && aiContent.points) {
          return {
            title: aiContent.title || section.title,
            aiGenerated: true,
            points: (aiContent.points as Array<{
              topic: string;
              script: string;
              priority?: string;
              timing?: string;
            }>).map(point => ({
              topic: point.topic,
              script: point.script,
              priority: (point.priority || 'medium') as 'high' | 'medium' | 'low',
            })),
          };
        }

        // For list slides (objections, next steps)
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

        // For timeline slides (storm history)
        if (section.type === 'timeline' && aiContent.events) {
          return {
            title: aiContent.title || section.title,
            events: (aiContent.events as Array<{
              date: string;
              title: string;
              description?: string;
              status?: string;
              damageRisk?: string;
              opportunity?: string;
            }>).map(event => ({
              date: event.date,
              title: event.title,
              description: event.description || event.opportunity || undefined,
              status: (event.status || 'upcoming') as 'completed' | 'current' | 'upcoming',
            })),
          };
        }

        // Return AI content as-is for other types
        return aiContent;
      }
    }

    // Fall back to standard data fetching
    if (customerId && section.dataSource) {
      const result = await fetchDataForSlide(section.dataSource, context);
      return result as Record<string, unknown> | null;
    }

    return null;
  }, []);

  const generateDeck = useCallback(async (
    template: DeckTemplate,
    request: DeckGenerationRequest
  ): Promise<GeneratedDeck | null> => {
    const startTime = Date.now();
    setIsGenerating(true);
    setError(null);
    setGeneratedDeck(null);

    // Get enabled sections
    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    // +2 for init and finalize, +enabledSections.length for image generation
    const totalSteps = enabledSections.length * 2 + 2;

    try {
      // Step 1: Initialize and fetch customer context for AI
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Loading customer intelligence...',
        progress: 5,
      });

      // Fetch customer context for AI generation
      let customerContext: SlideGenerationContext | null = null;
      if (request.context.customerId) {
        const contextData = await fetchCustomerContext(request.context.customerId);
        if (contextData) {
          customerContext = {
            customer: contextData.customer,
            weatherEvents: contextData.weatherEvents,
            slideType: 'title', // Will be updated per slide
            sectionId: '',
            sectionTitle: '',
          };
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for UX

      // Step 2: Generate content for each slide
      const slides: GeneratedSlide[] = [];

      for (let i = 0; i < enabledSections.length; i++) {
        const section = enabledSections[i];
        const isAISection = AI_ENHANCED_SECTIONS.includes(section.id);

        setProgress({
          status: isAISection ? 'ai-enhancement' : 'fetching-data',
          currentStep: i + 2,
          totalSteps,
          currentSlide: section.title,
          message: isAISection
            ? `🤖 AI generating ${section.title}...`
            : `Fetching ${section.title}...`,
          progress: Math.round(((i + 1) / enabledSections.length) * 40) + 5,
        });

        try {
          const content = await generateSlideContent(section, request.context, customerContext);

          if (content) {
            slides.push({
              id: generateId(),
              type: section.type,
              sectionId: section.id,
              content: content as Record<string, unknown>,
              aiGenerated: isAISection,
              generatedAt: new Date().toISOString(),
            });
          }
        } catch (slideError) {
          console.error(`Error generating slide ${section.id}:`, slideError);
          // Continue with other slides even if one fails
        }
      }

      // Step 3: Generate images for each slide using Nano Banana Pro
      const branding = request.options.customBranding
        ? { ...template.branding, ...request.options.customBranding }
        : template.branding;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        setProgress({
          status: 'generating-slides',
          currentStep: enabledSections.length + i + 2,
          totalSteps,
          currentSlide: slide.sectionId,
          message: `🎨 Creating visual for ${slide.sectionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}...`,
          progress: Math.round(((i + 1) / slides.length) * 45) + 45,
        });

        const slideName = slide.sectionId
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

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
              // Retry callback for progress updates
              onRetry: (attempt, error, delay) => {
                setProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        message: `🔄 Retrying ${slideName} (attempt ${attempt + 1}/4)...`,
                      }
                    : null
                );
              },
            }
          );

          // Update slide with image data
          slides[i] = {
            ...slide,
            imageData,
          };
        } catch (imageError) {
          // After all retries exhausted, fall back to HTML rendering
          const errorMessage =
            imageError instanceof Error
              ? imageError.message
              : 'Image generation failed after multiple attempts';

          console.error(`[DeckGeneration] Image generation failed for ${slide.sectionId}:`, errorMessage);

          // Store detailed error for debugging
          slides[i] = {
            ...slide,
            imageError: errorMessage,
          };

          // Update progress to show fallback mode
          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  message: `⚠️ Using fallback for ${slideName}`,
                }
              : null
          );
        }
      }

      // Step 4: Finalize
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
        generatedBy: 'current-user', // Would be populated from auth context
        context: request.context,
        slides,
        branding,
        metadata: {
          totalSlides: slides.length,
          aiSlidesCount: slides.filter(s => s.aiGenerated).length,
          generationTimeMs,
          version: '1.0.0',
        },
      };

      setGeneratedDeck(deck);
      setProgress({
        status: 'complete',
        currentStep: totalSteps,
        totalSteps,
        message: `✨ Generated ${slides.length} slides with ${imageSlidesCount} Nano Banana Pro visuals!`,
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
  }, [updateProgress, generateSlideContent]);

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
