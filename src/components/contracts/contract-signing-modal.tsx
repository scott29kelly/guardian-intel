"use client";

/**
 * ContractSigningModal Component
 * 
 * Full contract signing flow with e-signature capture.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Check,
  Loader2,
  MapPin,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  PenTool,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, InitialsPad } from "./signature-pad";
import {
  useContract,
  useSignContract,
  useSendContract,
  type Contract,
} from "@/lib/hooks/use-contracts";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

interface ContractSigningModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
  onSigned?: () => void;
  mode?: "view" | "sign" | "present"; // present = on-site signing flow
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: "text-slate-400", bg: "bg-slate-500/20", label: "Draft" },
  sent: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Sent" },
  viewed: { color: "text-amber-400", bg: "bg-amber-500/20", label: "Viewed" },
  signed: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Signed" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Completed" },
  cancelled: { color: "text-rose-400", bg: "bg-rose-500/20", label: "Cancelled" },
  expired: { color: "text-rose-400", bg: "bg-rose-500/20", label: "Expired" },
};

export function ContractSigningModal({
  contractId,
  isOpen,
  onClose,
  onSigned,
  mode = "view",
}: ContractSigningModalProps) {
  const { showToast } = useToast();
  const { data: contract, isLoading } = useContract(contractId);
  const signContract = useSignContract(contractId);
  const sendContract = useSendContract(contractId);

  const [step, setStep] = useState<"review" | "terms" | "sign" | "success">("review");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showFullContract, setShowFullContract] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [initials, setInitials] = useState<string>("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  // Get location for on-site signing
  useEffect(() => {
    if (mode === "present" && isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          
          // Reverse geocode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`
            );
            const data = await response.json();
            setLocation({
              ...loc,
              address: data.display_name,
            });
          } catch {
            setLocation(loc);
          }
        },
        () => {
          // Location denied
        }
      );
    }
  }, [mode, isOpen]);

  const handleSign = async () => {
    if (!signature) {
      showToast("error", "Signature Required", "Please sign the contract");
      return;
    }

    try {
      await signContract.mutateAsync({
        signature,
        initials,
        latitude: location?.latitude,
        longitude: location?.longitude,
        address: location?.address,
      });

      setStep("success");
      onSigned?.();
      showToast("success", "Contract Signed!", "The contract has been signed successfully");
    } catch (error) {
      showToast("error", "Signing Failed", error instanceof Error ? error.message : "Please try again");
    }
  };

  const handleSendAndSign = async () => {
    try {
      await sendContract.mutateAsync("in-person");
      setStep("terms");
    } catch (error) {
      showToast("error", "Failed", "Could not prepare contract for signing");
    }
  };

  const handleClose = () => {
    setStep("review");
    setTermsAccepted(false);
    setSignature("");
    setInitials("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-primary border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">
                  {step === "success" ? "Contract Signed!" : contract?.title || "Contract"}
                </h2>
                <p className="text-sm text-text-muted">
                  {contract?.contractNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {contract && (
                <Badge className={`${statusConfig[contract.status]?.bg} ${statusConfig[contract.status]?.color}`}>
                  {statusConfig[contract.status]?.label}
                </Badge>
              )}
              <button onClick={handleClose} className="p-2 hover:bg-surface-hover rounded-lg">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
            ) : !contract ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <p className="text-text-muted">Contract not found</p>
              </div>
            ) : step === "success" ? (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Contract Signed!</h3>
                <p className="text-text-muted mb-6">
                  {contract.customer?.firstName} {contract.customer?.lastName} has signed the contract.
                </p>
                <div className="inline-block p-4 bg-surface-secondary rounded-lg text-left">
                  <p className="text-sm text-text-muted">Contract Total</p>
                  <p className="text-2xl font-bold text-accent-success">{formatCurrency(contract.totalAmount)}</p>
                  {contract.depositAmount && (
                    <p className="text-sm text-text-muted mt-1">
                      Deposit due: {formatCurrency(contract.depositAmount)}
                    </p>
                  )}
                </div>
                {location?.address && (
                  <p className="mt-4 text-xs text-text-muted flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" /> Signed at {location.address.split(",").slice(0, 2).join(",")}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6">
                {/* Step: Review */}
                {step === "review" && (
                  <div className="space-y-6">
                    {/* Customer & Property Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-surface-secondary rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">Customer</span>
                        </div>
                        <p className="font-medium text-text-primary">
                          {contract.customer?.firstName} {contract.customer?.lastName}
                        </p>
                        <p className="text-sm text-text-muted">{contract.customer?.phone}</p>
                      </div>
                      <div className="p-4 bg-surface-secondary rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">Property</span>
                        </div>
                        <p className="text-sm text-text-primary">
                          {contract.customer?.address}
                        </p>
                        <p className="text-sm text-text-muted">
                          {contract.customer?.city}, {contract.customer?.state}
                        </p>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-text-muted">Contract Total</span>
                        <span className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(contract.totalAmount)}
                        </span>
                      </div>
                      {contract.depositAmount && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Deposit Due at Signing</span>
                          <span className="text-text-primary">{formatCurrency(contract.depositAmount)}</span>
                        </div>
                      )}
                      {contract.depositAmount && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-text-muted">Balance Due ({contract.balanceDueOn})</span>
                          <span className="text-text-primary">
                            {formatCurrency(contract.totalAmount - (contract.depositAmount || 0))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scope of Work */}
                    {contract.scopeOfWork && (
                      <div>
                        <h4 className="text-sm font-medium text-text-primary mb-2">Scope of Work</h4>
                        <div className="p-3 bg-surface-secondary rounded-lg text-sm text-text-muted whitespace-pre-wrap">
                          {contract.scopeOfWork}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                      {contract.estimatedStartDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-text-muted" />
                          <span className="text-sm text-text-muted">Start:</span>
                          <span className="text-sm text-text-primary">
                            {new Date(contract.estimatedStartDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {contract.estimatedEndDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-text-muted" />
                          <span className="text-sm text-text-muted">Completion:</span>
                          <span className="text-sm text-text-primary">
                            {new Date(contract.estimatedEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Full Contract Toggle */}
                    <button
                      onClick={() => setShowFullContract(!showFullContract)}
                      className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-lg text-sm hover:bg-surface-hover transition-colors"
                    >
                      <span className="text-text-primary">View Full Contract</span>
                      {showFullContract ? (
                        <ChevronUp className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showFullContract && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="p-4 bg-white text-gray-800 rounded-lg text-sm max-h-96 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: contract.content }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Step: Terms */}
                {step === "terms" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-text-primary mb-4">Terms & Conditions</h3>
                      <div
                        className="p-4 bg-white text-gray-800 rounded-lg text-sm max-h-80 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: contract.termsContent || "" }}
                      />
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-text-primary">
                        I have read and agree to the terms and conditions above. I understand that this is a legally binding contract.
                      </span>
                    </label>
                  </div>
                )}

                {/* Step: Sign */}
                {step === "sign" && (
                  <div className="space-y-6">
                    <div className="p-4 bg-surface-secondary rounded-lg">
                      <p className="text-sm text-text-muted mb-1">Signing as:</p>
                      <p className="font-medium text-text-primary">
                        {contract.customer?.firstName} {contract.customer?.lastName}
                      </p>
                    </div>

                    {/* Initials */}
                    <InitialsPad
                      onSave={setInitials}
                      label="Your Initials"
                    />

                    {/* Signature */}
                    <SignaturePad
                      onSave={setSignature}
                      onClear={() => setSignature("")}
                      label="Your Signature"
                      placeholder="Sign here with your finger or mouse"
                      required
                    />

                    {/* Location indicator */}
                    {location && (
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        Signing location captured
                      </div>
                    )}

                    {signature && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-sm text-emerald-400 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Signature captured. Click "Sign Contract" to complete.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {contract && step !== "success" && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              {step === "review" && (
                <>
                  <p className="text-sm text-text-muted">
                    {mode === "present" ? "Present to customer for signing" : "Review contract details"}
                  </p>
                  {mode === "present" ? (
                    <Button onClick={handleSendAndSign}>
                      <PenTool className="w-4 h-4" />
                      Start Signing
                    </Button>
                  ) : mode === "sign" ? (
                    <Button onClick={() => setStep("terms")}>
                      Continue to Sign
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                  )}
                </>
              )}

              {step === "terms" && (
                <>
                  <Button variant="outline" onClick={() => setStep("review")}>
                    Back
                  </Button>
                  <Button onClick={() => setStep("sign")} disabled={!termsAccepted}>
                    <PenTool className="w-4 h-4" />
                    Proceed to Sign
                  </Button>
                </>
              )}

              {step === "sign" && (
                <>
                  <Button variant="outline" onClick={() => setStep("terms")}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSign}
                    disabled={!signature || signContract.isPending}
                  >
                    {signContract.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Sign Contract
                  </Button>
                </>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="px-6 py-4 border-t border-border">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ContractSigningModal;
