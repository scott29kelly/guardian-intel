"use client";

/**
 * useInfographicPresets Hook
 *
 * Provides access to infographic preset templates with search and
 * moment-based filtering. Follows the same memoization pattern as
 * useDeckTemplates for consistent API surface.
 */

import { useMemo, useCallback } from "react";
import type { InfographicPreset, UsageMoment } from "../types/infographic.types";
import {
  infographicPresets,
  getPresetById,
  getPresetsByMoment,
} from "../templates/index";

interface UseInfographicPresetsReturn {
  presets: InfographicPreset[];
  getPreset: (id: string) => InfographicPreset | undefined;
  getByMoment: (moment: UsageMoment) => InfographicPreset[];
  searchPresets: (query: string) => InfographicPreset[];
}

export function useInfographicPresets(): UseInfographicPresetsReturn {
  const searchPresets = useCallback((query: string): InfographicPreset[] => {
    if (!query.trim()) return infographicPresets;

    const lowerQuery = query.toLowerCase();
    return infographicPresets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description.toLowerCase().includes(lowerQuery),
    );
  }, []);

  const memoizedGetPreset = useCallback(
    (id: string) => getPresetById(id),
    [],
  );

  const memoizedGetByMoment = useCallback(
    (moment: UsageMoment) => getPresetsByMoment(moment),
    [],
  );

  return useMemo(
    () => ({
      presets: infographicPresets,
      getPreset: memoizedGetPreset,
      getByMoment: memoizedGetByMoment,
      searchPresets,
    }),
    [memoizedGetPreset, memoizedGetByMoment, searchPresets],
  );
}
