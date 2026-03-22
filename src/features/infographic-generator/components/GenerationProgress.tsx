"use client";

/**
 * GenerationProgress Component
 *
 * Displays an animated, non-linear progress bar with contextual status messages
 * during infographic generation. Supports phase-specific icons, error states,
 * and background generation dismiss.
 *
 * CRITICAL: No model names, no time estimates, no technical jargon.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { GenerationProgress as GenerationProgressType, GenerationPhase } from "../types/infographic.types";

interface GenerationProgressProps {
  progress: GenerationProgressType | null;
  isGenerating: boolean;
  error: string | null;
  onBackgroundDismiss?: () => void;
}

const PHASE_ICONS: Record<GenerationPhase, React.ReactNode> = {
  data: <Database className="h-8 w-8 text-[#4A90A4]" />,
  scoring: <Sparkles className="h-8 w-8 text-[#D4A656]" />,
  generating: <Loader2 className="h-8 w-8 text-[#4A90A4] animate-spin" />,
  refining: <Wand2 className="h-8 w-8 text-[#D4A656]" />,
  complete: <CheckCircle2 className="h-8 w-8 text-emerald-500" />,
};

export function GenerationProgress({
  progress,
  isGenerating,
  error,
  onBackgroundDismiss,
}: GenerationProgressProps) {
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        </motion.div>
        <p className="text-lg font-medium text-red-500 mb-2">
          Something went wrong
        </p>
        <p className="text-sm text-text-muted mb-4">{error}</p>
        <p className="text-xs text-text-muted">
          Please try again or select a different option.
        </p>
      </div>
    );
  }

  // No progress yet
  if (!progress && !isGenerating) {
    return null;
  }

  const phase = progress?.phase ?? "data";
  const percent = progress?.percent ?? 0;
  const statusMessage = progress?.statusMessage ?? "Preparing...";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Phase icon with animated transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          {PHASE_ICONS[phase]}
        </motion.div>
      </AnimatePresence>

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={statusMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={`text-lg font-medium mb-6 ${
            phase === "complete" ? "text-emerald-500" : "text-text-primary"
          }`}
        >
          {statusMessage}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-3">
        <div className="h-2 w-full rounded-full bg-surface-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: phase === "complete"
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #1E3A5F, #4A90A4)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${percent}%` }}
            transition={{
              type: "spring",
              stiffness: 50,
              damping: 15,
            }}
          />
        </div>
      </div>

      {/* Percent text */}
      <p className="text-sm text-text-muted mb-6">
        {percent}%
      </p>

      {/* Background dismiss option */}
      {onBackgroundDismiss && isGenerating && phase !== "complete" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={onBackgroundDismiss}
          className="text-sm text-accent-primary hover:underline"
        >
          Continue working — we&apos;ll notify you when it&apos;s ready
        </motion.button>
      )}
    </div>
  );
}
