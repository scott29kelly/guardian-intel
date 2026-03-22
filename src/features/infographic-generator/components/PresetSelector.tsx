"use client";

/**
 * PresetSelector
 *
 * Visual card grid for selecting infographic presets, grouped by usage moment.
 * Each card shows the preset icon, name, description, audience badge, and
 * usage moment badge. Selection state uses accent ring styling.
 *
 * Follows the DeckTemplateSelector pattern with staggered animations and
 * dynamic icon mapping from lucide-react.
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Car,
  CloudLightning,
  Briefcase,
  FileText,
  CalendarDays,
  Layers,
} from "lucide-react";
import type { InfographicPreset, UsageMoment } from "../types/infographic.types";
import { useInfographicPresets } from "../hooks";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Icon lookup -- maps preset.icon string to lucide component
// ---------------------------------------------------------------------------

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Car,
  CloudLightning,
  Briefcase,
  FileText,
  CalendarDays,
  Layers,
};

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  return iconMap[name] || FileText;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PresetSelectorProps {
  selectedPresetId: string | null;
  onSelect: (presetId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PresetSelector({ selectedPresetId, onSelect }: PresetSelectorProps) {
  const { presets, searchPresets } = useInfographicPresets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPresets = useMemo(
    () => (searchQuery ? searchPresets(searchQuery) : presets),
    [searchQuery, searchPresets, presets],
  );

  // Group presets by usage moment
  const groupedPresets = useMemo(() => {
    const grouped = new Map<UsageMoment, InfographicPreset[]>();
    for (const preset of filteredPresets) {
      const existing = grouped.get(preset.usageMoment) || [];
      existing.push(preset);
      grouped.set(preset.usageMoment, existing);
    }
    return grouped;
  }, [filteredPresets]);

  let globalIndex = 0;

  return (
    <div className="p-5 space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
        />
      </div>

      {/* Grouped preset cards */}
      {Array.from(groupedPresets.entries()).map(([moment, momentPresets]) => (
        <div key={moment}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {moment}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {momentPresets.map((preset) => {
              const Icon = getIcon(preset.icon);
              const isSelected = selectedPresetId === preset.id;
              const idx = globalIndex++;

              return (
                <motion.button
                  key={preset.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelect(preset.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-accent-primary border-accent-primary bg-accent-primary/5 scale-[1.02]"
                      : "border-border bg-surface-secondary/50 hover:bg-surface-secondary hover:border-accent-primary/30"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "bg-surface-hover text-text-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text-primary truncate">
                      {preset.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge
                        variant={preset.audience === "internal" ? "accent" : "warning"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {preset.audience === "internal" ? "Internal" : "Customer"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {preset.usageMoment}
                      </Badge>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filteredPresets.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No presets match your search</p>
        </div>
      )}
    </div>
  );
}
