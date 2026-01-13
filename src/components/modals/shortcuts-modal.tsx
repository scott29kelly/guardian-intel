/**
 * Keyboard Shortcuts Modal
 * 
 * Displays available keyboard shortcuts in a modal overlay.
 * Triggered by pressing '?' key.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModifierKey } from "@/lib/hooks/use-keyboard-shortcuts";

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const modKey = useModifierKey();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Global",
      shortcuts: [
        { keys: `${modKey}+K`, description: "Open AI Assistant" },
        { keys: "?", description: "Show keyboard shortcuts" },
        { keys: "Esc", description: "Close modal or panel" },
      ],
    },
    {
      title: "Customers Page",
      shortcuts: [
        { keys: "/", description: "Focus search field" },
        { keys: "N", description: "Add new customer" },
        { keys: "J", description: "Navigate to next customer" },
        { keys: "K", description: "Navigate to previous customer" },
      ],
    },
    {
      title: "Navigation",
      shortcuts: [
        { keys: "G then D", description: "Go to Dashboard" },
        { keys: "G then C", description: "Go to Customers" },
        { keys: "G then S", description: "Go to Storms" },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[hsl(var(--surface-primary))] border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-[hsl(var(--surface-secondary))]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-intel-500/20 to-guardian-500/20 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-intel-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-text-primary">Keyboard Shortcuts</h2>
                  <p className="text-xs text-text-muted">Navigate faster with your keyboard</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.keys}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[hsl(var(--surface-secondary))] hover:bg-[hsl(var(--surface-hover))] transition-colors"
                      >
                        <span className="text-sm text-text-secondary">
                          {shortcut.description}
                        </span>
                        <ShortcutKeys keys={shortcut.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-[hsl(var(--surface-secondary))]">
              <p className="text-xs text-text-muted text-center">
                Press <kbd className="px-1.5 py-0.5 bg-surface-primary border border-border rounded text-text-secondary font-mono">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  // Split by '+' or ' then ' to handle compound shortcuts
  const parts = keys.split(/(\+| then )/g).filter(p => p && p !== "+");

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => {
        if (part === " then ") {
          return (
            <span key={index} className="text-text-muted text-xs mx-1">
              then
            </span>
          );
        }
        return (
          <kbd
            key={index}
            className="min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-surface-primary border border-border rounded text-xs font-mono text-text-primary shadow-sm"
          >
            {part}
          </kbd>
        );
      })}
    </div>
  );
}

export default ShortcutsModal;
