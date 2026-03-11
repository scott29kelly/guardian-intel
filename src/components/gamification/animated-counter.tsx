"use client";

import { useEffect, useState, useRef } from "react";
import { useShouldAnimate } from "@/lib/preferences";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (value: number) => string;
  onComplete?: () => void;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  className = "",
  formatFn,
  onComplete,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const { shouldAnimateCounters } = useShouldAnimate();
  
  useEffect(() => {
    // If animations disabled, just show the value immediately
    if (!shouldAnimateCounters) {
      setDisplayValue(value);
      previousValueRef.current = value;
      onComplete?.();
      return;
    }
    
    const startValue = previousValueRef.current;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutExpo)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = startValue + (endValue - startValue) * eased;
      setDisplayValue(Math.round(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    animate();
    previousValueRef.current = value;
  }, [value, duration, onComplete, shouldAnimateCounters]);

  const formattedValue = formatFn 
    ? formatFn(displayValue) 
    : displayValue.toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

