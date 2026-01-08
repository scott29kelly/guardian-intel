"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Home,
  Shield,
  Calendar,
  User,
  FileText,
  History,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Customer } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CustomerProfileModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

export function CustomerProfileModal({
  customer,
  isOpen,
  onClose,
}: CustomerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "notes">("overview");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col" showClose={false}>
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg"
              style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}
            >
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {customer.firstName} {customer.lastName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="data-badge capitalize">{customer.status}</span>
                <DialogDescription>ID: {customer.id}</DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "history", label: "History", icon: History },
            { id: "notes", label: "Notes", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-all
                  ${activeTab === tab.id 
                    ? "text-accent-primary border-b-2 border-accent-primary bg-surface-secondary/30" 
                    : "text-text-muted hover:text-text-secondary"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Contact & Property Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Contact Info */}
                <div className="panel p-4">
                  <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-accent-primary hover:underline">
                      <Phone className="w-4 h-4" />
                      <span className="font-mono text-sm">{customer.phone}</span>
                    </a>
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-text-secondary hover:text-accent-primary">
                      <Mail className="w-4 h-4" />
                      <span className="font-mono text-sm">{customer.email}</span>
                    </a>
                    <div className="flex items-start gap-3 text-text-secondary">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div className="font-mono text-sm">
                        <p>{customer.address}</p>
                        <p>{customer.city}, {customer.state} {customer.zipCode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Info */}
                <div className="panel p-4">
                  <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Home className="w-3.5 h-3.5" />
                    Property Details
                  </h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Type</span>
                      <span className="text-text-secondary">{customer.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Year Built</span>
                      <span className="text-text-secondary">{customer.yearBuilt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Size</span>
                      <span className="text-text-secondary">{customer.squareFootage.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Roof</span>
                      <span className="text-text-secondary">{customer.roofType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Roof Age</span>
                      <span className={customer.roofAge > 15 ? "text-accent-danger" : "text-text-secondary"}>
                        {customer.roofAge} years
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Value</span>
                      <span className="text-accent-success">{formatCurrency(customer.propertyValue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance & Scores */}
              <div className="grid grid-cols-2 gap-4">
                {/* Insurance */}
                <div className="panel p-4">
                  <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Insurance
                  </h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Carrier</span>
                      <span className="text-text-secondary">{customer.insuranceCarrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Policy Type</span>
                      <span className="text-text-secondary">{customer.policyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Deductible</span>
                      <span className="text-accent-success">{formatCurrency(customer.deductible)}</span>
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="panel p-4">
                  <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
                    Scores & Metrics
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-surface-secondary rounded">
                      <div className="text-2xl font-mono font-bold text-accent-success">{customer.leadScore}</div>
                      <div className="text-[10px] font-mono text-text-muted uppercase">Lead</div>
                    </div>
                    <div className="text-center p-2 bg-surface-secondary rounded">
                      <div className="text-2xl font-mono font-bold text-accent-primary">{customer.urgencyScore}</div>
                      <div className="text-[10px] font-mono text-text-muted uppercase">Urgency</div>
                    </div>
                    <div className="text-center p-2 bg-surface-secondary rounded">
                      <div className="text-2xl font-mono font-bold text-accent-warning">{customer.churnRisk}%</div>
                      <div className="text-[10px] font-mono text-text-muted uppercase">Churn</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-text-muted">Profit Potential</span>
                      <span className="font-mono text-lg font-bold text-accent-success">
                        {formatCurrency(customer.profitPotential)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Info */}
              <div className="panel p-4">
                <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Sales Information
                </h3>
                <div className="grid grid-cols-4 gap-4 font-mono text-sm">
                  <div>
                    <span className="text-text-muted block text-xs">Assigned To</span>
                    <span className="text-text-primary">{customer.assignedRep}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs">Stage</span>
                    <span className="text-text-primary capitalize">{customer.stage}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs">Last Contact</span>
                    <span className="text-text-primary">{customer.lastContact.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-xs">Next Action</span>
                    <span className="text-accent-primary">{customer.nextAction}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <p className="text-text-muted font-mono text-sm">Activity history for this customer:</p>
              {/* Mock history items */}
              {[
                { date: "Jan 6, 2026", action: "Proposal sent", type: "email", user: "Sarah Mitchell" },
                { date: "Jan 5, 2026", action: "Follow-up call completed", type: "call", user: "Sarah Mitchell" },
                { date: "Jan 4, 2026", action: "Property inspection scheduled", type: "meeting", user: "Sarah Mitchell" },
                { date: "Jan 2, 2026", action: "Initial contact - interested in roof assessment", type: "call", user: "Sarah Mitchell" },
                { date: "Jan 1, 2026", action: "Lead created from storm alert", type: "system", user: "System" },
              ].map((item, i) => (
                <div key={i} className="panel p-3 flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent-primary" />
                  <div className="flex-1">
                    <p className="font-mono text-sm text-text-primary">{item.action}</p>
                    <p className="font-mono text-xs text-text-muted">{item.user} • {item.date}</p>
                  </div>
                  <span className="data-badge">{item.type}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text-muted font-mono text-sm">Customer notes:</p>
                <button className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                  + Add Note
                </button>
              </div>
              {/* Mock notes */}
              {[
                { date: "Jan 5, 2026", note: "Customer very interested in insurance claim process. Has visible hail damage on north-facing roof slope.", user: "Sarah Mitchell" },
                { date: "Jan 2, 2026", note: "Roof is 24 years old, 3-tab shingles. Multiple storm events in area. High priority for inspection.", user: "System" },
              ].map((item, i) => (
                <div key={i} className="panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-text-muted">{item.user} • {item.date}</span>
                    <button className="text-text-muted hover:text-accent-danger">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-mono text-sm text-text-secondary">{item.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="justify-between">
          <button className="px-4 py-2 text-accent-danger font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-danger)/0.1)] rounded transition-all">
            Delete Customer
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            >
              Close
            </button>
            <a 
              href={`https://maps.google.com/?q=${encodeURIComponent(`${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded font-mono text-xs text-white flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on Map
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
