"use client";

/**
 * AudioBriefingPlayer Component
 *
 * Branded inline audio player for audio briefing artifacts. Renders custom
 * HTML5 audio controls with the Guardian Intel brand palette (Navy background,
 * Gold accents) sized for mobile thumb use (44px min touch targets).
 *
 * The native audio `controls` attribute is intentionally omitted -- all
 * playback UI is custom to maintain brand consistency and touch-target sizing.
 *
 * Play/pause is triggered only from a direct user click handler to satisfy
 * mobile autoplay restrictions (no programmatic play on mount).
 */

import { useState, useRef, useCallback } from "react";
import { Play, Pause, Share2 } from "lucide-react";
import { ShareSheet } from "@/features/infographic-generator/components/ShareSheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AudioBriefingPlayerProps {
  audioUrl: string;
  customerName?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as "M:SS" (e.g. 125 -> "2:05") */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AudioBriefingPlayer({
  audioUrl,
  customerName,
  className,
}: AudioBriefingPlayerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Share sheet
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // --------------------------------------------------------------------------
  // Event handlers
  // --------------------------------------------------------------------------

  /** Toggle play/pause -- called from direct click to satisfy mobile autoplay */
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  /** Sync React state with the audio element's current time */
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  /** Read duration once metadata loads */
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  /** Reset playing state when playback completes */
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /** Seek to clicked position on the progress bar */
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const targetTime = (clickX / rect.width) * duration;
      audio.currentTime = Math.max(0, Math.min(targetTime, duration));
    },
    [duration],
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div
      className={cn("rounded-xl p-4", className)}
      style={{ backgroundColor: "#1E3A5F" }}
    >
      {/* Hidden audio element -- no native controls */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Controls row: Play/Pause + Time + Share */}
      <div className="flex items-center gap-3">
        {/* Play/Pause -- 44x44px min touch target per mobile UX */}
        <button
          onClick={handlePlayPause}
          className="w-11 h-11 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#D4A656" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Time display */}
        <span className="text-xs font-mono text-white/80 min-w-[70px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Share button */}
        <button
          onClick={() => setShowShareSheet(true)}
          className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Share audio briefing"
        >
          <Share2 className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Seek bar: translucent track with Gold fill */}
      <div
        className="mt-2 h-2 rounded-full cursor-pointer"
        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            backgroundColor: "#D4A656",
          }}
        />
      </div>

      {/* ShareSheet overlay */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        imageData=""
        imageUrl={audioUrl}
        customerName={customerName}
      />
    </div>
  );
}
