"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import type { DeckTemplate, DeckGenerationRequest, ExportFormat, ArtifactConfig } from '../types/deck.types';
import { DEFAULT_ARTIFACT_CONFIGS } from '../types/deck.types';
import { useDeckGeneration } from '../hooks/useDeckGeneration';
import { useDeckStatus } from '@/lib/hooks/use-deck-generation';
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

type Step = 'select-template' | 'customize' | 'generating' | 'async-processing' | 'preview';

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
    asyncJobId,
    generateDeck,
    setDeckFromResult,
    resetGeneration
  } = useDeckGeneration();

  // State — always start at template selection so users see all options
  const [step, setStep] = useState<Step>('select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate | null>(null);
  const [context, setContext] = useState<DeckGenerationRequest['context']>(
    initialContext || {}
  );
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [artifactConfigs, setArtifactConfigs] = useState(DEFAULT_ARTIFACT_CONFIGS);

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
      // Always show template selector first so users can browse all options
      setStep('select-template');
      setSelectedTemplate(null);
      setContext(initialContext || {});
    }

    // Reset the flag when modal closes so next open will reinitialize
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, initialTemplateId, initialContext, getTemplate]);

  // Poll for async job status (auto-polls every 10s while pending/processing)
  // Pass asyncJobId as deckId so we poll the SPECIFIC deck, not the latest for this customer.
  // This prevents stale/failed decks from triggering a false isFailed transition.
  const deckStatus = useDeckStatus(
    asyncJobId ? context.customerId : undefined,
    { enabled: !!asyncJobId, deckId: asyncJobId || undefined }
  );

  // When async job completes or fails, handle transition
  useEffect(() => {
    if (!asyncJobId || step !== 'async-processing') return;

    const status = deckStatus.data;
    if (!status) return;

    if (status.isCompleted && status.deck) {
      const deckData = status.deck as { resultPayload?: string; pdfUrl?: string; audioUrl?: string; infographicUrl?: string; reportMarkdown?: string };
      if (deckData.resultPayload) {
        setDeckFromResult(deckData.resultPayload, status.deck.id, deckData.pdfUrl || undefined, {
          audioUrl: deckData.audioUrl || undefined,
          infographicUrl: deckData.infographicUrl || undefined,
          reportMarkdown: deckData.reportMarkdown || undefined,
        });
        setStep('preview');
      }
    } else if (status.isFailed && status.deck) {
      // Don't silently revert — stay on async-processing so the user sees the error
      // The async-processing UI checks for isFailed and shows the error message
    }
  }, [asyncJobId, step, deckStatus.data, setDeckFromResult]);

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
        requestedArtifacts: artifactConfigs,
      },
    };

    const deck = await generateDeck(selectedTemplate, request);

    if (deck) {
      setStep('preview');
    }
    // Note: if asyncJobId was set (async path), generateDeck returns null
    // and we check asyncJobId below to transition step. We can't use the
    // asyncJobId state directly here because setState is async, so we
    // read it on the next tick.
  }, [selectedTemplate, context, enabledSections, exportFormat, generateDeck]);

  // After handleGenerate completes, if asyncJobId was set, move to async-processing
  // This runs once when asyncJobId changes from null to a value
  const prevAsyncJobId = useRef<string | null>(null);
  useEffect(() => {
    if (asyncJobId && !prevAsyncJobId.current) {
      setStep('async-processing');
    }
    prevAsyncJobId.current = asyncJobId;
  }, [asyncJobId]);

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

  // Handle download - export as ZIP with PNG slides or direct PDF download
  const handleDownload = useCallback(async () => {
    if (!generatedDeck) return;

    // Check if this is a PDF deck (pdfUrl from Supabase or base64 fallback)
    if (generatedDeck.pdfUrl) {
      // Download from Supabase Storage URL
      window.open(generatedDeck.pdfUrl, "_blank");
      return;
    }
    const pdfSlide = generatedDeck.slides.find(s => s.content?.pdfData);
    if (pdfSlide?.content?.pdfData) {
      // Direct PDF download from base64 — better quality than re-capturing rendered pages
      try {
        const pdfBase64 = pdfSlide.content.pdfData as string;
        const byteChars = atob(pdfBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const { saveAs } = await import("file-saver");
        saveAs(blob, `${generatedDeck.templateName || "deck"}.pdf`);
      } catch (error) {
        console.error("PDF download failed:", error);
        alert("Failed to download PDF. Please try again.");
      }
      return;
    }

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
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] bg-surface-primary rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary">
            <div className="flex items-center gap-3">
              {step !== 'select-template' && step !== 'generating' && step !== 'async-processing' && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-muted" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {step === 'select-template' && 'Generate Slide Deck'}
                  {step === 'customize' && selectedTemplate?.name}
                  {step === 'generating' && 'Generating Deck...'}
                  {step === 'async-processing' && 'Generating via NotebookLM...'}
                  {step === 'preview' && (generatedDeck?.templateName || 'Deck Preview')}
                </h2>
                {step === 'preview' && generatedDeck && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {generatedDeck.context?.customerName && (
                      <span className="text-sm text-text-muted">
                        {generatedDeck.context.customerName}
                      </span>
                    )}
                    {generatedDeck.context?.customerName && (
                      <span className="text-text-muted text-xs">&middot;</span>
                    )}
                    <span className="text-xs text-text-muted">
                      {generatedDeck.slides.length} slides
                    </span>
                  </div>
                )}
              </div>
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
                artifactConfigs={artifactConfigs}
                onArtifactConfigsChange={setArtifactConfigs}
              />
            )}

            {/* Step 3: Generating (hide if error is set — error block renders instead) */}
            {step === 'generating' && progress && !error && (
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

            {/* Error State (not during async-processing — that step has its own error UI) */}
            {error && step !== 'async-processing' && (
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

            {/* Step 3b: Async Processing (NotebookLM background job) */}
            {step === 'async-processing' && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                {deckStatus.data?.isFailed ? (
                  <>
                    <AlertCircle className="w-16 h-16 text-damage-500 mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      Generation Failed
                    </h3>
                    <p className="text-text-muted mb-6 text-center max-w-md">
                      {deckStatus.data.deck?.errorMessage || "NotebookLM generation failed. Please try again."}
                    </p>
                    {/* Auth-specific guidance when the error mentions authentication */}
                    {deckStatus.data.deck?.errorMessage?.toLowerCase().includes("authentication") && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 max-w-md text-center">
                        NotebookLM session expired. Auto-refresh was attempted but failed.
                        <br />
                        Run <code className="px-1 py-0.5 bg-black/30 rounded">notebooklm login</code> in your terminal to re-authenticate.
                      </div>
                    )}
                    <button
                      onClick={() => { resetGeneration(); setStep('customize'); }}
                      className="px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors border border-border"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative mb-6">
                      <motion.div
                        className="w-16 h-16 rounded-full border-4 border-intel-400/30"
                        style={{ borderTopColor: 'var(--gradient-start)' }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      NotebookLM is generating your deck
                    </h3>
                    <p className="text-text-muted mb-4 text-center max-w-md">
                      {deckStatus.data?.isProcessing
                        ? "Research and slide generation in progress..."
                        : deckStatus.data?.isPending
                        ? "Queued for processing..."
                        : "Starting generation..."}
                    </p>
                    {/* Indeterminate progress bar */}
                    <div className="w-full max-w-md h-2 bg-surface-secondary rounded-full overflow-hidden mb-4">
                      <motion.div
                        className="h-full w-1/3 rounded-full"
                        style={{ background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))' }}
                        animate={{ x: ["0%", "200%", "0%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      />
                    </div>
                    <p className="text-sm text-text-muted mb-6">
                      This typically takes 3-5 minutes. You can close this dialog and check the Decks page for progress.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors border border-border"
                    >
                      Close
                    </button>
                  </>
                )}
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
                  {generatedDeck.slides.length} slides •
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
                      : (generatedDeck?.pdfUrl || generatedDeck?.slides.some(s => s.content?.pdfData))
                        ? 'Download PDF'
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
