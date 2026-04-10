"use client";

/**
 * GenerateArtifactsButton Component
 *
 * Checkbox selector and generate trigger button per D-10 and D-11.
 * Shows four artifact-type checkboxes (all checked by default) in a dropdown
 * panel. Persists the last selection in localStorage so reps keep their
 * preferences across sessions.
 *
 * Two variants:
 * - "button" (default): standalone primary button with accent background
 * - "inline": embedded in card actions with secondary styling
 *
 * Click flow:
 * 1. First click opens the checkbox selector dropdown
 * 2. User toggles desired artifact types
 * 3. Second click triggers generation with selected types
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ArtifactType } from "@/features/multi-artifact";
import { ARTIFACT_ORDER, ARTIFACT_CONFIG } from "@/features/multi-artifact";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "guardian-intel:artifact-prefs";

const DEFAULT_SELECTION: ArtifactType[] = ["deck", "infographic", "audio", "report"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GenerateArtifactsButtonProps {
  customerId: string;
  onGenerate: (artifacts: ArtifactType[]) => Promise<any>;
  isGenerating?: boolean;
  className?: string;
  /** "button" = standalone, "inline" = embedded in card actions */
  variant?: "button" | "inline";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenerateArtifactsButton({
  customerId,
  onGenerate,
  isGenerating,
  className,
  variant = "button",
}: GenerateArtifactsButtonProps) {
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactType[]>(DEFAULT_SELECTION);
  const [showSelector, setShowSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ArtifactType[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedArtifacts(parsed);
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }, []);

  // Click-outside handler to close selector
  useEffect(() => {
    if (!showSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSelector]);

  // Toggle an artifact type in/out of selection
  const toggleArtifact = useCallback((type: ArtifactType) => {
    setSelectedArtifacts((prev) => {
      let next: ArtifactType[];
      if (prev.includes(type)) {
        // Prevent deselecting the last one
        if (prev.length <= 1) return prev;
        next = prev.filter((t) => t !== type);
      } else {
        next = [...prev, type];
      }

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }

      return next;
    });
  }, []);

  // Trigger generation with selected artifacts
  const handleGenerate = useCallback(() => {
    onGenerate(selectedArtifacts);
    setShowSelector(false);
  }, [onGenerate, selectedArtifacts]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Main button per D-11 */}
      <button
        onClick={() => (showSelector ? handleGenerate() : setShowSelector(true))}
        disabled={isGenerating}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
          variant === "inline"
            ? "bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            : "bg-accent-primary text-white hover:bg-accent-primary/90",
          "disabled:opacity-50",
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating...
          </>
        ) : showSelector ? (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Generate ({selectedArtifacts.length})
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Generate Artifacts
          </>
        )}
      </button>

      {/* Checkbox selector dropdown per D-10 */}
      <AnimatePresence>
        {showSelector && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-0 mb-1 w-56 bg-surface-primary border border-border rounded-lg shadow-lg z-50 p-2"
          >
            {ARTIFACT_ORDER.map((type) => {
              const config = ARTIFACT_CONFIG[type];
              const isSelected = selectedArtifacts.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleArtifact(type)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-primary hover:bg-surface-secondary rounded transition-colors"
                >
                  {/* Checkbox indicator -- matches TopicPicker pattern */}
                  <div
                    className={cn(
                      "w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors",
                      isSelected
                        ? "bg-accent-primary text-white"
                        : "bg-surface-secondary border border-border",
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
