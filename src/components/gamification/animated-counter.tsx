"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

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
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  
  useEffect(() => {
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
  }, [value, duration, onComplete]);

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

// Currency-specific counter with satisfying formatting
export function AnimatedCurrency({
  value,
  duration = 1500,
  className = "",
  showChange = false,
  previousValue,
}: {
  value: number;
  duration?: number;
  className?: string;
  showChange?: boolean;
  previousValue?: number;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const change = previousValue !== undefined ? value - previousValue : 0;
  
  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      setIsAnimating(true);
      const timeout = setTimeout(() => setIsAnimating(false), duration);
      return () => clearTimeout(timeout);
    }
  }, [value, previousValue, duration]);

  return (
    <div className="relative inline-flex items-baseline gap-2">
      <motion.span
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <AnimatedCounter
          value={value}
          duration={duration}
          formatFn={(v) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(v)
          }
        />
      </motion.span>
      
      {showChange && change !== 0 && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-medium ${
            change > 0 ? "text-accent-success" : "text-accent-danger"
          }`}
        >
          {change > 0 ? "+" : ""}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(change)}
        </motion.span>
      )}
    </div>
  );
}

// XP counter with level-up flash
export function XPCounter({
  xp,
  xpToNext,
  level,
  className = "",
}: {
  xp: number;
  xpToNext: number;
  level: number;
  className?: string;
}) {
  const progress = (xp / (xp + xpToNext)) * 100;
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          Level <span className="text-text-primary font-semibold">{level}</span>
        </span>
        <span className="text-text-muted">
          <AnimatedCounter value={xp} duration={500} className="text-accent-primary font-medium" />
          <span className="mx-0.5">/</span>
          <span className="text-text-secondary">{xp + xpToNext} XP</span>
        </span>
      </div>
      
      <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--gradient-start), var(--gradient-end))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Score with pulse effect on change
export function AnimatedScore({
  score,
  maxScore = 100,
  size = "md",
  showLabel = true,
}: {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevScore = useRef(score);
  
  useEffect(() => {
    if (prevScore.current !== score) {
      setIsAnimating(true);
      const timeout = setTimeout(() => setIsAnimating(false), 500);
      prevScore.current = score;
      return () => clearTimeout(timeout);
    }
  }, [score]);

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "border-accent-success text-accent-success bg-accent-success/10";
    if (s >= 60) return "border-accent-primary text-accent-primary bg-accent-primary/10";
    if (s >= 40) return "border-accent-warning text-accent-warning bg-accent-warning/10";
    return "border-text-muted text-text-muted bg-surface-secondary";
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        rounded-lg border-2 flex flex-col items-center justify-center
        ${getScoreColor(score)}
      `}
      animate={isAnimating ? { 
        scale: [1, 1.15, 1],
        boxShadow: [
          "0 0 0 0 transparent",
          "0 0 20px 4px var(--glow-primary)",
          "0 0 0 0 transparent"
        ]
      } : {}}
      transition={{ duration: 0.4 }}
    >
      <AnimatedCounter value={score} duration={400} className="font-bold" />
      {showLabel && (
        <span className="text-[8px] uppercase tracking-wider opacity-70">Score</span>
      )}
    </motion.div>
  );
}

// Streak counter with fire effect
export function StreakCounter({
  streak,
  className = "",
}: {
  streak: number;
  className?: string;
}) {
  const isHotStreak = streak >= 7;
  
  return (
    <motion.div
      className={`flex items-center gap-1.5 ${className}`}
      animate={isHotStreak ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <motion.span
        className="text-lg"
        animate={isHotStreak ? { 
          rotate: [0, -5, 5, 0],
          scale: [1, 1.1, 1]
        } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        🔥
      </motion.span>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-text-primary leading-none">
          <AnimatedCounter value={streak} duration={400} />
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wide">
          day streak
        </span>
      </div>
    </motion.div>
  );
}
