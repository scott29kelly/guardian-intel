"use client";

/**
 * CustomerClaimsTab Component
 * 
 * Displays claims for a specific customer within the customer profile modal.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClaims, type ClaimStatus } from "@/lib/hooks/use-claims";
import { ClaimDetailsModal } from "./claim-details-modal";
import { AddClaimModal } from "./add-claim-modal";
import { formatCurrency } from "@/lib/utils";

interface CustomerClaimsTabProps {
  customerId: string;
  customerName: string;
}

const statusConfig: Record<ClaimStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-slate-500/20 text-slate-400", icon: Clock },
  filed: { label: "Filed", color: "bg-blue-500/20 text-blue-400", icon: Shield },
  "adjuster-assigned": { label: "Adjuster Assigned", color: "bg-violet-500/20 text-violet-400", icon: Shield },
  "inspection-scheduled": { label: "Inspection", color: "bg-amber-500/20 text-amber-400", icon: Calendar },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  denied: { label: "Denied", color: "bg-rose-500/20 text-rose-400", icon: XCircle },
  supplement: { label: "Supplement", color: "bg-orange-500/20 text-orange-400", icon: AlertTriangle },
  paid: { label: "Paid", color: "bg-green-500/20 text-green-400", icon: DollarSign },
  closed: { label: "Closed", color: "bg-gray-500/20 text-gray-400", icon: CheckCircle },
};

const claimTypeLabels: Record<string, string> = {
  roof: "Roof",
  siding: "Siding",
  gutters: "Gutters",
  "full-exterior": "Full Exterior",
  interior: "Interior",
};

export function CustomerClaimsTab({ customerId, customerName }: CustomerClaimsTabProps) {
  const { data: claimsData, isLoading } = useClaims({ customerId });
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const claims = claimsData?.data || [];

  // Calculate totals
  const totalEstimated = claims.reduce((sum, c) => sum + (c.initialEstimate || 0), 0);
  const totalApproved = claims.reduce((sum, c) => sum + (c.approvedValue || 0), 0);
  const totalPaid = claims.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        <span className="ml-2 text-text-muted">Loading claims...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {claims.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-text-muted mb-1">Total Estimated</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(totalEstimated)}</p>
          </div>
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-text-muted mb-1">Total Approved</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalApproved)}</p>
          </div>
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-text-muted mb-1">Total Collected</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* Claims List */}
      {claims.length > 0 ? (
        <div className="space-y-3">
          {claims.map((claim) => {
            const config = statusConfig[claim.status];
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-surface-secondary/30 rounded-lg border border-border hover:border-accent-primary/50 cursor-pointer transition-all"
                onClick={() => setSelectedClaimId(claim.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={config.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {claimTypeLabels[claim.claimType]}
                    </Badge>
                  </div>
                  {claim.claimNumber && (
                    <span className="text-xs text-text-muted font-mono">#{claim.claimNumber}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{claim.carrier}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-muted">
                      Est: {claim.initialEstimate ? formatCurrency(claim.initialEstimate) : "-"}
                    </span>
                    <span className="text-emerald-400">
                      Approved: {claim.approvedValue ? formatCurrency(claim.approvedValue) : "-"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Date of Loss: {new Date(claim.dateOfLoss).toLocaleDateString()}</span>
                  {claim.adjusterName && (
                    <span>Adjuster: {claim.adjusterName}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-secondary flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-text-muted" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">No Claims Filed</h3>
          <p className="text-xs text-text-muted mb-4">
            This customer doesn't have any insurance claims yet.
          </p>
        </div>
      )}

      {/* File New Claim Button */}
      <Button 
        onClick={() => setShowAddModal(true)}
        className="w-full"
        variant={claims.length === 0 ? "default" : "outline"}
      >
        <Plus className="w-4 h-4" />
        File New Claim
      </Button>

      {/* Modals */}
      <ClaimDetailsModal
        claimId={selectedClaimId}
        isOpen={!!selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
      />
      
      <AddClaimModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        preselectedCustomerId={customerId}
        preselectedCustomerName={customerName}
      />
    </div>
  );
}

export default CustomerClaimsTab;
