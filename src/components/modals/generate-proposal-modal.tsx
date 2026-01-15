"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Home,
  CloudLightning,
  Shield,
  Zap,
  Package,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProposalPreview, useCreateProposal } from "@/lib/hooks/use-proposals";
import type { GeneratedProposal } from "@/lib/services/proposals/types";

interface GenerateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess?: (proposalId: string) => void;
}

type Step = "configure" | "preview" | "saving";
type MaterialGrade = "economy" | "standard" | "premium" | "luxury";

const MATERIAL_GRADES: { value: MaterialGrade; label: string; description: string; icon: string }[] = [
  { value: "economy", label: "Economy", description: "Basic protection, lowest cost", icon: "💰" },
  { value: "standard", label: "Standard", description: "Popular choice, balanced value", icon: "⭐" },
  { value: "premium", label: "Premium", description: "Enhanced durability & warranty", icon: "🏆" },
  { value: "luxury", label: "Luxury", description: "Top-tier materials & aesthetics", icon: "👑" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function GenerateProposalModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}: GenerateProposalModalProps) {
  const [step, setStep] = useState<Step>("configure");
  const [materialGrade, setMaterialGrade] = useState<MaterialGrade>("standard");
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [discount, setDiscount] = useState<{ amount: number; reason: string } | null>(null);
  const [preview, setPreview] = useState<GeneratedProposal | null>(null);

  const previewMutation = useProposalPreview();
  const createMutation = useCreateProposal();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setMaterialGrade("standard");
      setIncludeInsurance(true);
      setDiscount(null);
      setPreview(null);
    }
  }, [isOpen]);

  const handleGeneratePreview = async () => {
    try {
      const result = await previewMutation.mutateAsync({
        customerId,
        materialGrade,
        includeInsuranceAssistance: includeInsurance,
        customDiscount: discount || undefined,
      });
      setPreview(result);
      setStep("preview");
    } catch (error) {
      console.error("Preview generation failed:", error);
    }
  };

  const handleSaveProposal = async () => {
    setStep("saving");
    try {
      const result = await createMutation.mutateAsync({
        customerId,
        materialGrade,
        includeInsuranceAssistance: includeInsurance,
        customDiscount: discount || undefined,
      });
      onSuccess?.(result.id);
      onClose();
    } catch (error) {
      console.error("Proposal save failed:", error);
      setStep("preview");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl bg-surface-primary border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-accent-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-text-primary">
                  Generate Proposal
                </h2>
                <p className="text-sm text-text-muted">{customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 px-6 py-3 bg-surface-secondary/50 border-b border-border">
            <StepIndicator
              number={1}
              label="Configure"
              active={step === "configure"}
              completed={step === "preview" || step === "saving"}
            />
            <ChevronRight className="w-4 h-4 text-text-muted" />
            <StepIndicator
              number={2}
              label="Preview"
              active={step === "preview"}
              completed={step === "saving"}
            />
            <ChevronRight className="w-4 h-4 text-text-muted" />
            <StepIndicator
              number={3}
              label="Save"
              active={step === "saving"}
              completed={false}
            />
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {step === "configure" && (
              <ConfigureStep
                materialGrade={materialGrade}
                setMaterialGrade={setMaterialGrade}
                includeInsurance={includeInsurance}
                setIncludeInsurance={setIncludeInsurance}
                discount={discount}
                setDiscount={setDiscount}
              />
            )}

            {step === "preview" && preview && (
              <PreviewStep
                preview={preview}
                materialGrade={materialGrade}
                onChangeGrade={(grade) => {
                  setMaterialGrade(grade);
                  setStep("configure");
                }}
              />
            )}

            {step === "saving" && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-accent-primary mb-4" />
                <p className="text-text-primary font-medium">Saving proposal...</p>
                <p className="text-sm text-text-muted mt-1">This may take a moment</p>
              </div>
            )}

            {previewMutation.isError && (
              <div className="flex items-center gap-3 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-lg mt-4">
                <AlertCircle className="w-5 h-5 text-accent-danger flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-accent-danger">Generation Failed</p>
                  <p className="text-xs text-text-muted mt-1">
                    {previewMutation.error instanceof Error
                      ? previewMutation.error.message
                      : "An unexpected error occurred"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-secondary/30">
            <Button variant="outline" onClick={step === "preview" ? () => setStep("configure") : onClose}>
              {step === "preview" ? "Back" : "Cancel"}
            </Button>

            {step === "configure" && (
              <Button
                onClick={handleGeneratePreview}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Preview
                  </>
                )}
              </Button>
            )}

            {step === "preview" && (
              <Button onClick={handleSaveProposal} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Proposal
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
          completed
            ? "bg-accent-success text-white"
            : active
            ? "bg-accent-primary text-white"
            : "bg-surface-secondary text-text-muted"
        }`}
      >
        {completed ? <CheckCircle className="w-4 h-4" /> : number}
      </div>
      <span
        className={`text-sm ${
          active ? "text-text-primary font-medium" : "text-text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ConfigureStep({
  materialGrade,
  setMaterialGrade,
  includeInsurance,
  setIncludeInsurance,
  discount,
  setDiscount,
}: {
  materialGrade: MaterialGrade;
  setMaterialGrade: (grade: MaterialGrade) => void;
  includeInsurance: boolean;
  setIncludeInsurance: (value: boolean) => void;
  discount: { amount: number; reason: string } | null;
  setDiscount: (discount: { amount: number; reason: string } | null) => void;
}) {
  const [showDiscount, setShowDiscount] = useState(!!discount);
  const [discountAmount, setDiscountAmount] = useState(discount?.amount.toString() || "");
  const [discountReason, setDiscountReason] = useState(discount?.reason || "");

  useEffect(() => {
    if (showDiscount && discountAmount && discountReason) {
      setDiscount({ amount: parseFloat(discountAmount), reason: discountReason });
    } else {
      setDiscount(null);
    }
  }, [showDiscount, discountAmount, discountReason, setDiscount]);

  return (
    <div className="space-y-6">
      {/* Material Grade Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          <Package className="w-4 h-4 inline mr-2" />
          Material Grade
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MATERIAL_GRADES.map((grade) => (
            <button
              key={grade.value}
              onClick={() => setMaterialGrade(grade.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                materialGrade === grade.value
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-border hover:border-accent-primary/50 bg-surface-secondary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{grade.icon}</span>
                <span className="font-medium text-text-primary">{grade.label}</span>
                {grade.value === "standard" && (
                  <Badge className="bg-accent-primary/20 text-accent-primary text-xs">
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted">{grade.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Insurance Assistance */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              includeInsurance
                ? "bg-accent-primary border-accent-primary"
                : "border-border"
            }`}
            onClick={() => setIncludeInsurance(!includeInsurance)}
          >
            {includeInsurance && <CheckCircle className="w-3.5 h-3.5 text-white" />}
          </div>
          <div>
            <span className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Include Insurance Claim Assistance
            </span>
            <p className="text-xs text-text-muted">
              Add guidance for filing insurance claims if storm damage applies
            </p>
          </div>
        </label>
      </div>

      {/* Discount */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              showDiscount
                ? "bg-accent-primary border-accent-primary"
                : "border-border"
            }`}
            onClick={() => setShowDiscount(!showDiscount)}
          >
            {showDiscount && <CheckCircle className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="text-sm font-medium text-text-primary flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Apply Discount
          </span>
        </label>

        {showDiscount && (
          <div className="ml-8 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Amount ($)</label>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Reason</label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Referral discount"
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Sources Info */}
      <div className="p-4 bg-surface-secondary/50 rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-primary" />
          Data Sources
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <Home className="w-3.5 h-3.5" />
            Property data & roof details
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <CloudLightning className="w-3.5 h-3.5" />
            Weather & storm events
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Shield className="w-3.5 h-3.5" />
            Insurance information
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <DollarSign className="w-3.5 h-3.5" />
            Regional pricing data
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStep({
  preview,
  materialGrade,
  onChangeGrade,
}: {
  preview: GeneratedProposal;
  materialGrade: MaterialGrade;
  onChangeGrade: (grade: MaterialGrade) => void;
}) {
  const recommended = preview.recommendedOption;

  return (
    <div className="space-y-6">
      {/* Pricing Summary */}
      <div className="p-5 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 rounded-xl border border-accent-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-text-muted mb-1">Recommended Option</p>
            <h3 className="text-xl font-bold text-text-primary">
              {recommended.material.brand} {recommended.material.name}
            </h3>
            <p className="text-sm text-text-muted mt-1">
              {recommended.material.warrantyYears}-year warranty
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted mb-1">Total Investment</p>
            <p className="text-3xl font-bold text-accent-primary">
              {formatCurrency(recommended.breakdown.totalPrice)}
            </p>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-accent-primary/20">
          <div>
            <p className="text-xs text-text-muted">Materials</p>
            <p className="text-sm font-medium text-text-primary">
              {formatCurrency(recommended.breakdown.materialsCost)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Labor</p>
            <p className="text-sm font-medium text-text-primary">
              {formatCurrency(recommended.breakdown.laborCost)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Roof Size</p>
            <p className="text-sm font-medium text-text-primary">
              {recommended.breakdown.roofSquares} squares
            </p>
          </div>
        </div>
      </div>

      {/* Other Options */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">All Pricing Options</h4>
        <div className="space-y-2">
          {preview.pricingOptions.map((option) => (
            <div
              key={option.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                option.isRecommended
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:border-accent-primary/50"
              }`}
              onClick={() => onChangeGrade(option.material.grade)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {MATERIAL_GRADES.find((g) => g.value === option.material.grade)?.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {option.material.name}
                    {option.isRecommended && (
                      <Badge className="ml-2 bg-accent-primary/20 text-accent-primary text-xs">
                        Selected
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-text-muted">
                    {option.material.warrantyYears}-year warranty
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-text-primary">
                {formatCurrency(option.breakdown.totalPrice)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Damage Assessment */}
      <div className="p-4 bg-surface-secondary/50 rounded-lg border border-border">
        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
          <CloudLightning className="w-4 h-4" />
          Damage Assessment
        </h4>
        <p className="text-sm text-text-secondary">
          {preview.damageAssessment.damageDescription}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant={preview.damageAssessment.damageSeverity === "severe" ? "danger" : "secondary"}>
            {preview.damageAssessment.damageSeverity}
          </Badge>
          <span className="text-xs text-text-muted">
            Affected: {preview.damageAssessment.affectedAreas.join(", ")}
          </span>
        </div>
      </div>

      {/* Executive Summary Preview */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-2">Executive Summary Preview</h4>
        <div className="p-4 bg-surface-secondary/30 rounded-lg border border-border max-h-40 overflow-y-auto">
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {preview.aiContent.executiveSummary.substring(0, 500)}
            {preview.aiContent.executiveSummary.length > 500 && "..."}
          </p>
        </div>
      </div>
    </div>
  );
}
