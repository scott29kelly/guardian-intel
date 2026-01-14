"use client";

/**
 * AddClaimModal Component
 * 
 * Form for creating a new insurance claim.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateClaim, type CreateClaimInput, type ClaimStatus } from "@/lib/hooks/use-claims";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useToast } from "@/components/ui/toast";

interface AddClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
  preselectedCustomerName?: string;
}

const claimTypes = [
  { value: "roof", label: "Roof" },
  { value: "siding", label: "Siding" },
  { value: "gutters", label: "Gutters" },
  { value: "full-exterior", label: "Full Exterior" },
  { value: "interior", label: "Interior" },
];

const commonCarriers = [
  "State Farm",
  "Allstate",
  "Progressive",
  "USAA",
  "Liberty Mutual",
  "Farmers",
  "Nationwide",
  "Travelers",
  "American Family",
  "Erie Insurance",
  "Other",
];

export function AddClaimModal({
  isOpen,
  onClose,
  preselectedCustomerId,
  preselectedCustomerName,
}: AddClaimModalProps) {
  const { showToast } = useToast();
  const createClaim = useCreateClaim();
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    carrier?: string;
  } | null>(preselectedCustomerId ? { id: preselectedCustomerId, name: preselectedCustomerName || "" } : null);
  
  // Fetch customers for search
  const { data: customersData } = useCustomers({
    search: customerSearch,
    limit: 10,
  });
  
  // Form state
  const [formData, setFormData] = useState<{
    carrier: string;
    customCarrier: string;
    dateOfLoss: string;
    claimType: "roof" | "siding" | "gutters" | "full-exterior" | "interior";
    claimNumber: string;
    initialEstimate: string;
    deductible: string;
    adjusterName: string;
    adjusterPhone: string;
    adjusterEmail: string;
    adjusterCompany: string;
    inspectionDate: string;
    notes: string;
  }>({
    carrier: "",
    customCarrier: "",
    dateOfLoss: new Date().toISOString().split("T")[0],
    claimType: "roof",
    claimNumber: "",
    initialEstimate: "",
    deductible: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    adjusterCompany: "",
    inspectionDate: "",
    notes: "",
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (preselectedCustomerId) {
        setSelectedCustomer({ id: preselectedCustomerId, name: preselectedCustomerName || "" });
      }
    } else {
      setFormData({
        carrier: "",
        customCarrier: "",
        dateOfLoss: new Date().toISOString().split("T")[0],
        claimType: "roof",
        claimNumber: "",
        initialEstimate: "",
        deductible: "",
        adjusterName: "",
        adjusterPhone: "",
        adjusterEmail: "",
        adjusterCompany: "",
        inspectionDate: "",
        notes: "",
      });
      setSelectedCustomer(preselectedCustomerId ? { id: preselectedCustomerId, name: preselectedCustomerName || "" } : null);
      setCustomerSearch("");
    }
  }, [isOpen, preselectedCustomerId, preselectedCustomerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      showToast("error", "Customer Required", "Please select a customer for this claim");
      return;
    }
    
    const carrier = formData.carrier === "Other" ? formData.customCarrier : formData.carrier;
    if (!carrier) {
      showToast("error", "Carrier Required", "Please select or enter an insurance carrier");
      return;
    }

    const input: CreateClaimInput = {
      customerId: selectedCustomer.id,
      carrier,
      dateOfLoss: formData.dateOfLoss,
      claimType: formData.claimType,
      claimNumber: formData.claimNumber || undefined,
      initialEstimate: formData.initialEstimate ? parseFloat(formData.initialEstimate) : undefined,
      deductible: formData.deductible ? parseFloat(formData.deductible) : undefined,
      adjusterName: formData.adjusterName || undefined,
      adjusterPhone: formData.adjusterPhone || undefined,
      adjusterEmail: formData.adjusterEmail || undefined,
      adjusterCompany: formData.adjusterCompany || undefined,
      inspectionDate: formData.inspectionDate || undefined,
      notes: formData.notes || undefined,
    };

    try {
      await createClaim.mutateAsync(input);
      showToast("success", "Claim Created", `Insurance claim for ${selectedCustomer.name} has been filed`);
      onClose();
    } catch (err) {
      showToast("error", "Failed to Create Claim", err instanceof Error ? err.message : "Please try again");
    }
  };

  const selectCustomer = (customer: { id: string; firstName: string; lastName: string; insuranceCarrier: string | null }) => {
    setSelectedCustomer({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      carrier: customer.insuranceCarrier || undefined,
    });
    // Pre-fill carrier if customer has one
    if (customer.insuranceCarrier) {
      const matchingCarrier = commonCarriers.find(
        c => c.toLowerCase() === customer.insuranceCarrier?.toLowerCase()
      );
      if (matchingCarrier) {
        setFormData(prev => ({ ...prev, carrier: matchingCarrier }));
      } else {
        setFormData(prev => ({ ...prev, carrier: "Other", customCarrier: customer.insuranceCarrier || "" }));
      }
    }
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[90vh] bg-[hsl(var(--surface-primary))] border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">File New Claim</h2>
                  <p className="text-sm text-text-muted">Create an insurance claim for a customer</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Customer *
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-surface-secondary border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-text-muted" />
                      <span className="text-text-primary font-medium">{selectedCustomer.name}</span>
                    </div>
                    {!preselectedCustomerId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Change
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search for customer..."
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                    
                    {/* Customer Dropdown */}
                    {showCustomerDropdown && customersData?.data && customersData.data.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface-primary border border-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                        {customersData.data.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover text-left transition-colors"
                          >
                            <User className="w-4 h-4 text-text-muted flex-shrink-0" />
                            <div>
                              <p className="text-sm text-text-primary">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-xs text-text-muted">
                                {customer.city}, {customer.state}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Claim Type & Carrier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Claim Type *
                  </label>
                  <select
                    value={formData.claimType}
                    onChange={(e) => setFormData(prev => ({ ...prev, claimType: e.target.value as typeof prev.claimType }))}
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                  >
                    {claimTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Insurance Carrier *
                  </label>
                  <select
                    value={formData.carrier}
                    onChange={(e) => setFormData(prev => ({ ...prev, carrier: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                  >
                    <option value="">Select carrier...</option>
                    {commonCarriers.map((carrier) => (
                      <option key={carrier} value={carrier}>
                        {carrier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Carrier */}
              {formData.carrier === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Carrier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customCarrier}
                    onChange={(e) => setFormData(prev => ({ ...prev, customCarrier: e.target.value }))}
                    placeholder="Enter carrier name"
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                  />
                </div>
              )}

              {/* Date of Loss & Claim Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Date of Loss *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfLoss}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfLoss: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Claim Number
                  </label>
                  <input
                    type="text"
                    value={formData.claimNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, claimNumber: e.target.value }))}
                    placeholder="e.g., CLM-2026-12345"
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                  />
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                    Initial Estimate
                  </label>
                  <input
                    type="number"
                    value={formData.initialEstimate}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialEstimate: e.target.value }))}
                    placeholder="15000"
                    min="0"
                    step="100"
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Deductible
                  </label>
                  <input
                    type="number"
                    value={formData.deductible}
                    onChange={(e) => setFormData(prev => ({ ...prev, deductible: e.target.value }))}
                    placeholder="1000"
                    min="0"
                    step="100"
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                  />
                </div>
              </div>

              {/* Adjuster Section */}
              <div className="p-4 bg-surface-secondary/30 rounded-lg border border-border">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-text-muted" />
                  Adjuster Information (Optional)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Adjuster Name</label>
                    <input
                      type="text"
                      value={formData.adjusterName}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjusterName: e.target.value }))}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.adjusterCompany}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjusterCompany: e.target.value }))}
                      placeholder="Adjusters Inc."
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.adjusterPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjusterPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.adjusterEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjusterEmail: e.target.value }))}
                      placeholder="adjuster@company.com"
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block text-xs text-text-muted mb-1">Inspection Date</label>
                  <input
                    type="date"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspectionDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about this claim..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 resize-none"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-surface-secondary/30">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createClaim.isPending || !selectedCustomer}>
                {createClaim.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Filing Claim...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    File Claim
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AddClaimModal;
