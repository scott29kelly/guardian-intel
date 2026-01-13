/**
 * Keyboard Shortcuts Hook
 * 
 * Provides global and scoped keyboard shortcuts for the application.
 * Supports ⌘/Ctrl modifier detection for cross-platform shortcuts.
 */

"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  /**
   * If true, the shortcut won't fire when the user is typing in an input/textarea.
   * Default: true
   */
  ignoreInputs?: boolean;
  /**
   * Scope of the shortcut. 'global' applies everywhere, other values only apply
   * when that scope is active (e.g., 'customers' for the customers page).
   */
  scope?: "global" | string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  scope?: string;
}

/**
 * Detects if the user's platform uses Command (Mac) or Ctrl (Windows/Linux).
 */
function isMacOS(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.platform?.toLowerCase().includes("mac") || 
         navigator.userAgent?.toLowerCase().includes("mac");
}

/**
 * Checks if the active element is an input field.
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  const isInput = tagName === "input" || tagName === "textarea" || tagName === "select";
  const isContentEditable = activeElement.getAttribute("contenteditable") === "true";
  
  return isInput || isContentEditable;
}

/**
 * Hook to register keyboard shortcuts.
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  scope = "global",
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = isMacOS();
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      for (const shortcut of shortcutsRef.current) {
        // Check scope
        if (shortcut.scope && shortcut.scope !== "global" && shortcut.scope !== scope) {
          continue;
        }

        // Check if we should ignore inputs
        const shouldIgnoreInputs = shortcut.ignoreInputs !== false;
        if (shouldIgnoreInputs && isInputFocused()) {
          // Exception: Allow shortcuts that use Cmd/Ctrl modifier even in inputs
          const requiresModifier = shortcut.meta || shortcut.ctrl;
          if (!requiresModifier) {
            continue;
          }
        }

        // Match the key (case-insensitive)
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatch) continue;

        // Match modifiers
        const ctrlOrMetaRequired = shortcut.ctrl || shortcut.meta;
        const ctrlOrMetaMatch = ctrlOrMetaRequired ? modifierKey : !modifierKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (ctrlOrMetaMatch && shiftMatch && altMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [enabled, scope]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for modifier key display text based on platform.
 */
export function useModifierKey(): string {
  const isMac = isMacOS();
  return isMac ? "⌘" : "Ctrl";
}

/**
 * Format a shortcut for display (e.g., "⌘K" or "Ctrl+K").
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, "key" | "ctrl" | "meta" | "shift" | "alt">): string {
  const parts: string[] = [];
  const isMac = typeof window !== "undefined" && isMacOS();

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  if (shortcut.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }

  // Format special keys nicely
  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === "/") keyDisplay = "/";
  if (shortcut.key === "?") keyDisplay = "?";
  if (shortcut.key === "Escape") keyDisplay = "Esc";
  if (shortcut.key === "ArrowUp") keyDisplay = "↑";
  if (shortcut.key === "ArrowDown") keyDisplay = "↓";
  if (shortcut.key === "Enter") keyDisplay = "↵";

  parts.push(keyDisplay);

  return isMac ? parts.join("") : parts.join("+");
}

// Export shortcut definitions for the app
export const APP_SHORTCUTS = {
  OPEN_AI_CHAT: {
    key: "k",
    meta: true,
    ctrl: true,
    description: "Open AI Assistant",
  },
  FOCUS_SEARCH: {
    key: "/",
    description: "Focus search",
    ignoreInputs: true,
  },
  ADD_CUSTOMER: {
    key: "n",
    description: "Add new customer",
    ignoreInputs: true,
    scope: "customers",
  },
  NAVIGATE_UP: {
    key: "k",
    description: "Navigate up",
    ignoreInputs: true,
    scope: "customers",
  },
  NAVIGATE_DOWN: {
    key: "j",
    description: "Navigate down",
    ignoreInputs: true,
    scope: "customers",
  },
  SHOW_SHORTCUTS: {
    key: "?",
    shift: true,
    description: "Show keyboard shortcuts",
  },
  CLOSE_MODAL: {
    key: "Escape",
    description: "Close modal/panel",
  },
} as const;
