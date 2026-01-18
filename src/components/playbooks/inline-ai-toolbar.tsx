"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Expand,
  Minimize2,
  MessageSquare,
  Smile,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface InlineAIToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  onReplace: (newText: string) => void;
  onInsertAfter: (text: string) => void;
  getSelection: () => { text: string; start: number; end: number } | null;
  playbookContext: {
    title: string;
    category: string;
    type: string;
  };
}

type AIAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
};

const actions: AIAction[] = [
  { id: "improve", label: "Improve", icon: Wand2, action: "enhance" },
  { id: "expand", label: "Expand", icon: Expand, action: "expand" },
  { id: "simplify", label: "Simplify", icon: Minimize2, action: "simplify" },
  { id: "rebuttal", label: "Add Rebuttal", icon: MessageSquare, action: "add_objections" },
  { id: "friendly", label: "Make Friendlier", icon: Smile, action: "make_conversational" },
];

interface Position {
  top: number;
  left: number;
}

export function InlineAIToolbar({
  containerRef,
  onReplace,
  onInsertAfter,
  getSelection,
  playbookContext,
}: InlineAIToolbarProps) {
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    const selection = getSelection();
    
    if (!selection || selection.text.trim().length < 5) {
      // Don't hide immediately to allow clicking toolbar buttons
      return;
    }

    const text = selection.text.trim();
    setSelectedText(text);
    setSelectionRange({ start: selection.start, end: selection.end });

    // Calculate position
    const windowSelection = window.getSelection();
    if (windowSelection && windowSelection.rangeCount > 0) {
      const range = windowSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        // Position above the selection
        const top = rect.top - containerRect.top - 45;
        const left = rect.left - containerRect.left + rect.width / 2;

        setPosition({
          top: Math.max(0, top),
          left: Math.min(Math.max(50, left), containerRect.width - 50),
        });
        setVisible(true);
      }
    }
  }, [containerRef, getSelection]);

  // Listen for selection changes
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(handleSelectionChange, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Check if click is outside toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Hide on Escape
      if (e.key === "Escape") {
        setVisible(false);
      }
      // Check selection on Shift+Arrow keys
      if (e.shiftKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        handleSelectionChange();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("keyup", handleKeyUp);
      }
    };
  }, [containerRef, handleSelectionChange]);

  const handleAction = async (action: AIAction) => {
    if (!selectedText || isLoading) return;

    setIsLoading(true);
    setLoadingAction(action.id);

    try {
      const response = await fetch("/api/ai/playbook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.action,
          title: playbookContext.title,
          category: playbookContext.category,
          type: playbookContext.type,
          selectedText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      // Determine whether to replace or insert
      if (action.id === "expand" || action.id === "rebuttal") {
        onInsertAfter(data.content);
        showToast("success", "Content Added", "New content inserted after selection");
      } else {
        onReplace(data.content);
        showToast("success", "Content Updated", "Selection has been replaced");
      }

      setVisible(false);
    } catch (error) {
      showToast(
        "error",
        "AI Error",
        error instanceof Error ? error.message : "Failed to process"
      );
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setSelectedText("");
    setSelectionRange(null);
  };

  return (
    <AnimatePresence>
      {visible && selectedText && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 flex items-center gap-1 p-1 bg-surface-primary border border-border rounded-lg shadow-xl"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          {/* AI Icon */}
          <div className="flex items-center gap-1 px-2 py-1 border-r border-border">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-text-secondary">AI</span>
          </div>

          {/* Action Buttons */}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={action.label}
            >
              {loadingAction === action.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <action.icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Arrow pointer */}
          <div
            className="absolute w-3 h-3 bg-surface-primary border-b border-r border-border transform rotate-45"
            style={{
              bottom: "-7px",
              left: "50%",
              marginLeft: "-6px",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
