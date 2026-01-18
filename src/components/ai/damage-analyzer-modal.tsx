"use client";

/**
 * DamageAnalyzerModal Component
 * 
 * Upload or select photos for AI damage analysis.
 * Displays detailed results with estimates.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  FileText,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Zap,
  Shield,
  Target,
  Wrench,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAnalyzeDamage, type DamageAnalysisResult, type AnalysisResponse } from "@/lib/hooks/use-damage-analysis";
import { usePhotos } from "@/lib/hooks/use-photos";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

interface DamageAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  claimId?: string;
  preselectedPhotoIds?: string[];
  onAnalysisComplete?: (results: DamageAnalysisResult[]) => void;
}

const severityConfig = {
  none: { color: "text-slate-400", bg: "bg-slate-500/20", label: "No Damage" },
  minor: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Minor" },
  moderate: { color: "text-orange-400", bg: "bg-orange-500/20", label: "Moderate" },
  severe: { color: "text-rose-400", bg: "bg-rose-500/20", label: "Severe" },
  critical: { color: "text-red-500", bg: "bg-red-500/20", label: "Critical" },
};

const recommendationConfig = {
  file: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle, label: "File Claim" },
  monitor: { color: "text-amber-400", bg: "bg-amber-500/20", icon: Eye, label: "Monitor" },
  "not-recommended": { color: "text-slate-400", bg: "bg-slate-500/20", icon: XCircle, label: "Not Recommended" },
};

export function DamageAnalyzerModal({
  isOpen,
  onClose,
  customerId,
  claimId,
  preselectedPhotoIds,
  onAnalysisComplete,
}: DamageAnalyzerModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeDamage = useAnalyzeDamage();

  const [step, setStep] = useState<"select" | "analyzing" | "results">("select");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(preselectedPhotoIds || []);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ base64: string; preview: string }[]>([]);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const { data: existingPhotos } = usePhotos(customerId ? { customerId, limit: 50 } : {});
  const photos = existingPhotos?.data || [];

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setUploadedPhotos((prev) => [
          ...prev,
          { base64, preview: URL.createObjectURL(file) },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Toggle photo selection
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Remove uploaded photo
  const removeUploadedPhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Run analysis
  const handleAnalyze = async () => {
    const hasExistingPhotos = selectedPhotoIds.length > 0;
    const hasUploadedPhotos = uploadedPhotos.length > 0;

    if (!hasExistingPhotos && !hasUploadedPhotos) {
      showToast("error", "No Photos", "Please select or upload at least one photo");
      return;
    }

    setStep("analyzing");

    try {
      let response: AnalysisResponse;

      if (hasExistingPhotos) {
        // Analyze existing photos
        response = await analyzeDamage.mutateAsync({
          photoIds: selectedPhotoIds,
          customerId,
          claimId,
          saveResults: true,
        });
      } else {
        // Analyze uploaded photos (one at a time)
        const analyses: DamageAnalysisResult[] = [];
        for (const photo of uploadedPhotos) {
          const singleResponse = await analyzeDamage.mutateAsync({
            photoBase64: photo.base64,
            customerId,
            claimId,
            saveResults: false, // Don't save uploaded photos
          });
          analyses.push(...singleResponse.data.analyses);
        }

        // Build combined response
        response = {
          success: true,
          data: {
            analyses,
            summary: {
              photosAnalyzed: analyses.length,
              photosWithDamage: analyses.filter((a) => a.hasDamage).length,
              overallSeverity: getMostSevere(analyses.map((a) => a.overallSeverity)),
              averageConfidence: Math.round(
                analyses.reduce((sum, a) => sum + a.confidenceScore, 0) / analyses.length
              ),
              claimRecommendation: analyses.some((a) => a.claimRecommendation === "file")
                ? "file"
                : analyses.some((a) => a.claimRecommendation === "monitor")
                ? "monitor"
                : "not-recommended",
            },
          },
        };
      }

      setResults(response);
      setStep("results");
      onAnalysisComplete?.(response.data.analyses);
      showToast("success", "Analysis Complete", `${response.data.summary.photosWithDamage} of ${response.data.summary.photosAnalyzed} photos show damage`);
    } catch (error) {
      showToast("error", "Analysis Failed", error instanceof Error ? error.message : "Please try again");
      setStep("select");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedPhotoIds(preselectedPhotoIds || []);
    setUploadedPhotos([]);
    setResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-primary border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">AI Damage Analyzer</h2>
                <p className="text-sm text-text-muted">
                  {step === "select" && "Upload or select photos to analyze"}
                  {step === "analyzing" && "Analyzing photos for damage..."}
                  {step === "results" && "Analysis complete"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === "select" && (
              <div className="space-y-6">
                {/* Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-primary/50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="text-text-primary font-medium mb-1">Upload Photos</p>
                  <p className="text-sm text-text-muted">Drag & drop or click to select</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Uploaded Photos Preview */}
                {uploadedPhotos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Uploaded Photos ({uploadedPhotos.length})
                    </h4>
                    <div className="grid grid-cols-6 gap-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                          <img
                            src={photo.preview}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeUploadedPhoto(index)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Photos */}
                {photos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Or Select Existing Photos ({selectedPhotoIds.length} selected)
                    </h4>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                      {photos.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => togglePhotoSelection(photo.id)}
                          className={`
                            relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                            ${selectedPhotoIds.includes(photo.id)
                              ? "border-accent-primary ring-2 ring-accent-primary/30"
                              : "border-transparent hover:border-border"
                            }
                          `}
                        >
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {selectedPhotoIds.includes(photo.id) && (
                            <div className="absolute inset-0 bg-accent-primary/20 flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-accent-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-text-muted">
                    <p className="font-medium text-text-primary mb-1">How it works:</p>
                    <ul className="space-y-1">
                      <li>• AI analyzes photos for hail, wind, and other damage</li>
                      <li>• Identifies damage types, locations, and severity</li>
                      <li>• Generates repair/replacement cost estimates</li>
                      <li>• Recommends whether to file an insurance claim</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {step === "analyzing" && (
              <div className="py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">Analyzing Photos</h3>
                <p className="text-text-muted">AI is examining your photos for damage...</p>
                <div className="mt-6 flex justify-center gap-8 text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Detecting damage
                  </span>
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" /> Measuring severity
                  </span>
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Calculating costs
                  </span>
                </div>
              </div>
            )}

            {step === "results" && results && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="p-6 bg-gradient-to-br from-surface-secondary/50 to-surface-secondary/30 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Analysis Summary</h3>
                      <p className="text-sm text-text-muted">
                        {results.data.summary.photosWithDamage} of {results.data.summary.photosAnalyzed} photos show damage
                      </p>
                    </div>
                    <Badge className={`${severityConfig[results.data.summary.overallSeverity as keyof typeof severityConfig]?.bg} ${severityConfig[results.data.summary.overallSeverity as keyof typeof severityConfig]?.color}`}>
                      {severityConfig[results.data.summary.overallSeverity as keyof typeof severityConfig]?.label || results.data.summary.overallSeverity}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-surface-primary/50 rounded-lg">
                      <p className="text-2xl font-bold text-text-primary">{results.data.summary.photosAnalyzed}</p>
                      <p className="text-xs text-text-muted">Photos Analyzed</p>
                    </div>
                    <div className="text-center p-3 bg-surface-primary/50 rounded-lg">
                      <p className="text-2xl font-bold text-rose-400">{results.data.summary.photosWithDamage}</p>
                      <p className="text-xs text-text-muted">With Damage</p>
                    </div>
                    <div className="text-center p-3 bg-surface-primary/50 rounded-lg">
                      <p className="text-2xl font-bold text-accent-primary">{results.data.summary.averageConfidence}%</p>
                      <p className="text-xs text-text-muted">Confidence</p>
                    </div>
                    <div className="text-center p-3 bg-surface-primary/50 rounded-lg">
                      {(() => {
                        const rec = recommendationConfig[results.data.summary.claimRecommendation];
                        const Icon = rec.icon;
                        return (
                          <>
                            <Icon className={`w-6 h-6 ${rec.color} mx-auto mb-1`} />
                            <p className={`text-xs font-medium ${rec.color}`}>{rec.label}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Combined Estimate */}
                  {results.data.combinedEstimate && (
                    <div className="p-4 bg-surface-primary/50 rounded-lg">
                      <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-accent-success" />
                        Combined Estimate
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-text-muted">Repair Cost</p>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(results.data.combinedEstimate.totalRepairLow)} - {formatCurrency(results.data.combinedEstimate.totalRepairHigh)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Replacement Cost</p>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(results.data.combinedEstimate.totalReplacementLow)} - {formatCurrency(results.data.combinedEstimate.totalReplacementHigh)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-text-muted">
                        {results.data.combinedEstimate.overallRecommendation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Individual Results */}
                <div className="space-y-3">
                  {results.data.analyses.map((analysis, index) => (
                    <AnalysisResultCard
                      key={analysis.id}
                      analysis={analysis}
                      index={index}
                      isExpanded={expandedResult === analysis.id}
                      onToggle={() => setExpandedResult(
                        expandedResult === analysis.id ? null : analysis.id
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            {step === "select" && (
              <>
                <p className="text-sm text-text-muted">
                  {selectedPhotoIds.length + uploadedPhotos.length} photo(s) selected
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={selectedPhotoIds.length === 0 && uploadedPhotos.length === 0}
                >
                  <Zap className="w-4 h-4" />
                  Analyze with AI
                </Button>
              </>
            )}
            {step === "analyzing" && (
              <p className="text-sm text-text-muted ml-auto">This may take a moment...</p>
            )}
            {step === "results" && (
              <>
                <Button variant="outline" onClick={() => setStep("select")}>
                  Analyze More
                </Button>
                <Button onClick={handleClose}>Done</Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// AnalysisResultCard Component
// ============================================================

function AnalysisResultCard({
  analysis,
  index,
  isExpanded,
  onToggle,
}: {
  analysis: DamageAnalysisResult;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severity = severityConfig[analysis.overallSeverity] || severityConfig.none;

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-xs text-text-muted">
            {index + 1}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-text-primary">
              Photo Analysis #{index + 1}
            </p>
            <p className="text-xs text-text-muted">
              {analysis.damageTypes.length} damage type(s) • {analysis.confidenceScore}% confidence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${severity.bg} ${severity.color}`}>{severity.label}</Badge>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Damage Types */}
              {analysis.damageTypes.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Detected Damage
                  </h5>
                  <div className="space-y-2">
                    {analysis.damageTypes.map((damage, i) => (
                      <div key={i} className="p-3 bg-surface-secondary/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary capitalize">
                            {damage.type.replace(/-/g, " ")}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {damage.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-muted mb-2">{damage.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">
                            {damage.location} • {damage.affectedArea}
                          </span>
                          <span className="text-accent-success font-medium">
                            {formatCurrency(damage.estimatedCost.low)} - {formatCurrency(damage.estimatedCost.high)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-text-muted">Repair Cost</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(analysis.estimate.repairCost.mid)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Range: {formatCurrency(analysis.estimate.repairCost.low)} - {formatCurrency(analysis.estimate.repairCost.high)}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-text-muted">Replacement Cost</span>
                  </div>
                  <p className="text-lg font-bold text-blue-400">
                    {formatCurrency(analysis.estimate.replacementCost.mid)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Range: {formatCurrency(analysis.estimate.replacementCost.low)} - {formatCurrency(analysis.estimate.replacementCost.high)}
                  </p>
                </div>
              </div>

              {/* Observations & Recommendations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Observations
                  </h5>
                  <ul className="space-y-1">
                    {analysis.observations.slice(0, 4).map((obs, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-1">
                        <span className="text-accent-primary mt-1">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Recommendations
                  </h5>
                  <ul className="space-y-1">
                    {analysis.recommendations.slice(0, 4).map((rec, i) => (
                      <li key={i} className="text-xs text-text-muted flex items-start gap-1">
                        <span className="text-accent-success mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Claim Justification */}
              <div className="p-3 bg-surface-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <span className="text-xs font-medium text-text-primary">Claim Assessment</span>
                </div>
                <p className="text-xs text-text-muted">{analysis.claimJustification}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getMostSevere(severities: string[]): string {
  const order = ["critical", "severe", "moderate", "minor", "none"];
  for (const level of order) {
    if (severities.includes(level)) return level;
  }
  return "none";
}

export default DamageAnalyzerModal;
