"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Trophy, Zap, Target, TrendingUp } from "lucide-react";
import { CelebrationEvent, TIER_COLORS } from "@/lib/gamification/types";
import { Confetti } from "./confetti";
import { AnimatedCounter } from "./animated-counter";

interface CelebrationModalProps {
  event: CelebrationEvent | null;
  onClose: () => void;
}

const typeIcons = {
  achievement: Trophy,
  levelUp: Star,
  streak: Zap,
  deal: Target,
  milestone: TrendingUp,
  dailyGoal: Target,
};

const typeColors = {
  achievement: "from-amber-500 to-orange-600",
  levelUp: "from-purple-500 to-pink-600",
  streak: "from-orange-500 to-red-600",
  deal: "from-green-500 to-emerald-600",
  milestone: "from-cyan-500 to-blue-600",
  dailyGoal: "from-teal-500 to-green-600",
};

export function CelebrationModal({ event, onClose }: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (event) {
      setShowConfetti(true);
      
      // Auto-dismiss after 4 seconds
      const timeout = setTimeout(() => {
        onClose();
      }, 4000);
      
      return () => clearTimeout(timeout);
    }
  }, [event, onClose]);

  if (!event) return null;

  const Icon = typeIcons[event.type];
  const gradientClass = typeColors[event.type];
  const tierColors = event.tier ? TIER_COLORS[event.tier] : null;

  return (
    <>
      <Confetti 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)}
        particleCount={60}
        emojis={event.icon ? [event.icon, "⭐", "🎉"] : ["🎉", "⭐", "🔥"]}
      />
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: { 
                type: "spring",
                stiffness: 300,
                damping: 20
              }
            }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            className="relative w-[360px] overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient background */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />
            
            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className={`
                  w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center
                  ${tierColors 
                    ? `${tierColors.bg} ${tierColors.border} border-2` 
                    : "bg-white/20"
                  }
                `}
              >
                {event.icon ? (
                  <span className="text-4xl">{event.icon}</span>
                ) : (
                  <Icon className="w-10 h-10 text-white" />
                )}
              </motion.div>
              
              {/* Tier badge */}
              {event.tier && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3
                    ${tierColors?.bg} ${tierColors?.text} ${tierColors?.border} border
                  `}
                >
                  {event.tier}
                </motion.div>
              )}
              
              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                {event.title}
              </motion.h2>
              
              {/* Subtitle */}
              {event.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/80 mb-4"
                >
                  {event.subtitle}
                </motion.p>
              )}
              
              {/* XP earned */}
              {event.xpEarned && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full"
                >
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="font-bold text-white">
                    +<AnimatedCounter value={event.xpEarned} duration={800} /> XP
                  </span>
                </motion.div>
              )}
              
              {/* Dismiss hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 text-xs text-white/50"
              >
                Click anywhere to dismiss
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

