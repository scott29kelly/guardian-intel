"use client";

/**
 * ArtifactViewerModal Component
 *
 * Large in-page modal with type-appropriate content rendering per D-16.
 * Uses the same Framer Motion spring animation pattern as DeckGeneratorModal
 * (z-[9999], backdrop blur, scale+opacity spring).
 *
 * Content rendering by artifact type:
 * - deck: iframe for PDF/slide viewer
 * - infographic: scrollable image with native pinch-zoom support
 * - audio: AudioBriefingPlayer with branded controls
 * - report: ReportViewer with markdown rendering and PDF export
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AudioBriefingPlayer } from "./AudioBriefingPlayer";
import { ReportViewer } from "./ReportViewer";
import { cn } from "@/lib/utils";
import type { ArtifactType, ArtifactState } from "@/features/multi-artifact";
import { ARTIFACT_CONFIG } from "@/features/multi-artifact";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtifactViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactType: ArtifactType | null;
  artifactState: ArtifactState | null;
  customerName?: string;
}

// ---------------------------------------------------------------------------
// Content renderer -- switches on artifact type
// ---------------------------------------------------------------------------

function renderContent(
  artifactType: ArtifactType,
  artifactState: ArtifactState,
  customerName?: string,
) {
  switch (artifactType) {
    case "deck":
      return (
        <iframe
          src={artifactState.url!}
          className="w-full h-full rounded-lg"
          title="Slide Deck"
        />
      );

    case "infographic":
      // Scrollable container with native pinch-zoom on mobile
      return (
        <div
          className="w-full h-full overflow-auto flex items-center justify-center"
          style={{ touchAction: "pinch-zoom" }}
        >
          <img
            src={artifactState.url!}
            alt="Infographic"
            className="max-w-full max-h-full object-contain mx-auto"
          />
        </div>
      );

    case "audio":
      return (
        <AudioBriefingPlayer
          audioUrl={artifactState.url!}
          customerName={customerName}
          className="max-w-md mx-auto"
        />
      );

    case "report":
      return (
        <ReportViewer
          markdown={artifactState.markdown || ""}
          customerName={customerName}
          className="h-full"
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtifactViewerModal({
  isOpen,
  onClose,
  artifactType,
  artifactState,
  customerName,
}: ArtifactViewerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && artifactType && artifactState && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[calc(100vh-2rem)] bg-surface-primary rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {ARTIFACT_CONFIG[artifactType].label}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Content: type-appropriate rendering */}
            <div className="flex-1 overflow-hidden p-4">
              {renderContent(artifactType, artifactState, customerName)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
