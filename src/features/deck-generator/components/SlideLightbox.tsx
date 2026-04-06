/**
 * SlideLightbox — Full-screen image viewer for slide and infographic images.
 *
 * Gmail-style lightbox with prev/next navigation, keyboard controls,
 * and click-to-dismiss backdrop. Reusable across DeckPreview and
 * InfographicGeneratorModal.
 */

"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface SlideLightboxProps {
  images: LightboxImage[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function SlideLightbox({ images, currentIndex, onClose, onNavigate }: SlideLightboxProps) {
  const isOpen = currentIndex !== null;
  const total = images.length;
  const hasNav = total > 1;

  const goPrev = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate(currentIndex > 0 ? currentIndex - 1 : total - 1);
  }, [currentIndex, total, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate(currentIndex < total - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, total, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasNav) goPrev();
      else if (e.key === "ArrowRight" && hasNav) goNext();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, hasNav, goPrev, goNext, onClose]);

  return (
    <AnimatePresence>
      {isOpen && currentIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/95"
          onClick={onClose}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              {hasNav && (
                <span className="text-sm text-white/70 font-medium">
                  {currentIndex + 1} / {total}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Image */}
          <div
            className="absolute inset-0 flex items-center justify-center p-16"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              className="max-w-full max-h-full object-contain rounded-lg"
              loading="eager"
              decoding="async"
            />

            {/* Navigation */}
            {hasNav && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * ZoomOverlay — hover indicator for zoomable images.
 * Wrap around an image container to show a ZoomIn icon on hover.
 */
export function ZoomOverlay({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="absolute inset-0 cursor-pointer bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group"
    >
      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
    </div>
  );
}
