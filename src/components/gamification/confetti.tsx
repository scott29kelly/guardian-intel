"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShouldAnimate } from "@/lib/preferences";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  emoji?: string;
  type: "confetti" | "emoji";
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
  particleCount?: number;
  emojis?: string[];
  colors?: string[];
  spread?: number;
}

const DEFAULT_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function Confetti({
  isActive,
  onComplete,
  duration = 3000,
  particleCount = 50,
  emojis = ["🎉", "⭐", "🔥", "💰", "🏆"],
  colors = DEFAULT_COLORS,
  spread = 360,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { shouldShowConfetti } = useShouldAnimate();
  
  // If confetti is disabled, just call onComplete immediately
  useEffect(() => {
    if (isActive && !shouldShowConfetti) {
      onComplete?.();
    }
  }, [isActive, shouldShowConfetti, onComplete]);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const isEmoji = Math.random() > 0.7;
      
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20, // Center with some spread
        y: 50,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: isEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : undefined,
        type: isEmoji ? "emoji" : "confetti",
      });
    }
    
    return newParticles;
  }, [particleCount, colors, emojis]);

  useEffect(() => {
    if (isActive) {
      setParticles(createParticles());
      
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration);
      
      return () => clearTimeout(timeout);
    } else {
      setParticles([]);
    }
  }, [isActive, duration, onComplete, createParticles]);

  if (!shouldShowConfetti || (!isActive && particles.length === 0)) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: `${particle.x}vw`,
              y: "-10vh",
              rotate: 0,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.x + (Math.random() - 0.5) * spread * 0.3}vw`,
              y: "110vh",
              rotate: particle.rotation + (Math.random() > 0.5 ? 720 : -720),
              scale: particle.scale,
              opacity: [1, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2 + Math.random() * 2,
              ease: [0.25, 0.1, 0.25, 1],
              delay: Math.random() * 0.5,
            }}
            className="absolute"
            style={{ fontSize: particle.type === "emoji" ? "24px" : "12px" }}
          >
            {particle.type === "emoji" ? (
              <span>{particle.emoji}</span>
            ) : (
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: particle.color,
                  boxShadow: `0 0 6px ${particle.color}`,
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Sparkle effect
export function Sparkles({ children, isActive = true }: { children: React.ReactNode; isActive?: boolean }) {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const newSparkle = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 8 + Math.random() * 8,
      };
      
      setSparkles((prev) => [...prev.slice(-4), newSparkle]);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute pointer-events-none"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: sparkle.size,
              height: sparkle.size,
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
              <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
