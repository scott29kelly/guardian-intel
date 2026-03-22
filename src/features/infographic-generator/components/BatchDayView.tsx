"use client";

/**
 * BatchDayView Component
 *
 * Displays batch infographic generation results as a swipeable card stack.
 * Cards show progressive status (pending, generating, complete, error) and
 * support drag gestures on mobile for navigation. Tapping a completed card
 * fires onSelectResult to open the full InfographicPreview.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { InfographicResponse } from "../types/infographic.types";

export interface BatchCardItem {
  customerId: string;
  customerName?: string;
  status: "pending" | "generating" | "complete" | "error";
  result?: InfographicResponse;
  error?: string;
}

interface BatchDayViewProps {
  batchProgress: BatchCardItem[];
  onSelectResult?: (customerId: string, result: InfographicResponse) => void;
}

/** Drag threshold in pixels to trigger card change */
const SWIPE_THRESHOLD = 50;

export function BatchDayView({
  batchProgress,
  onSelectResult,
}: BatchDayViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const total = batchProgress.length;
  const completedCount = batchProgress.filter(
    (c) => c.status === "complete",
  ).length;

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  const goNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
        goNext();
      } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  // --------------------------------------------------------------------------
  // Card tap handler
  // --------------------------------------------------------------------------

  const handleCardTap = useCallback(
    (item: BatchCardItem) => {
      if (item.status === "complete" && item.result && onSelectResult) {
        onSelectResult(item.customerId, item.result);
      }
    },
    [onSelectResult],
  );

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary text-sm">
        No batch results to display.
      </div>
    );
  }

  const currentItem = batchProgress[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Progress summary */}
      <div className="text-center text-sm text-text-secondary">
        {completedCount} of {total} ready
      </div>

      {/* Card stack area */}
      <div className="relative h-72 sm:h-80">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIndex}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div
              className="h-full rounded-xl border border-border overflow-hidden cursor-grab active:cursor-grabbing"
              onClick={() => handleCardTap(currentItem)}
            >
              <CardContent item={currentItem} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop navigation arrows */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          disabled={activeIndex === 0}
          className="p-2 rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {batchProgress.map((item, i) => (
            <button
              key={item.customerId}
              onClick={() => setActiveIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === activeIndex
                  ? "bg-text-primary scale-125"
                  : item.status === "complete"
                    ? "bg-green-500/60"
                    : item.status === "error"
                      ? "bg-red-500/60"
                      : "bg-surface-secondary"
              }`}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={activeIndex === total - 1}
          className="p-2 rounded-full hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Card Content (internal)
// =============================================================================

function CardContent({ item }: { item: BatchCardItem }) {
  const name = item.customerName || item.customerId;

  switch (item.status) {
    case "pending":
      return (
        <div className="flex flex-col items-center justify-center h-full bg-surface-secondary/50 p-6 gap-3">
          <Clock className="w-8 h-8 text-text-secondary/50" />
          <p className="font-medium text-text-primary">{name}</p>
          <p className="text-sm text-text-secondary">Waiting...</p>
        </div>
      );

    case "generating":
      return (
        <div className="flex flex-col items-center justify-center h-full bg-surface-secondary/50 p-6 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="font-medium text-text-primary">{name}</p>
          <p className="text-sm text-text-secondary">Generating...</p>
        </div>
      );

    case "complete":
      return (
        <div className="relative h-full bg-surface-secondary">
          {item.result && (
            <img
              src={
                item.result.imageUrl ||
                `data:image/png;base64,${item.result.imageData}`
              }
              alt={`Briefing for ${name}`}
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlay with name and badge */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="font-medium text-white">{name}</p>
            </div>
          </div>
        </div>
      );

    case "error":
      return (
        <div className="flex flex-col items-center justify-center h-full bg-red-500/5 p-6 gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="font-medium text-text-primary">{name}</p>
          <p className="text-sm text-red-500 text-center">
            {item.error || "Generation failed"}
          </p>
        </div>
      );

    default:
      return null;
  }
}
