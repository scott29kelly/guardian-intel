"use client";

/**
 * InfographicPreview Component
 *
 * Full-screen infographic image viewer with pinch-to-zoom on mobile and
 * desktop zoom controls. Supports download via base64-to-blob conversion
 * and double-tap to toggle zoom level.
 */

import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Download, Share2, RotateCcw } from "lucide-react";

interface InfographicPreviewProps {
  imageData: string;
  imageUrl?: string;
  onShare?: () => void;
  onDownload?: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export function InfographicPreview({
  imageData,
  imageUrl,
  onShare,
  onDownload,
}: InfographicPreviewProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Touch gesture refs
  const initialTouchDistanceRef = useRef<number | null>(null);
  const scaleAtPinchStartRef = useRef(1);
  const lastTapRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampScale = useCallback((value: number) => {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  }, []);

  // --------------------------------------------------------------------------
  // Touch handlers for pinch-to-zoom
  // --------------------------------------------------------------------------

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        initialTouchDistanceRef.current = getTouchDistance(e.touches);
        scaleAtPinchStartRef.current = scale;
      }
    },
    [scale],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const ratio = currentDistance / initialTouchDistanceRef.current;
        setScale(clampScale(scaleAtPinchStartRef.current * ratio));
      }
    },
    [clampScale],
  );

  const handleTouchEnd = useCallback(() => {
    initialTouchDistanceRef.current = null;

    // Double-tap detection
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Toggle between 1x and 2x
      setScale((prev) => (prev > 1.5 ? 1 : 2));
      setPosition({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  }, []);

  // --------------------------------------------------------------------------
  // Desktop zoom controls
  // --------------------------------------------------------------------------

  const zoomIn = useCallback(() => {
    setScale((prev) => clampScale(prev + 0.25));
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setScale((prev) => clampScale(prev - 0.25));
  }, [clampScale]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // --------------------------------------------------------------------------
  // Download handler
  // --------------------------------------------------------------------------

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
      return;
    }

    try {
      const byteCharacters = atob(imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `briefing-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[InfographicPreview] Download error:", err);
    }
  }, [imageData, onDownload]);

  // --------------------------------------------------------------------------
  // Resolve image source
  // --------------------------------------------------------------------------

  const imageSrc = imageUrl || `data:image/png;base64,${imageData}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg bg-surface-secondary"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <motion.img
          src={imageSrc}
          alt="Generated infographic briefing"
          className="w-full h-auto select-none"
          animate={{ scale, x: position.x, y: position.y }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          draggable={false}
        />
      </div>

      {/* Desktop zoom controls toolbar */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={zoomOut}
          className="bg-surface-primary/90 backdrop-blur-sm rounded-full p-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={resetZoom}
          className="bg-surface-primary/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-4 h-4 inline mr-1" />
          {Math.round(scale * 100)}%
        </button>

        <button
          onClick={zoomIn}
          className="bg-surface-primary/90 backdrop-blur-sm rounded-full p-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={handleDownload}
          className="bg-surface-primary/90 backdrop-blur-sm rounded-full p-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Download"
        >
          <Download className="w-4 h-4" />
        </button>

        {onShare && (
          <button
            onClick={onShare}
            className="bg-surface-primary/90 backdrop-blur-sm rounded-full p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
