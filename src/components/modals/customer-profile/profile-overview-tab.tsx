"use client";

import { Phone, Mail, MapPin, Home, Shield, Calendar, Camera } from "lucide-react";
import { Customer } from "@/lib/mock-data";
import { StreetViewPreview } from "@/components/property/street-view-preview";

interface ProfileOverviewTabProps {
  customer: Customer;
  scores: {
    urgencyScore: number;
    retentionScore: number;
    profitPotential: number;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

export function ProfileOverviewTab({ customer, scores }: ProfileOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Street View Preview */}
      <div className="panel p-4">
        <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" />
          Property Street View
        </h3>
        <StreetViewPreview
          address={customer.address}
          city={customer.city}
          state={customer.state}
          zipCode={customer.zipCode}
          height="220px"
          showControls={true}
          showExpandButton={false}
        />
      </div>

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
              <span className="text-text-secondary">{customer.yearBuilt ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Size</span>
              <span className="text-text-secondary">{customer.squareFootage ? `${customer.squareFootage.toLocaleString()} sqft` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Roof</span>
              <span className="text-text-secondary">{customer.roofType ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Roof Age</span>
              <span className={(customer.roofAge ?? 0) > 15 ? "text-accent-danger" : "text-text-secondary"}>
                {customer.roofAge != null ? `${customer.roofAge} years` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Value</span>
              <span className="text-accent-success">{customer.propertyValue ? formatCurrency(customer.propertyValue) : 'N/A'}</span>
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
              <span className="text-text-secondary">{customer.insuranceCarrier ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Policy Type</span>
              <span className="text-text-secondary">{customer.policyType ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Deductible</span>
              <span className="text-accent-success">{customer.deductible ? formatCurrency(customer.deductible) : 'N/A'}</span>
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
            <div className="text-center p-2 bg-surface-secondary rounded cursor-help" title="Priority based on roof age, storms, and timing">
              <div className="text-2xl font-mono font-bold text-accent-primary">{scores.urgencyScore}</div>
              <div className="text-[10px] font-mono text-text-muted uppercase">Urgency</div>
            </div>
            <div className="text-center p-2 bg-surface-secondary rounded cursor-help" title="Likelihood of closing based on engagement">
              <div className="text-2xl font-mono font-bold text-accent-warning">{scores.retentionScore}</div>
              <div className="text-[10px] font-mono text-text-muted uppercase">Retention</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between items-center cursor-help" title={`Based on ${(customer.squareFootage ?? 0).toLocaleString()} sqft, ${customer.roofType ?? 'unknown'}`}>
              <span className="font-mono text-xs text-text-muted">Est. Profit</span>
              <span className="font-mono text-lg font-bold text-accent-success">
                {formatCurrency(scores.profitPotential)}
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
            <span className="text-text-primary">{typeof customer.assignedRep === 'object' ? customer.assignedRep?.name : customer.assignedRep ?? 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Stage</span>
            <span className="text-text-primary capitalize">{customer.stage}</span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Last Contact</span>
            <span className="text-text-primary">{new Date((customer as any).lastContact || (customer as any).updatedAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Next Action</span>
            <span className="text-accent-primary">{(customer as any).nextAction || 'No action scheduled'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
