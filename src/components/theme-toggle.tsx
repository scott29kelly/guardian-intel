"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

const themes = [
  { id: "dark", label: "Dark", icon: Moon, description: "Night ops mode" },
  { id: "light", label: "Light", icon: Sun, description: "Daylight mode" },
  { id: "gray", label: "Gray", icon: Monitor, description: "Tactical dark" },
  { id: "light-gray", label: "Lt Gray", icon: Monitor, description: "Professional light" },
] as const;

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Dropdown - positions to the right when collapsed */}
            <motion.div
              initial={{ opacity: 0, y: isCollapsed ? 0 : 10, x: isCollapsed ? -10 : 0, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: isCollapsed ? 0 : 10, x: isCollapsed ? -10 : 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute w-48 z-[100] rounded-lg border border-border bg-[hsl(var(--surface-primary))] shadow-xl overflow-hidden ${
                isCollapsed 
                  ? 'left-full ml-2 bottom-0' 
                  : 'left-0 bottom-full mb-2'
              }`}
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
