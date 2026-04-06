"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  isLoading?: boolean;
  count: number;
}

export function BulkActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  isLoading = false,
  count,
}: BulkActionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
          >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] bg-surface-primary border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmVariant === "danger" 
                    ? "bg-accent-danger/20" 
                    : "bg-accent-primary/20"
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    confirmVariant === "danger" 
                      ? "text-accent-danger" 
                      : "text-accent-primary"
                  }`} />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-text-secondary">
                {description}
              </p>
              <div className="mt-4 px-4 py-3 bg-surface-secondary rounded-lg">
                <p className="text-sm text-text-muted">
                  This action will affect{" "}
                  <span className="font-semibold text-text-primary">{count} customer{count !== 1 ? "s" : ""}</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/50">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant={confirmVariant === "danger" ? "destructive" : "default"}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
