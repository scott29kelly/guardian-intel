"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Home, Shield, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customer: CustomerFormData) => void;
}

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  roofType: string;
  roofAge: number;
  insuranceCarrier: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "PA",
  zipCode: "",
  propertyType: "Single Family",
  roofType: "Architectural Shingle",
  roofAge: 10,
  insuranceCarrier: "",
  notes: "",
};

export function AddCustomerModal({ isOpen, onClose, onAdd }: AddCustomerModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"contact" | "property" | "insurance">("contact");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      showToast("error", "Required Fields", "Please enter first and last name");
      return;
    }

    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onAdd(formData);
    setFormData(initialFormData);
    setIsSaving(false);
    onClose();
    showToast("success", "Customer Added", `${formData.firstName} ${formData.lastName} has been added to your pipeline`);
  };

  const updateField = (field: keyof CustomerFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
              <User className="w-5 h-5 text-accent-primary" />
              Add New Customer
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: "contact", label: "Contact Info", icon: User },
              { id: "property", label: "Property", icon: Home },
              { id: "insurance", label: "Insurance", icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                  activeTab === tab.id
                    ? "text-accent-primary border-b-2 border-accent-primary bg-[hsl(var(--accent-primary)/0.05)]"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {activeTab === "contact" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">First Name *</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Last Name *</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => updateField("lastName", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="Smith"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="Southampton"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">State</label>
                      <select
                        value={formData.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        <option value="PA">Pennsylvania</option>
                        <option value="NJ">New Jersey</option>
                        <option value="DE">Delaware</option>
                        <option value="MD">Maryland</option>
                        <option value="VA">Virginia</option>
                        <option value="NY">New York</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => updateField("zipCode", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="18966"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "property" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Property Type</label>
                      <select
                        value={formData.propertyType}
                        onChange={(e) => updateField("propertyType", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        <option value="Single Family">Single Family</option>
                        <option value="Multi-Family">Multi-Family</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Roof Type</label>
                      <select
                        value={formData.roofType}
                        onChange={(e) => updateField("roofType", e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        <option value="Architectural Shingle">Architectural Shingle</option>
                        <option value="3-Tab Shingle">3-Tab Shingle</option>
                        <option value="Metal">Metal</option>
                        <option value="Tile">Tile</option>
                        <option value="Flat/TPO">Flat/TPO</option>
                        <option value="Slate">Slate</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Roof Age (years)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.roofAge}
                      onChange={(e) => updateField("roofAge", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </>
              )}

              {activeTab === "insurance" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Insurance Carrier</label>
                    <select
                      value={formData.insuranceCarrier}
                      onChange={(e) => updateField("insuranceCarrier", e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                    >
                      <option value="">Select carrier...</option>
                      <option value="State Farm">State Farm</option>
                      <option value="Allstate">Allstate</option>
                      <option value="Progressive">Progressive</option>
                      <option value="USAA">USAA</option>
                      <option value="Nationwide">Nationwide</option>
                      <option value="Liberty Mutual">Liberty Mutual</option>
                      <option value="Farmers">Farmers</option>
                      <option value="American Family">American Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
                      placeholder="Any additional notes about this customer..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Add Customer
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
