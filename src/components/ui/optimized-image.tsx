"use client";

/**
 * OptimizedImage Component
 *
 * Wrapper around Next.js Image with built-in optimizations:
 * - Lazy loading by default
 * - Blur placeholder for better perceived performance
 * - Automatic aspect ratio handling
 * - Error state handling
 */

import { useState, memo } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallback?: React.ReactNode;
  showLoadingState?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
}

// Simple blur data URL for placeholder
const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMzMzMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMyMjIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+";

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  auto: "",
};

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  fallback,
  showLoadingState = true,
  aspectRatio = "auto",
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      fallback || (
        <div
          className={cn(
            "flex items-center justify-center bg-surface-secondary text-text-muted",
            aspectRatioClasses[aspectRatio],
            className
          )}
        >
          <ImageIcon className="w-8 h-8 opacity-50" />
        </div>
      )
    );
  }

  return (
    <div className={cn("relative overflow-hidden", aspectRatioClasses[aspectRatio], className)}>
      {showLoadingState && isLoading && (
        <div className="absolute inset-0 bg-surface-secondary animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        loading="lazy"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
    </div>
  );
});

/**
 * Hook for preloading images
 */
export function useImagePreload(src: string | string[]) {
  const sources = Array.isArray(src) ? src : [src];

  return () => {
    sources.forEach((s) => {
      if (typeof window !== "undefined") {
        const img = new window.Image();
        img.src = s;
      }
    });
  };
}

/**
 * Intersection Observer based lazy image loading for non-Next.js images
 */
export function useLazyImage(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useState(() => {
    if (!ref || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  });

  return { ref: setRef, isVisible };
}
