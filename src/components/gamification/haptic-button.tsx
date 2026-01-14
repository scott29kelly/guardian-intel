"use client";

import { forwardRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { ConfettiBurst } from "./confetti";

interface HapticButtonProps extends ButtonProps {
  xpReward?: number;
  showXP?: boolean;
  confettiOnClick?: boolean;
  pulseOnHover?: boolean;
  glowColor?: string;
}

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ 
    children, 
    xpReward, 
    showXP = true, 
    confettiOnClick = false,
    pulseOnHover = true,
    glowColor,
    onClick,
    className,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const [burstPosition, setBurstPosition] = useState<{ x: number; y: number } | null>(null);
    const [showXPBadge, setShowXPBadge] = useState(false);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback if available (mobile)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      
      // Show confetti burst
      if (confettiOnClick) {
        setBurstPosition({ x: e.clientX, y: e.clientY });
      }
      
      // Flash XP badge
      if (xpReward && showXP) {
        setShowXPBadge(true);
        setTimeout(() => setShowXPBadge(false), 1000);
      }
      
      // Call original onClick
      onClick?.(e);
    }, [onClick, confettiOnClick, xpReward, showXP]);

    return (
      <>
        <motion.div
          className="relative inline-block"
          whileHover={pulseOnHover ? { scale: 1.02 } : {}}
          whileTap={{ scale: 0.95 }}
          onPointerDown={() => setIsPressed(true)}
          onPointerUp={() => setIsPressed(false)}
          onPointerLeave={() => setIsPressed(false)}
        >
          <Button
            ref={ref}
            onClick={handleClick}
            className={`relative overflow-hidden ${className}`}
            {...props}
          >
            {/* Ripple effect on press */}
            {isPressed && (
              <motion.span
                className="absolute inset-0 bg-white/20 rounded-lg"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            )}
            
            {children}
            
            {/* XP indicator on hover */}
            {xpReward && showXP && (
              <motion.span
                className="ml-2 flex items-center gap-0.5 text-xs bg-white/20 px-1.5 py-0.5 rounded"
                initial={{ opacity: 0, x: 10 }}
                whileHover={{ opacity: 1, x: 0 }}
              >
                <Zap className="w-3 h-3" />
                +{xpReward}
              </motion.span>
            )}
          </Button>
          
          {/* Floating XP badge on click */}
          {showXPBadge && xpReward && (
            <motion.div
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              transition={{ duration: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 -top-2 flex items-center gap-1 text-accent-primary font-bold text-sm pointer-events-none"
            >
              <Zap className="w-4 h-4" />
              +{xpReward} XP
            </motion.div>
          )}
          
          {/* Glow effect */}
          {glowColor && (
            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              animate={{ 
                boxShadow: isPressed 
                  ? `0 0 20px 4px ${glowColor}40`
                  : `0 0 0 0 ${glowColor}00`
              }}
            />
          )}
        </motion.div>
        
        {/* Confetti burst */}
        {burstPosition && (
          <ConfettiBurst
            x={burstPosition.x}
            y={burstPosition.y}
            isActive={true}
            onComplete={() => setBurstPosition(null)}
          />
        )}
      </>
    );
  }
);

HapticButton.displayName = "HapticButton";

// Action button with satisfying feedback
export function ActionButton({
  children,
  icon,
  xpReward,
  variant = "primary",
  onClick,
  className,
  disabled,
  type,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  xpReward?: number;
  variant?: "primary" | "secondary" | "success" | "danger";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const [isClicked, setIsClicked] = useState(false);
  const [showBurst, setShowBurst] = useState<{ x: number; y: number } | null>(null);

  const variantStyles = {
    primary: "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/20",
    secondary: "bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover",
    success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20",
    danger: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsClicked(true);
    setShowBurst({ x: e.clientX, y: e.clientY });
    
    // Haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    
    setTimeout(() => setIsClicked(false), 200);
    onClick?.(e);
  };

  return (
    <>
      <motion.button
        onClick={handleClick}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        type={type}
        className={`
          relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200 overflow-hidden group
          ${variantStyles[variant]}
          ${className || ""}
        `}
      >
        {/* Press ring effect */}
        <motion.span
          className="absolute inset-0 bg-white rounded-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={isClicked ? { scale: 2, opacity: [0.3, 0] } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
        
        {icon}
        <span className="relative">{children}</span>
        
        {/* XP reward hint */}
        {xpReward && (
          <span className="absolute right-2 text-xs bg-white/20 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            +{xpReward} XP
          </span>
        )}
      </motion.button>
      
      {showBurst && (
        <ConfettiBurst
          x={showBurst.x}
          y={showBurst.y}
          isActive={true}
          count={8}
          onComplete={() => setShowBurst(null)}
        />
      )}
    </>
  );
}

// Checkbox with satisfying animation
export function SatisfyingCheckbox({
  checked,
  onChange,
  label,
  xpReward,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  xpReward?: number;
}) {
  const [showXP, setShowXP] = useState(false);

  const handleChange = () => {
    if (!checked && xpReward) {
      setShowXP(true);
      setTimeout(() => setShowXP(false), 1000);
    }
    onChange(!checked);
  };

  return (
    <motion.label
      className="flex items-center gap-3 cursor-pointer group relative"
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${checked 
            ? "bg-accent-success border-accent-success" 
            : "border-border group-hover:border-accent-primary"
          }
        `}
        animate={checked ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.2 }}
        onClick={handleChange}
      >
        <motion.svg
          className="w-3 h-3 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.path d="M20 6L9 17l-5-5" />
        </motion.svg>
      </motion.div>
      
      {label && (
        <span className={`text-sm ${checked ? "text-text-muted line-through" : "text-text-primary"}`}>
          {label}
        </span>
      )}
      
      {/* Floating XP */}
      {showXP && xpReward && (
        <motion.span
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -20 }}
          className="absolute -top-2 left-6 text-xs font-bold text-accent-success flex items-center gap-0.5"
        >
          <Zap className="w-3 h-3" />
          +{xpReward}
        </motion.span>
      )}
    </motion.label>
  );
}
