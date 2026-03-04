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

