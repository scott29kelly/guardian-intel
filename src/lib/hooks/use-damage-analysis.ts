/**
 * Damage Analysis Hooks
 * 
 * React Query hooks for AI damage analysis.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface DamageAnalysisResult {
  id: string;
  photoId: string;
  analyzedAt: string;
  hasDamage: boolean;
  overallSeverity: "none" | "minor" | "moderate" | "severe" | "critical";
  confidenceScore: number;
  damageTypes: DamageTypeDetail[];
  roofDetails: RoofDetails;
  estimate: DamageEstimate;
  observations: string[];
  recommendations: string[];
  claimRecommendation: "file" | "monitor" | "not-recommended";
  claimJustification: string;
  model: string;
}

export interface DamageTypeDetail {
  type: string;
  severity: "minor" | "moderate" | "severe";
  location: string;
  description: string;
  affectedArea: string;
  repairMethod: string;
  estimatedCost: {
    low: number;
    high: number;
  };
}

export interface RoofDetails {
  roofType?: string;
  estimatedAge?: string;
  pitch?: string;
  condition: "excellent" | "good" | "fair" | "poor";
  color?: string;
}

export interface DamageEstimate {
  repairCost: {
    low: number;
    mid: number;
    high: number;
  };
  replacementCost: {
    low: number;
    mid: number;
    high: number;
  };
  recommendation: "repair" | "partial-replacement" | "full-replacement";
  estimatedSquares?: number;
  notes: string;
}

export interface AnalysisSummary {
  photosAnalyzed: number;
  photosWithDamage: number;
  overallSeverity: string;
  averageConfidence: number;
  claimRecommendation: "file" | "monitor" | "not-recommended";
}

export interface CombinedEstimate {
  totalRepairLow: number;
  totalRepairHigh: number;
  totalReplacementLow: number;
  totalReplacementHigh: number;
  overallRecommendation: string;
  damagesSummary: string[];
}

export interface AnalysisResponse {
  success: boolean;
  data: {
    analyses: DamageAnalysisResult[];
    summary: AnalysisSummary;
    combinedEstimate?: CombinedEstimate;
  };
}

export interface AnalyzePhotoInput {
  photoId?: string;
  photoIds?: string[];
  photoUrl?: string;
  photoBase64?: string;
  customerId?: string;
  claimId?: string;
  additionalContext?: string;
  saveResults?: boolean;
}

// ============================================================
// Hooks
// ============================================================

/**
 * Analyze photos for damage
 */
export function useAnalyzeDamage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AnalyzePhotoInput): Promise<AnalysisResponse> => {
      const response = await fetch("/api/ai/analyze-damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: ["photos", { customerId: variables.customerId }] });
        queryClient.invalidateQueries({ queryKey: ["customers", variables.customerId] });
      }
      if (variables.claimId) {
        queryClient.invalidateQueries({ queryKey: ["claims", variables.claimId] });
      }
      if (variables.photoId) {
        queryClient.invalidateQueries({ queryKey: ["photos", "detail", variables.photoId] });
      }
    },
  });
}

/**
 * Quick analyze a single photo
 */
export function useQuickAnalysis() {
  return useMutation({
    mutationFn: async (photoBase64: string): Promise<DamageAnalysisResult> => {
      const response = await fetch("/api/ai/analyze-damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoBase64,
          saveResults: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const data = await response.json();
      return data.data.analyses[0];
    },
  });
}
