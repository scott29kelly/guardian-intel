"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Trash2,
  X,
  ChevronDown,
  CheckSquare,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusOptions, stageOptions } from "./types";

interface BulkActionBarProps {
  selectedIds: Set<string>;
  showBulkStatusMenu: boolean;
  setShowBulkStatusMenu: (show: boolean) => void;
  showBulkStageMenu: boolean;
  setShowBulkStageMenu: (show: boolean) => void;
  onBulkStatusChange: (status: string) => void;
  onBulkStageChange: (stage: string) => void;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  onCompare: () => void;
  clearSelection: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function BulkActionBar({
  selectedIds,
  showBulkStatusMenu,
  setShowBulkStatusMenu,
  showBulkStageMenu,
  setShowBulkStageMenu,
  onBulkStatusChange,
  onBulkStageChange,
  onBulkExport,
  onBulkDelete,
  onCompare,
  clearSelection,
  isUpdating,
  isDeleting,
}: BulkActionBarProps) {
  const hasSelection = selectedIds.size > 0;

  return (
    <AnimatePresence>
      {hasSelection && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-primary border border-border rounded-xl shadow-2xl">
            {/* Selection Count */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-accent-primary" />
              </div>
              <span className="text-sm font-medium text-text-primary">
                {selectedIds.size} selected
              </span>
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulkStatusMenu(!showBulkStatusMenu);
                  setShowBulkStageMenu(false);
                }}
                disabled={isUpdating}
              >
                Status
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {showBulkStatusMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-40 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden">
                  {statusOptions.filter(o => o.value !== "all").map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onBulkStatusChange(option.value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stage Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulkStageMenu(!showBulkStageMenu);
                  setShowBulkStatusMenu(false);
                }}
                disabled={isUpdating}
              >
                Stage
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {showBulkStageMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-40 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden">
                  {stageOptions.filter(o => o.value !== "all").map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onBulkStageChange(option.value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Selected */}
            <Button variant="outline" size="sm" onClick={onBulkExport}>
              <Download className="w-3 h-3" />
              Export
            </Button>

            {/* Compare - only enabled for 2-4 selections */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCompare}
              disabled={selectedIds.size < 2 || selectedIds.size > 4}
              title={
                selectedIds.size < 2
                  ? "Select at least 2 customers to compare"
                  : selectedIds.size > 4
                  ? "Compare up to 4 customers at a time"
                  : `Compare ${selectedIds.size} customers`
              }
            >
              <Scale className="w-3 h-3" />
              Compare
            </Button>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>

            {/* Clear Selection */}
            <button
              onClick={clearSelection}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
