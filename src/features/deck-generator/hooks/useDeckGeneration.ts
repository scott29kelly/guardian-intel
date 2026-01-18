"use client";

import { useState, useCallback } from 'react';
import type {
  DeckTemplate,
  DeckGenerationRequest,
  DeckGenerationProgress,
  GeneratedDeck,
  GeneratedSlide,
} from '../types/deck.types';
import { fetchDataForSlide } from '../utils/dataAggregator';

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

    // Get enabled sections
    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    const totalSteps = enabledSections.length + 2; // +2 for init and finalize

    try {
      // Step 1: Initialize
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Preparing deck generation...',
        progress: 5,
      });

      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      // Step 2: Fetch data and generate slides
      const slides: GeneratedSlide[] = [];

      for (let i = 0; i < enabledSections.length; i++) {
        const section = enabledSections[i];
        
        setProgress({
          status: section.aiEnhanced ? 'ai-enhancement' : 'fetching-data',
          currentStep: i + 2,
          totalSteps,
          currentSlide: section.title,
          message: section.aiEnhanced 
            ? `Generating AI content for ${section.title}...`
            : `Fetching data for ${section.title}...`,
          progress: Math.round(((i + 1) / enabledSections.length) * 80) + 10,
        });

        try {
          // Fetch data for this slide
          const content = await fetchDataForSlide(section.dataSource, request.context);

          if (content) {
            slides.push({
              id: generateId(),
              type: section.type,
              sectionId: section.id,
              content: content as Record<string, unknown>,
              aiGenerated: section.aiEnhanced,
              generatedAt: new Date().toISOString(),
            });
          }
        } catch (slideError) {
          console.error(`Error generating slide ${section.id}:`, slideError);
          // Continue with other slides even if one fails
        }
      }

      // Step 3: Finalize
      updateProgress({
        status: 'rendering',
        currentStep: totalSteps,
        message: 'Finalizing deck...',
        progress: 95,
      });

      const generationTimeMs = Date.now() - startTime;

      const deck: GeneratedDeck = {
        id: generateId(),
        templateId: template.id,
        templateName: template.name,
        generatedAt: new Date().toISOString(),
        generatedBy: 'current-user', // Would be populated from auth context
        context: request.context,
        slides,
        branding: request.options.customBranding 
          ? { ...template.branding, ...request.options.customBranding }
          : template.branding,
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
        message: 'Deck generated successfully!',
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
