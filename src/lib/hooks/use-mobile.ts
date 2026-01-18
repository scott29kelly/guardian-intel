/**
 * Mobile Detection Hook
 * 
 * Provides utilities for responsive design and mobile-specific behavior.
 */

import { useState, useEffect } from "react";

// Breakpoints matching Tailwind defaults
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook to detect if the current viewport is mobile-sized
 */
export function useIsMobile(breakpoint: Breakpoint = "md"): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS[breakpoint]);
    };

    // Check immediately
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): Breakpoint | "xs" {
  const [breakpoint, setBreakpoint] = useState<Breakpoint | "xs">("lg");

  useEffect(() => {
    const getBreakpoint = (): Breakpoint | "xs" => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.sm) return "xs";
      if (width < BREAKPOINTS.md) return "sm";
      if (width < BREAKPOINTS.lg) return "md";
      if (width < BREAKPOINTS.xl) return "lg";
      if (width < BREAKPOINTS["2xl"]) return "xl";
      return "2xl";
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}

/**
 * Hook to detect touch devices
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to detect orientation
 */
export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    const getOrientation = () => {
      if (window.matchMedia("(orientation: portrait)").matches) {
        return "portrait";
      }
      return "landscape";
    };

    const handleChange = () => {
      setOrientation(getOrientation());
    };

    setOrientation(getOrientation());
    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);
    
    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, []);

  return orientation;
}

/**
 * Media query hook for custom queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
