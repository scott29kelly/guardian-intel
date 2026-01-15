"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Target, 
  Loader2, 
  CheckCircle,
  Eye,
  DollarSign,
  Trophy,
  Skull,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useCompetitors, useLogCompetitorActivity } from "@/lib/hooks";
import type { ActivityType, PriceComparison } from "@/lib/services/competitors/types";

interface CompetitorActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerAddress?: {
    city?: string;
    state?: string;
    zip?: string;
  };
}

const activityTypes: { value: ActivityType; label: string; icon: typeof Eye; description: string }[] = [
  { value: "quote", label: "Quote Intel", icon: DollarSign, description: "Customer mentioned competitor's quote" },
  { value: "won_deal", label: "Won Against", icon: Trophy, description: "We won this customer against competitor" },
  { value: "lost_deal", label: "Lost To", icon: Skull, description: "We lost this customer to competitor" },
  { value: "sighting", label: "Competitor Sighting", icon: Eye, description: "Saw competitor at this address" },
  { value: "canvassing", label: "Canvassing", icon: MapPin, description: "Competitor was canvassing this area" },
];

export function CompetitorActivityModal({ 
  isOpen, 
  onClose, 
  customerId, 
  customerName,
  customerAddress 
}: CompetitorActivityModalProps) {
  const { showToast } = useToast();
  const logActivity = useLogCompetitorActivity();
  const { data: competitorsData } = useCompetitors({ isActive: true, limit: 50 });
  const competitors = competitorsData?.data || [];

  const [formData, setFormData] = useState({
    competitorId: "",
    activityType: "quote" as ActivityType,
    description: "",
    quotedPrice: "",
    priceComparison: "" as "" | PriceComparison,
    outcomeReason: "",
    dealValue: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.competitorId) {
      showToast("error", "Select Competitor", "Please select a competitor");
      return;
    }

    try {
      await logActivity.mutateAsync({
        competitorId: formData.competitorId,
        customerId,
        activityType: formData.activityType,
        city: customerAddress?.city || undefined,
        state: customerAddress?.state || undefined,
        zipCode: customerAddress?.zip || undefined,
        description: formData.description || undefined,
        quotedPrice: formData.quotedPrice ? parseFloat(formData.quotedPrice) : undefined,
        priceComparison: formData.priceComparison || undefined,
        outcomeReason: formData.outcomeReason || undefined,
        dealValue: formData.dealValue ? parseFloat(formData.dealValue) : undefined,
      });
      
      showToast("success", "Activity Logged", "Competitor intel has been recorded");
      onClose();
      setFormData({
        competitorId: "",
        activityType: "quote",
        description: "",
        quotedPrice: "",
        priceComparison: "",
        outcomeReason: "",
        dealValue: "",
      });
    } catch (err) {
      showToast("error", "Failed", err instanceof Error ? err.message : "Could not log activity");
    }
  };

  if (!isOpen) return null;

  const selectedActivity = activityTypes.find(a => a.value === formData.activityType);

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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-surface-primary border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-text-primary">Log Competitor Intel</h2>
                <p className="text-sm text-text-muted truncate max-w-[200px]">
                  {customerName}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Activity Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Activity Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activityTypes.slice(0, 4).map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.activityType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(d => ({ ...d, activityType: type.value }))}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                          : "border-border bg-surface-secondary/30 text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${
                        type.value === "won_deal" ? "text-emerald-400" :
                        type.value === "lost_deal" ? "text-rose-400" :
                        isSelected ? "text-accent-primary" : ""
                      }`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-muted mt-2">{selectedActivity?.description}</p>
            </div>

            {/* Competitor Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Competitor *
              </label>
              <select
                value={formData.competitorId}
                onChange={(e) => setFormData(d => ({ ...d, competitorId: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
              >
                <option value="">Select competitor...</option>
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName || c.name}
                  </option>
                ))}
              </select>
              {competitors.length === 0 && (
                <p className="text-xs text-text-muted mt-1">
                  No competitors yet. Add them in the Competitors dashboard.
                </p>
              )}
            </div>

            {/* Quote-specific fields */}
            {(formData.activityType === "quote") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Their Quote
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      type="number"
                      value={formData.quotedPrice}
                      onChange={(e) => setFormData(d => ({ ...d, quotedPrice: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                      placeholder="12,500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    vs Our Price
                  </label>
                  <select
                    value={formData.priceComparison}
                    onChange={(e) => setFormData(d => ({ ...d, priceComparison: e.target.value as PriceComparison }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  >
                    <option value="">Unknown</option>
                    <option value="lower">Lower than us</option>
                    <option value="similar">Similar</option>
                    <option value="higher">Higher than us</option>
                  </select>
                </div>
              </div>
            )}

            {/* Win/Loss specific fields */}
            {(formData.activityType === "won_deal" || formData.activityType === "lost_deal") && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {formData.activityType === "won_deal" ? "Why We Won" : "Why We Lost"}
                  </label>
                  <select
                    value={formData.outcomeReason}
                    onChange={(e) => setFormData(d => ({ ...d, outcomeReason: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                  >
                    <option value="">Select reason...</option>
                    <option value="Price">Price</option>
                    <option value="Quality/Materials">Quality/Materials</option>
                    <option value="Reputation/Reviews">Reputation/Reviews</option>
                    <option value="Response Time">Response Time</option>
                    <option value="Warranty">Warranty</option>
                    <option value="Insurance Expertise">Insurance Expertise</option>
                    <option value="Personal Connection">Personal Connection</option>
                    <option value="Availability/Timing">Availability/Timing</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Deal Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      type="number"
                      value={formData.dealValue}
                      onChange={(e) => setFormData(d => ({ ...d, dealValue: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                      placeholder="15,000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Notes
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(d => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary resize-none h-20"
                placeholder="Any additional details about this competitor encounter..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={logActivity.isPending || !formData.competitorId}
              >
                {logActivity.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Log Intel
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
