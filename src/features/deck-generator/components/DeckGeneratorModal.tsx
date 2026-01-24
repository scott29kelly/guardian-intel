"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  Share2,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import type { DeckTemplate, DeckGenerationRequest, ExportFormat } from '../types/deck.types';
import { useDeckGeneration } from '../hooks/useDeckGeneration';
import { useDeckTemplates } from '../hooks/useDeckTemplates';
import { DeckTemplateSelector } from './DeckTemplateSelector';
import { DeckCustomizer } from './DeckCustomizer';
import { DeckPreview, type DeckPreviewRef } from './DeckPreview';
import { exportDeckAsZip, exportDeckWithImages, type ExportProgress } from '../utils/zipExport';

interface DeckGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Pre-selected context (e.g., when opening from a customer card)
  initialContext?: {
    customerId?: string;
    customerName?: string;
    projectId?: string;
    regionId?: string;
  };
  // Pre-selected template
  initialTemplateId?: string;
}

type Step = 'select-template' | 'customize' | 'generating' | 'preview';

export function DeckGeneratorModal({
  isOpen,
  onClose,
  initialContext,
  initialTemplateId,
}: DeckGeneratorModalProps) {
  const { templates, getTemplate } = useDeckTemplates();
  const { 
    isGenerating, 
    progress, 
    generatedDeck, 
    error, 
    generateDeck,
    resetGeneration 
  } = useDeckGeneration();

  // State
  const [step, setStep] = useState<Step>(initialTemplateId ? 'customize' : 'select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate | null>(
    initialTemplateId ? getTemplate(initialTemplateId) || null : null
  );
  const [context, setContext] = useState<DeckGenerationRequest['context']>(
    initialContext || {}
  );
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  // Scheduling state (overnight batch processing)
  const [isScheduling, setIsScheduling] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  // Ref for slide export
  const deckPreviewRef = useRef<DeckPreviewRef>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Track if modal has been initialized to prevent re-running reset effect while open
  const hasInitialized = useRef(false);

  // Reset state when modal OPENS (not while already open)
  // This prevents re-renders from resetting state during async generation
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      // Only initialize once per modal open
      hasInitialized.current = true;
      setStep(initialTemplateId ? 'customize' : 'select-template');
      setSelectedTemplate(initialTemplateId ? getTemplate(initialTemplateId) || null : null);
      setContext(initialContext || {});

      // Initialize enabled sections from template
      if (initialTemplateId) {
        const template = getTemplate(initialTemplateId);
        if (template) {
          setEnabledSections(
            template.sections
              .filter(s => s.defaultEnabled !== false)
              .map(s => s.id)
          );
        }
      }
    }

    // Reset the flag when modal closes so next open will reinitialize
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, initialTemplateId, initialContext, getTemplate]);

  // Initialize enabled sections when template changes
  const handleTemplateSelect = useCallback((template: DeckTemplate) => {
    setSelectedTemplate(template);
    setEnabledSections(
      template.sections
        .filter(s => s.defaultEnabled !== false)
        .map(s => s.id)
    );
    setStep('customize');
  }, []);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;

    setStep('generating');

    const request: DeckGenerationRequest = {
      templateId: selectedTemplate.id,
      context,
      options: {
        enabledSections,
        includeAiContent: true,
        exportFormat,
      },
    };

    const deck = await generateDeck(selectedTemplate, request);
    
    if (deck) {
      setStep('preview');
    }
  }, [selectedTemplate, context, enabledSections, exportFormat, generateDeck]);

  // Handle scheduling for overnight batch processing
  const handleSchedule = useCallback(async () => {
    if (!selectedTemplate || !context.customerId) return;

    setIsScheduling(true);
    setScheduleSuccess(null);

    try {
      const response = await fetch('/api/decks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: context.customerId,
          customerName: context.customerName || 'Customer',
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          options: {
            enabledSections,
            includeAiContent: true,
            exportFormat,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScheduleSuccess(data.message);
        setShowScheduleConfirm(false);
      } else {
        throw new Error(data.error || 'Failed to schedule deck');
      }
    } catch (error) {
      console.error('Schedule failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to schedule deck');
    } finally {
      setIsScheduling(false);
    }
  }, [selectedTemplate, context, enabledSections, exportFormat]);

  // Handle close
  const handleClose = useCallback(() => {
    resetGeneration();
    setStep(initialTemplateId ? 'customize' : 'select-template');
    setSelectedTemplate(initialTemplateId ? getTemplate(initialTemplateId) || null : null);
    onClose();
  }, [initialTemplateId, getTemplate, resetGeneration, onClose]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (step === 'customize') {
      setStep('select-template');
      setSelectedTemplate(null);
    } else if (step === 'preview') {
      setStep('customize');
      resetGeneration();
    }
  }, [step, resetGeneration]);

  // Handle share - copy link to clipboard
  const handleShare = useCallback(() => {
    if (!generatedDeck) return;
    const shareUrl = `${window.location.origin}/decks/${generatedDeck.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  }, [generatedDeck]);

  // Handle download - export as ZIP with PNG slides
  // Uses pre-generated Nano Banana Pro images when available
  const handleDownload = useCallback(async () => {
    if (!generatedDeck) return;

    setIsExporting(true);
    setExportProgress(null);

    try {
      // Check if all slides have pre-generated images
      const allSlidesHaveImages = generatedDeck.slides.every(s => s.imageData);

      if (allSlidesHaveImages) {
        // Fast path: Use pre-generated Nano Banana Pro images directly
        await exportDeckWithImages(generatedDeck, undefined, (progress) => {
          setExportProgress(progress);
        });
      } else if (deckPreviewRef.current) {
        // Some slides need capturing - capture fallback slides first
        const slideBlobs = await deckPreviewRef.current.captureAllSlides((progress) => {
          setExportProgress({
            ...progress,
            status: `Capturing fallback for ${progress.status}`
          });
        });

        // Use hybrid export - pre-generated images + captured fallbacks
        await exportDeckWithImages(generatedDeck, slideBlobs, (progress) => {
          setExportProgress(progress);
        });
      } else {
        throw new Error('No preview ref available for fallback capture');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export deck. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [generatedDeck]);

  // Check if generation can proceed
  const canGenerate = useCallback(() => {
    if (!selectedTemplate || enabledSections.length === 0) return false;
    
    // Check required context
    const requiredContextTypes = selectedTemplate.requiredContext
      .filter(ctx => ctx.required)
      .map(ctx => ctx.type);
    
    for (const ctxType of requiredContextTypes) {
      const ctxKey = `${ctxType}Id`;
      if (!context[ctxKey as keyof typeof context]) {
        return false;
      }
    }
    
    return true;
  }, [selectedTemplate, enabledSections, context]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-surface-primary rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary">
            <div className="flex items-center gap-3">
              {step !== 'select-template' && step !== 'generating' && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-muted" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-text-primary">
                {step === 'select-template' && 'Generate Slide Deck'}
                {step === 'customize' && selectedTemplate?.name}
                {step === 'generating' && 'Generating Deck...'}
                {step === 'preview' && 'Deck Preview'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Step 1: Template Selection */}
            {step === 'select-template' && (
              <DeckTemplateSelector
                templates={templates}
                onSelect={handleTemplateSelect}
              />
            )}

            {/* Step 2: Customization */}
            {step === 'customize' && selectedTemplate && (
              <DeckCustomizer
                template={selectedTemplate}
                context={context}
                onContextChange={setContext}
                enabledSections={enabledSections}
                onSectionsChange={setEnabledSections}
                exportFormat={exportFormat}
                onExportFormatChange={setExportFormat}
              />
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && progress && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="relative mb-6">
                  <Loader2 className="w-16 h-16 text-intel-400 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {progress.message}
                </h3>
                {progress.currentSlide && (
                  <p className="text-text-muted mb-4">
                    Processing: {progress.currentSlide}
                  </p>
                )}
                {/* Progress bar */}
                <div className="w-full max-w-md h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-text-muted mt-2">
                  Step {progress.currentStep} of {progress.totalSteps}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <AlertCircle className="w-16 h-16 text-damage-500 mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Generation Failed
                </h3>
                <p className="text-text-muted mb-6 text-center max-w-md">
                  {error}
                </p>
                <button
                  onClick={() => setStep('customize')}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors border border-border"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && generatedDeck && (
              <DeckPreview ref={deckPreviewRef} deck={generatedDeck} />
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-surface-secondary">
            <div className="text-sm text-text-muted">
              {step === 'customize' && selectedTemplate && (
                <>
                  ~{enabledSections.length} slides • Est. {selectedTemplate.estimatedGenerationTime}s
                </>
              )}
              {step === 'preview' && generatedDeck && (
                <>
                  {generatedDeck.metadata.totalSlides} slides •
                  Generated in {(generatedDeck.metadata.generationTimeMs / 1000).toFixed(1)}s
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'customize' && (
                <>
                  {/* Schedule Success Message */}
                  {scheduleSuccess && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      <span>Scheduled!</span>
                    </div>
                  )}

                  {/* Schedule Confirmation */}
                  {showScheduleConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-muted">Ready by 6 AM tomorrow</span>
                      <button
                        onClick={() => setShowScheduleConfirm(false)}
                        className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSchedule}
                        disabled={isScheduling}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isScheduling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Schedule Button */}
                      <button
                        onClick={() => setShowScheduleConfirm(true)}
                        disabled={!canGenerate() || isGenerating || !!scheduleSuccess}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Schedule for overnight processing"
                      >
                        <Clock className="w-4 h-4" />
                        Schedule
                      </button>

                      {/* Generate Button */}
                      <button
                        onClick={handleGenerate}
                        disabled={!canGenerate() || isGenerating}
                        className="flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        style={{ background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))' }}
                      >
                        Generate
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </>
              )}
              {step === 'preview' && (
                <>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors border border-border"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))' }}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExporting
                      ? (exportProgress ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...')
                      : 'Download ZIP'
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
