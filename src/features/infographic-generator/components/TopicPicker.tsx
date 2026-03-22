"use client";

/**
 * TopicPicker
 *
 * Checkbox-style topic module grid with audience toggle for the "Custom"
 * tab of the infographic generator modal. Modules are deduplicated from all
 * presets. Cards show web search badges when a module requires grounding.
 *
 * Audience toggle ("Who will see this?") lets reps choose Internal vs
 * Customer-Facing without exposing any model or quality configuration.
 */

import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Globe, Users, UserCircle } from "lucide-react";
import type { TopicModule, InfographicAudience } from "../types/infographic.types";
import { infographicPresets } from "../templates/index";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopicPickerProps {
  selectedModules: TopicModule[];
  onModulesChange: (modules: TopicModule[]) => void;
  audience: InfographicAudience;
  onAudienceChange: (audience: InfographicAudience) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopicPicker({
  selectedModules,
  onModulesChange,
  audience,
  onAudienceChange,
}: TopicPickerProps) {
  // Deduplicate all available modules across presets
  const allModules = useMemo(() => {
    const seen = new Map<string, TopicModule>();
    for (const preset of infographicPresets) {
      for (const config of preset.modules) {
        if (!seen.has(config.module.id)) {
          seen.set(config.module.id, config.module);
        }
      }
    }
    return Array.from(seen.values());
  }, []);

  const selectedIds = useMemo(
    () => new Set(selectedModules.map((m) => m.id)),
    [selectedModules],
  );

  // Toggle a single module
  const toggleModule = useCallback(
    (mod: TopicModule) => {
      if (selectedIds.has(mod.id)) {
        onModulesChange(selectedModules.filter((m) => m.id !== mod.id));
      } else {
        onModulesChange([...selectedModules, mod]);
      }
    },
    [selectedIds, selectedModules, onModulesChange],
  );

  const handleSelectAll = useCallback(() => {
    onModulesChange([...allModules]);
  }, [allModules, onModulesChange]);

  const handleClear = useCallback(() => {
    onModulesChange([]);
  }, [onModulesChange]);

  return (
    <div className="p-5 space-y-5">
      {/* ---- Audience toggle ---- */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Who will see this?
        </label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => onAudienceChange("internal")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              audience === "internal"
                ? "bg-accent-primary text-white"
                : "bg-surface-secondary text-text-muted hover:text-text-primary"
            }`}
          >
            <Users className="w-4 h-4" />
            Internal
          </button>
          <button
            onClick={() => onAudienceChange("customer-facing")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              audience === "customer-facing"
                ? "bg-accent-primary text-white"
                : "bg-surface-secondary text-text-muted hover:text-text-primary"
            }`}
          >
            <UserCircle className="w-4 h-4" />
            Customer-Facing
          </button>
        </div>
      </div>

      {/* ---- Select All / Clear controls ---- */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {selectedModules.length} of {allModules.length} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-accent-primary hover:underline"
          >
            Select All
          </button>
          <span className="text-text-muted">|</span>
          <button
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ---- Module grid ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allModules.map((mod, index) => {
          const isSelected = selectedIds.has(mod.id);

          return (
            <motion.button
              key={mod.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => toggleModule(mod)}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary"
                  : "border-border bg-surface-secondary/50 hover:bg-surface-secondary"
              }`}
            >
              {/* Checkbox indicator */}
              <div
                className={`absolute top-2 right-2 w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
                  isSelected
                    ? "bg-accent-primary text-white"
                    : "bg-surface-hover text-transparent"
                }`}
              >
                <Check className="w-3 h-3" />
              </div>

              <p className="font-semibold text-xs text-text-primary pr-5 leading-tight">
                {mod.label}
              </p>
              <p className="text-[10px] text-text-muted mt-1 line-clamp-2 leading-snug">
                {mod.visualElement}
              </p>

              {mod.requiresWebSearch && (
                <Badge variant="accent" className="mt-2 text-[10px] px-1.5 py-0 gap-1">
                  <Globe className="w-3 h-3" />
                  Web-enhanced
                </Badge>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
