"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

const themes = [
  { id: "dark", label: "Dark", icon: Moon, description: "Night mode" },
  { id: "slate", label: "Slate", icon: Monitor, description: "Neutral gray" },
  { id: "light", label: "Light", icon: Sun, description: "Day mode" },
] as const;

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  // For portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position for portal
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    if (isCollapsed) {
      setDropdownPosition({
        top: rect.top,
        left: rect.right + 8, // 8px gap from button
      });
    } else {
      setDropdownPosition({
        top: rect.top - 8, // Position above button with gap
        left: rect.left,
      });
    }
  }, [isCollapsed]);

  // Recalculate on open and on resize
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      
      const handleResize = () => calculatePosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);
      
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, [isOpen, calculatePosition]);

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Dropdown content - shared between portal and inline versions
  const dropdownContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: isCollapsed ? -10 : 0, y: isCollapsed ? 0 : 10 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: isCollapsed ? -10 : 0, y: isCollapsed ? 0 : 10 }}
      transition={{ duration: 0.15 }}
      className="w-48 rounded-lg border border-border bg-[hsl(var(--surface-primary))] shadow-2xl overflow-hidden"
    >
      <div className="p-1">
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all
                ${isActive 
                  ? "bg-accent-primary/10 text-accent-primary" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }
              `}
            >
              <div className={`
                w-8 h-8 rounded flex items-center justify-center
                ${isActive ? "bg-accent-primary/20" : "bg-surface-secondary"}
              `}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-mono text-xs uppercase tracking-wider">
                  {t.label}
                </p>
                <p className="text-[10px] text-text-muted">
                  {t.description}
                </p>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title={isCollapsed ? `Theme: ${currentTheme.label}` : undefined}
        className={`flex items-center gap-2 rounded-lg bg-surface-secondary border border-border hover:bg-surface-hover transition-all group ${
          isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
        }`}
      >
        <CurrentIcon className="w-4 h-4 text-accent-primary flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="font-mono text-xs text-text-secondary uppercase tracking-wider">
              {currentTheme.label}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - always in a portal for proper coverage */}
            {mounted && createPortal(
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setIsOpen(false)} 
              />,
              document.body
            )}
            
            {/* Dropdown - always use portal to stay above backdrop */}
            {mounted && createPortal(
              <div
                className="fixed z-[9999]"
                style={isCollapsed ? {
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                } : {
                  bottom: `calc(100vh - ${dropdownPosition.top}px + 8px)`,
                  left: dropdownPosition.left,
                }}
              >
                {dropdownContent}
              </div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
