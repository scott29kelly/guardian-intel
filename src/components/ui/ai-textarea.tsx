"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Lightbulb,
  Expand,
  Minimize2,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface AITextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  context?: {
    title?: string;
    category?: string;
    type?: string;
  };
  disabled?: boolean;
}

type AIOption = {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
  description: string;
};

const aiOptions: AIOption[] = [
  {
    id: "enhance",
    label: "Enhance",
    icon: Wand2,
    action: "enhance",
    description: "Improve and polish the text",
  },
  {
    id: "expand",
    label: "Expand",
    icon: Expand,
    action: "expand",
    description: "Add more detail and depth",
  },
  {
    id: "simplify",
    label: "Simplify",
    icon: Minimize2,
    action: "simplify",
    description: "Make it more concise",
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    icon: Lightbulb,
    action: "brainstorm",
    description: "Generate ideas",
  },
];

export function AITextarea({
  value,
  onChange,
  placeholder = "Enter text...",
  rows = 3,
  className = "",
  label,
  context = {},
  disabled = false,
}: AITextareaProps) {
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOption, setLoadingOption] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAIAction = async (option: AIOption) => {
    if (isLoading) return;

    // For brainstorm, we don't need existing content
    if (option.id !== "brainstorm" && !value.trim()) {
      showToast("info", "No Content", "Enter some text first to enhance it");
      return;
    }

    setIsLoading(true);
    setLoadingOption(option.id);
    setShowMenu(false);

    try {
      const response = await fetch("/api/ai/playbook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: option.action,
          title: context.title,
          category: context.category,
          type: context.type,
          existingContent: value,
          selectedText: value,
          additionalContext: label,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      // Update the textarea with the new content
      onChange(data.content);
      showToast("success", "Done!", `Text ${option.label.toLowerCase()}d successfully`);

      // Focus the textarea
      textareaRef.current?.focus();
    } catch (error) {
      showToast(
        "error",
        "AI Error",
        error instanceof Error ? error.message : "Failed to process"
      );
    } finally {
      setIsLoading(false);
      setLoadingOption(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isLoading}
          className="w-full px-4 py-2.5 pr-12 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* AI Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          disabled={disabled || isLoading}
          className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-purple-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          title="AI Assist"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          ) : (
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* AI Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-56 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-text-primary">
                    AI Assist
                  </span>
                </div>
              </div>
              <div className="p-1">
                {aiOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAIAction(option)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option.icon className="w-4 h-4 text-text-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {option.label}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {option.description}
                      </p>
                    </div>
                    {loadingOption === option.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-secondary/50 rounded-lg"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-primary border border-border rounded-lg shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="text-sm text-text-secondary">
                AI is working...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
