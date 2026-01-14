"use client";

/**
 * FileWithCarrierModal Component
 * 
 * Modal for filing claims directly with insurance carriers via API.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Camera,
  Shield,
  ChevronRight,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFileClaim, useCarrierSupport, type FileClaimInput } from "@/lib/hooks/use-carriers";
import { usePhotos } from "@/lib/hooks/use-photos";
import { useToast } from "@/components/ui/toast";

interface FileWithCarrierModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: {
    id: string;
    carrier: string;
    claimNumber?: string | null;
    dateOfLoss: string;
    claimType: string;
    initialEstimate?: number | null;
    isFiledWithCarrier?: boolean;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    policyNumber?: string | null;
    insuranceCarrier?: string | null;
  };
  onSuccess?: () => void;
}

const causeOfLossOptions = [
  { value: "hail", label: "Hail", icon: "🌨️" },
  { value: "wind", label: "Wind", icon: "💨" },
  { value: "tornado", label: "Tornado", icon: "🌪️" },
  { value: "hurricane", label: "Hurricane", icon: "🌀" },
  { value: "fire", label: "Fire", icon: "🔥" },
  { value: "water", label: "Water Damage", icon: "💧" },
  { value: "lightning", label: "Lightning", icon: "⚡" },
  { value: "fallen-tree", label: "Fallen Tree", icon: "🌲" },
  { value: "other", label: "Other", icon: "❓" },
];

const damageTypeOptions = [
  { value: "roof", label: "Roof" },
  { value: "siding", label: "Siding" },
  { value: "gutters", label: "Gutters" },
  { value: "windows", label: "Windows" },
  { value: "doors", label: "Doors" },
  { value: "interior", label: "Interior" },
  { value: "hvac", label: "HVAC" },
  { value: "fence", label: "Fence" },
  { value: "garage", label: "Garage" },
  { value: "deck", label: "Deck" },
];

export function FileWithCarrierModal({
  isOpen,
  onClose,
  claim,
  customer,
  onSuccess,
}: FileWithCarrierModalProps) {
  const { showToast } = useToast();
  const carrierCode = claim.carrier.toLowerCase().replace(/\s+/g, "-");
  const { supportsDirectFiling, carrier } = useCarrierSupport(claim.carrier);
  const fileClaim = useFileClaim(carrierCode);
  
  const { data: photosData } = usePhotos({ customerId: customer.id, limit: 50 });
  const photos = photosData?.data || [];

  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [formData, setFormData] = useState({
    policyNumber: customer.policyNumber || "",
    causeOfLoss: "hail" as string,
    lossDescription: "",
    damageAreas: [] as Array<{ type: string; severity: "minor" | "moderate" | "severe"; description?: string }>,
    emergencyRepairsNeeded: false,
    temporaryRepairsCost: 0,
    selectedPhotoIds: [] as string[],
  });
  const [result, setResult] = useState<any>(null);

  const handleAddDamageArea = (type: string) => {
    if (formData.damageAreas.some(a => a.type === type)) {
      setFormData({
        ...formData,
        damageAreas: formData.damageAreas.filter(a => a.type !== type),
      });
    } else {
      setFormData({
        ...formData,
        damageAreas: [...formData.damageAreas, { type, severity: "moderate" }],
      });
    }
  };

  const handleUpdateSeverity = (type: string, severity: "minor" | "moderate" | "severe") => {
    setFormData({
      ...formData,
      damageAreas: formData.damageAreas.map(a =>
        a.type === type ? { ...a, severity } : a
      ),
    });
  };

  const togglePhoto = (photoId: string) => {
    setFormData({
      ...formData,
      selectedPhotoIds: formData.selectedPhotoIds.includes(photoId)
        ? formData.selectedPhotoIds.filter(id => id !== photoId)
        : [...formData.selectedPhotoIds, photoId],
    });
  };

  const handleSubmit = async () => {
    if (!formData.policyNumber.trim()) {
      showToast("error", "Missing Policy Number", "Please enter the policy number");
      return;
    }
    if (!formData.lossDescription.trim()) {
      showToast("error", "Missing Description", "Please describe the damage");
      return;
    }
    if (formData.damageAreas.length === 0) {
      showToast("error", "No Damage Selected", "Please select at least one damage area");
      return;
    }

    const input: FileClaimInput = {
      claimId: claim.id,
      policyNumber: formData.policyNumber,
      causeOfLoss: formData.causeOfLoss,
      lossDescription: formData.lossDescription,
      damageAreas: formData.damageAreas,
      emergencyRepairsNeeded: formData.emergencyRepairsNeeded,
      temporaryRepairsCost: formData.temporaryRepairsCost || undefined,
      photoIds: formData.selectedPhotoIds.length > 0 ? formData.selectedPhotoIds : undefined,
    };

    try {
      const response = await fileClaim.mutateAsync(input);
      setResult(response.data);
      setStep("success");
      onSuccess?.();
    } catch (error) {
      showToast(
        "error",
        "Filing Failed",
        error instanceof Error ? error.message : "Please try again"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-primary border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">File Claim with Carrier</h2>
                <p className="text-sm text-text-muted">{carrier?.displayName || claim.carrier}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {claim.isFiledWithCarrier && step === "form" && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Already Filed</p>
                  <p className="text-xs text-text-muted">
                    This claim has already been filed with the carrier. Filing again may create a duplicate.
                  </p>
                </div>
              </div>
            )}

            {step === "form" && (
              <div className="space-y-6">
                {/* Policy Number */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    value={formData.policyNumber}
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    placeholder="Enter policy number"
                  />
                </div>

                {/* Cause of Loss */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Cause of Loss *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {causeOfLossOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormData({ ...formData, causeOfLoss: opt.value })}
                        className={`
                          p-3 rounded-lg border text-left transition-all
                          ${formData.causeOfLoss === opt.value
                            ? "border-accent-primary bg-accent-primary/10"
                            : "border-border hover:border-accent-primary/50"
                          }
                        `}
                      >
                        <span className="text-lg block mb-1">{opt.icon}</span>
                        <span className="text-sm text-text-secondary">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Damage Areas */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Damaged Areas *
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {damageTypeOptions.map((opt) => {
                      const isSelected = formData.damageAreas.some(a => a.type === opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleAddDamageArea(opt.value)}
                          className={`
                            px-3 py-1.5 rounded-lg border text-sm transition-all
                            ${isSelected
                              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                              : "border-border text-text-muted hover:border-accent-primary/50"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Severity for selected areas */}
                  {formData.damageAreas.length > 0 && (
                    <div className="space-y-2 mt-3 p-3 bg-surface-secondary/50 rounded-lg">
                      {formData.damageAreas.map((area) => (
                        <div key={area.type} className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary capitalize">{area.type}</span>
                          <div className="flex gap-1">
                            {(["minor", "moderate", "severe"] as const).map((sev) => (
                              <button
                                key={sev}
                                onClick={() => handleUpdateSeverity(area.type, sev)}
                                className={`
                                  px-2 py-1 rounded text-xs transition-colors
                                  ${area.severity === sev
                                    ? sev === "severe" ? "bg-rose-500/20 text-rose-400"
                                    : sev === "moderate" ? "bg-orange-500/20 text-orange-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                    : "bg-surface-secondary text-text-muted hover:text-text-primary"
                                  }
                                `}
                              >
                                {sev}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Damage Description *
                  </label>
                  <textarea
                    value={formData.lossDescription}
                    onChange={(e) => setFormData({ ...formData, lossDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                    rows={4}
                    placeholder="Describe the damage in detail..."
                  />
                </div>

                {/* Photos */}
                {photos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Attach Photos ({formData.selectedPhotoIds.length} selected)
                    </label>
                    <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                      {photos.slice(0, 18).map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => togglePhoto(photo.id)}
                          className={`
                            aspect-square rounded-lg overflow-hidden border-2 transition-all
                            ${formData.selectedPhotoIds.includes(photo.id)
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
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Repairs */}
                <div className="flex items-center justify-between p-3 bg-surface-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Emergency repairs needed?</p>
                    <p className="text-xs text-text-muted">Did you make any temporary repairs?</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, emergencyRepairsNeeded: !formData.emergencyRepairsNeeded })}
                    className={`
                      w-12 h-6 rounded-full transition-colors relative
                      ${formData.emergencyRepairsNeeded ? "bg-accent-primary" : "bg-surface-secondary border border-border"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${formData.emergencyRepairsNeeded ? "left-7" : "left-1"}
                      `}
                    />
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="space-y-4">
                <div className="p-4 bg-surface-secondary/50 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Customer</span>
                    <span className="text-text-primary">{customer.firstName} {customer.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Policy #</span>
                    <span className="text-text-primary">{formData.policyNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date of Loss</span>
                    <span className="text-text-primary">{new Date(claim.dateOfLoss).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Cause</span>
                    <span className="text-text-primary capitalize">{formData.causeOfLoss}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Damage Areas</span>
                    <span className="text-text-primary">
                      {formData.damageAreas.map(a => a.type).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Photos</span>
                    <span className="text-text-primary">{formData.selectedPhotoIds.length} attached</span>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-text-muted">
                    By submitting, you confirm the information is accurate. The carrier will process this claim and you'll receive status updates automatically.
                  </p>
                </div>
              </div>
            )}

            {step === "success" && result && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">Claim Filed Successfully!</h3>
                <p className="text-text-muted mb-6">
                  {result.statusMessage || "Your claim has been submitted to the carrier."}
                </p>
                
                <div className="p-4 bg-surface-secondary/50 rounded-lg text-left space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Claim Number</span>
                    <span className="text-text-primary font-mono">{result.claimNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Status</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400">{result.status}</Badge>
                  </div>
                  {result.assignedAdjuster && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Adjuster</span>
                      <span className="text-text-primary">{result.assignedAdjuster.name}</span>
                    </div>
                  )}
                  {result.estimatedResponseDate && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Est. Response</span>
                      <span className="text-text-primary">
                        {new Date(result.estimatedResponseDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {result.nextSteps && result.nextSteps.length > 0 && (
                  <div className="text-left mb-6">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Next Steps:</h4>
                    <ul className="space-y-1">
                      {result.nextSteps.map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                          <ChevronRight className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.trackingUrl && (
                  <a
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent-primary hover:underline"
                  >
                    Track on Carrier Website
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            {step === "form" && (
              <>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep("review")}>
                  Review Submission
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" onClick={() => setStep("form")}>Back</Button>
                <Button onClick={handleSubmit} disabled={fileClaim.isPending}>
                  {fileClaim.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Filing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit to {carrier?.displayName || claim.carrier}
                    </>
                  )}
                </Button>
              </>
            )}
            {step === "success" && (
              <Button onClick={onClose} className="ml-auto">Done</Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FileWithCarrierModal;
