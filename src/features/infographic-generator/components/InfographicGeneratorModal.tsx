"use client";

/**
 * InfographicGeneratorModal
 *
 * Three-mode generator modal (Presets | Custom | Ask AI) that serves as the
 * primary entry point for reps to generate infographic briefings. Follows the
 * DeckGeneratorModal pattern: AnimatePresence, fixed backdrop, spring animation,
 * mobile-first bottom sheet on small viewports.
 *
 * Zero configuration exposed -- no model names, quality sliders, or resolution
 * selectors. The system autonomously selects the optimal generation strategy.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Loader2, MessageSquare, LayoutGrid, Palette } from "lucide-react";
import type {
  GenerationMode,
  InfographicAudience,
  InfographicRequest,
  TopicModule,
} from "../types/infographic.types";
import { useInfographicGeneration } from "../hooks";
import { PresetSelector } from "./PresetSelector";
import { TopicPicker } from "./TopicPicker";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InfographicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
}

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

const TABS: { mode: GenerationMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: "preset", label: "Presets", icon: LayoutGrid },
  { mode: "custom", label: "Custom", icon: Palette },
  { mode: "conversational", label: "Ask AI", icon: MessageSquare },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InfographicGeneratorModal({
  isOpen,
  onClose,
  customerId,
  customerName,
}: InfographicGeneratorModalProps) {
  const { isGenerating, progress, result, error, generate, reset } =
    useInfographicGeneration();

  // UI state
  const [activeTab, setActiveTab] = useState<GenerationMode>("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<TopicModule[]>([]);
  const [conversationalPrompt, setConversationalPrompt] = useState("");
  const [audience, setAudience] = useState<InfographicAudience>("internal");

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const canGenerate = useCallback((): boolean => {
    if (isGenerating) return false;
    switch (activeTab) {
      case "preset":
        return selectedPresetId !== null;
      case "custom":
        return selectedModules.length > 0;
      case "conversational":
        return conversationalPrompt.trim().length > 0;
      default:
        return false;
    }
  }, [activeTab, selectedPresetId, selectedModules, conversationalPrompt, isGenerating]);

  const handleGenerate = useCallback(async () => {
    const request: InfographicRequest = {
      customerId,
      mode: activeTab,
      audience,
      ...(activeTab === "preset" && { presetId: selectedPresetId ?? undefined }),
      ...(activeTab === "custom" && { selectedModules }),
      ...(activeTab === "conversational" && { conversationalPrompt }),
    };

    await generate(request);
  }, [customerId, activeTab, audience, selectedPresetId, selectedModules, conversationalPrompt, generate]);

  const handleClose = useCallback(() => {
    reset();
    setActiveTab("preset");
    setSelectedPresetId(null);
    setSelectedModules([]);
    setConversationalPrompt("");
    setAudience("internal");
    onClose();
  }, [reset, onClose]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="infographic-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        {/* Content panel -- bottom sheet on mobile, centered on desktop */}
        <motion.div
          key="infographic-content"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-surface-primary rounded-t-2xl md:rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ---- Header ---- */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">
              {customerName ? `Briefing for ${customerName}` : "Generate Briefing"}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* ---- Tabs: Presets | Custom | Ask AI ---- */}
          <div className="flex-shrink-0 flex border-b border-border">
            {TABS.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === mode
                    ? "text-accent-primary border-b-2 border-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ---- Tab content ---- */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              {activeTab === "preset" && (
                <motion.div
                  key="tab-preset"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <PresetSelector
                    selectedPresetId={selectedPresetId}
                    onSelect={setSelectedPresetId}
                  />
                </motion.div>
              )}

              {activeTab === "custom" && (
                <motion.div
                  key="tab-custom"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <TopicPicker
                    selectedModules={selectedModules}
                    onModulesChange={setSelectedModules}
                    audience={audience}
                    onAudienceChange={setAudience}
                  />
                </motion.div>
              )}

              {activeTab === "conversational" && (
                <motion.div
                  key="tab-conversational"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="p-5"
                >
                  {/* ConversationalInput placeholder -- Plan 03 Task 2 */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-text-secondary">
                      Describe the briefing you need
                    </label>
                    <textarea
                      value={conversationalPrompt}
                      onChange={(e) => setConversationalPrompt(e.target.value)}
                      placeholder="e.g. Create a briefing showing roof age data and recent storm damage for this customer..."
                      rows={4}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary resize-none"
                    />
                    <p className="text-xs text-text-muted">
                      The system will automatically select the best data modules and layout for your request.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- Progress state ---- */}
            {isGenerating && progress && (
              <div className="flex flex-col items-center justify-center py-10 px-6">
                <Loader2 className="w-12 h-12 text-accent-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-text-primary mb-1">
                  {progress.statusMessage}
                </p>
                <div className="w-full max-w-xs h-1.5 bg-surface-secondary rounded-full overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-accent-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* ---- Error state ---- */}
            {error && (
              <div className="flex flex-col items-center py-8 px-6">
                <p className="text-sm text-red-400 mb-3">{error}</p>
                <button
                  onClick={reset}
                  className="text-sm text-accent-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* ---- Result state (placeholder for GenerationProgress component -- Plan 03) ---- */}
            {result && (
              <div className="flex flex-col items-center py-8 px-6">
                <p className="text-sm font-medium text-text-primary">
                  Your briefing is ready!
                </p>
              </div>
            )}
          </div>

          {/* ---- Footer with Generate button ---- */}
          <div className="flex-shrink-0 flex items-center justify-end px-5 py-4 border-t border-border bg-surface-primary">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate()}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Briefing
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
