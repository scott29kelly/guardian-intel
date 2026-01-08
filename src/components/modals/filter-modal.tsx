"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filters: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onApply: (filters: Record<string, string[]>) => void;
}

export function FilterModal({ 
  isOpen, 
  onClose, 
  title,
  filters, 
  activeFilters, 
  onApply 
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>(activeFilters);

  const handleToggle = (filterId: string, value: string, multiSelect?: boolean) => {
    setLocalFilters(prev => {
      const current = prev[filterId] || [];
      if (multiSelect) {
        if (current.includes(value)) {
          return { ...prev, [filterId]: current.filter(v => v !== value) };
        }
        return { ...prev, [filterId]: [...current, value] };
      }
      return { ...prev, [filterId]: current.includes(value) ? [] : [value] };
    });
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const activeCount = Object.values(localFilters).reduce((acc, arr) => acc + arr.length, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
              <Filter className="w-5 h-5 text-accent-primary" />
              {title}
              {activeCount > 0 && (
                <Badge className="bg-accent-primary/20 text-accent-primary">
                  {activeCount} active
                </Badge>
              )}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
            {filters.map((filter) => (
              <div key={filter.id}>
                <label className="text-sm font-medium text-text-secondary mb-3 block">
                  {filter.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {filter.options.map((option) => {
                    const isActive = (localFilters[filter.id] || []).includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleToggle(filter.id, option.value, filter.multiSelect)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          isActive
                            ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                            : "bg-surface-secondary text-text-muted border border-border hover:text-text-primary hover:border-text-muted"
                        }`}
                      >
                        {option.label}
                        {option.count !== undefined && (
                          <span className="ml-1.5 text-xs opacity-60">({option.count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleApply}>Apply Filters</Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
