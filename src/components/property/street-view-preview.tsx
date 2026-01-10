"use client";

/**
 * Street View Preview Component
 * 
 * Displays Google Street View imagery for a property address.
 * Shows placeholder when no API key is configured.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  ExternalLink,
  ImageOff,
  Loader2,
  Eye,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreetViewPreviewProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  className?: string;
  height?: string;
  showControls?: boolean;
  showExpandButton?: boolean;
  onExpand?: () => void;
}

export function StreetViewPreview({
  address,
  city,
  state,
  zipCode,
  className = "",
  height = "200px",
  showControls = true,
  showExpandButton = true,
  onExpand,
}: StreetViewPreviewProps) {
  const [heading, setHeading] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

  useEffect(() => {
    generateImageUrl();
  }, [address, city, state, zipCode, heading]);

  const generateImageUrl = () => {
    setIsLoading(true);
    setHasError(false);

    if (!apiKey) {
      // Use placeholder when no API key
      const encodedLocation = encodeURIComponent(`${city}, ${state}`);
      setImageUrl(`https://placehold.co/600x400/1a1a2e/00d4ff?text=Street+View%0A${encodedLocation}`);
      setIsLoading(false);
      return;
    }

    const params = new URLSearchParams({
      size: "600x400",
      location: fullAddress,
      heading: heading.toString(),
      pitch: "10",
      fov: "90",
      key: apiKey,
    });

    setImageUrl(`https://maps.googleapis.com/maps/api/streetview?${params.toString()}`);
  };

  const rotateLeft = () => setHeading((prev) => (prev - 45 + 360) % 360);
  const rotateRight = () => setHeading((prev) => (prev + 45) % 360);
  const resetView = () => setHeading(0);

  const openInGoogleMaps = () => {
    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&layer=c`;
    window.open(mapsUrl, "_blank");
  };

  return (
    <div className={`relative rounded-lg overflow-hidden bg-surface-secondary ${className}`} style={{ height }}>
      {/* Image */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-secondary"
          >
            <Loader2 className="w-6 h-6 text-intel-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-secondary text-text-muted">
          <ImageOff className="w-8 h-8 mb-2" />
          <p className="text-sm">Street View unavailable</p>
          <p className="text-xs mt-1">{city}, {state}</p>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={`Street View of ${fullAddress}`}
          className="w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

      {/* Address label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white">
        <Home className="w-3 h-3" />
        <span className="truncate max-w-[200px]">{address}</span>
      </div>

      {/* API key warning */}
      {!apiKey && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/20 backdrop-blur-sm rounded text-[10px] text-amber-400">
          Demo Mode
        </div>
      )}

      {/* Controls */}
      {showControls && !hasError && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={rotateLeft}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded hover:bg-black/70 transition-colors"
              title="Rotate left"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded hover:bg-black/70 transition-colors"
              title="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={rotateRight}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded hover:bg-black/70 transition-colors"
              title="Rotate right"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={openInGoogleMaps}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded hover:bg-black/70 transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </button>
            {showExpandButton && onExpand && (
              <button
                onClick={onExpand}
                className="p-1.5 bg-black/50 backdrop-blur-sm rounded hover:bg-black/70 transition-colors"
                title="Expand view"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Heading indicator */}
      {showControls && !hasError && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] text-white/70">
          {getDirectionLabel(heading)}
        </div>
      )}
    </div>
  );
}

function getDirectionLabel(heading: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return `${directions[index]} (${heading}°)`;
}

/**
 * Compact Street View thumbnail for lists - now more prominent with label
 */
export function StreetViewThumbnail({
  address,
  city,
  state,
  zipCode,
  size = 80,
  onClick,
  showLabel = true,
}: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  size?: number;
  onClick?: () => void;
  showLabel?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

  let imageUrl: string;
  if (!apiKey) {
    imageUrl = `https://placehold.co/${size}x${size}/1a1a2e/00d4ff?text=Street+View`;
  } else {
    const params = new URLSearchParams({
      size: `${size}x${size}`,
      location: fullAddress,
      pitch: "10",
      fov: "90",
      key: apiKey,
    });
    imageUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  }

  if (hasError) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-surface-secondary rounded gap-1"
        style={{ width: size, height: size }}
      >
        <MapPin className="w-4 h-4 text-text-muted" />
        {showLabel && <span className="text-[8px] text-text-muted">No Image</span>}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      title="Click to view property on Google Street View"
    >
      <img
        src={imageUrl}
        alt={`Street View of ${city}, ${state}`}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={() => setHasError(true)}
      />
      {/* Always visible overlay with label */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col items-center justify-end pb-1">
        <Eye className="w-3 h-3 text-white/80 mb-0.5" />
        {showLabel && (
          <span className="text-[8px] font-mono uppercase tracking-wider text-white/90 font-semibold">
            Street View
          </span>
        )}
      </div>
      {/* Hover ring effect */}
      {onClick && (
        <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-accent-primary/60 rounded transition-all" />
      )}
    </div>
  );
}

/**
 * Street View Modal - Full screen modal for viewing Street View
 */
export function StreetViewModal({
  isOpen,
  onClose,
  address,
  city,
  state,
  zipCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />

          {/* Modal - Properly centered using inset and auto margins */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 m-auto w-[90vw] max-w-[900px] h-[70vh] max-h-[600px] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl z-[10000] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-primary/10">
                  <MapPin className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-text-primary">
                    Property Street View
                  </h2>
                  <p className="font-mono text-xs text-text-muted">
                    {address}, {city}, {state} {zipCode}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Street View Content */}
            <div className="flex-1">
              <StreetViewPreview
                address={address}
                city={city}
                state={state}
                zipCode={zipCode}
                height="100%"
                showControls={true}
                showExpandButton={false}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
