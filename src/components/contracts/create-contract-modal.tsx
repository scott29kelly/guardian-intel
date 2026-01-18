"use client";

/**
 * CreateContractModal Component
 * 
 * Form for creating new contracts.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Loader2,
  DollarSign,
  Calendar,
  Wrench,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateContract, type CreateContractInput } from "@/lib/hooks/use-contracts";
import { useToast } from "@/components/ui/toast";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  claimId?: string;
  defaultAmount?: number;
  onSuccess?: (contractId: string) => void;
}

export function CreateContractModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  claimId,
  defaultAmount,
  onSuccess,
}: CreateContractModalProps) {
  const { showToast } = useToast();
  const createContract = useCreateContract();

  const [form, setForm] = useState<CreateContractInput>({
    customerId,
    claimId,
    title: "Roofing Service Agreement",
    totalAmount: defaultAmount || 0,
    depositPercent: 33,
    balanceDueOn: "completion",
    scopeOfWork: "",
    materials: [],
    warrantyTerms: "5-year workmanship warranty. Manufacturer material warranties apply separately.",
  });

  const [materialInput, setMaterialInput] = useState("");

  const handleAddMaterial = () => {
    if (materialInput.trim()) {
      setForm({
        ...form,
        materials: [...(form.materials || []), materialInput.trim()],
      });
      setMaterialInput("");
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setForm({
      ...form,
      materials: form.materials?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!form.totalAmount || form.totalAmount <= 0) {
      showToast("error", "Validation Error", "Please enter a valid contract amount");
      return;
    }

    try {
      const result = await createContract.mutateAsync(form);
      showToast("success", "Contract Created", `Contract ${result.data.contractNumber} created`);
      onSuccess?.(result.data.id);
      onClose();
    } catch (error) {
      showToast("error", "Create Failed", error instanceof Error ? error.message : "Please try again");
    }
  };

  if (!isOpen) return null;

  const depositAmount = form.totalAmount * ((form.depositPercent || 0) / 100);
  const balanceAmount = form.totalAmount - depositAmount;

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
          className="bg-surface-primary border border-border rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">Create Contract</h2>
                <p className="text-sm text-text-muted">For {customerName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Contract Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Contract Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="number"
                  value={form.totalAmount || ""}
                  onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                />
              </div>
            </div>

            {/* Deposit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Deposit %
                </label>
                <input
                  type="number"
                  value={form.depositPercent || ""}
                  onChange={(e) => setForm({ ...form, depositPercent: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Balance Due
                </label>
                <select
                  value={form.balanceDueOn}
                  onChange={(e) => setForm({ ...form, balanceDueOn: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="completion">Upon Completion</option>
                  <option value="approval">Upon Approval</option>
                  <option value="30-days">Net 30</option>
                </select>
              </div>
            </div>

            {/* Amount Summary */}
            {form.totalAmount > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Deposit at signing:</span>
                  <span className="text-text-primary">${depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-text-muted">Balance ({form.balanceDueOn}):</span>
                  <span className="text-text-primary">${balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Scope of Work */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Scope of Work
              </label>
              <textarea
                value={form.scopeOfWork}
                onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
                placeholder="Describe the work to be performed..."
                rows={4}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary resize-none"
              />
            </div>

            {/* Materials */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Materials
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  placeholder="Add material..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddMaterial()}
                  className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                />
                <Button size="sm" onClick={handleAddMaterial}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.materials?.map((material, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-surface-secondary rounded text-sm flex items-center gap-1"
                  >
                    {material}
                    <button
                      onClick={() => handleRemoveMaterial(i)}
                      className="text-text-muted hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Est. Start Date
                </label>
                <input
                  type="date"
                  value={form.estimatedStartDate || ""}
                  onChange={(e) => setForm({ ...form, estimatedStartDate: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Est. End Date
                </label>
                <input
                  type="date"
                  value={form.estimatedEndDate || ""}
                  onChange={(e) => setForm({ ...form, estimatedEndDate: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                />
              </div>
            </div>

            {/* Warranty */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Warranty Terms
              </label>
              <input
                type="text"
                value={form.warrantyTerms}
                onChange={(e) => setForm({ ...form, warrantyTerms: e.target.value })}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.totalAmount || createContract.isPending}
            >
              {createContract.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Create Contract
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreateContractModal;
