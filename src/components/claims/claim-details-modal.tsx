"use client";

/**
 * ClaimDetailsModal Component
 * 
 * Full claim details view with timeline, financials, and actions.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Edit2,
  Trash2,
  ExternalLink,
  Building,
  Shield,
  TrendingUp,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useClaim, useUpdateClaim, useDeleteClaim, type ClaimStatus } from "@/lib/hooks/use-claims";
import { useToast } from "@/components/ui/toast";

interface ClaimDetailsModalProps {
  claimId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Status configuration
const statusConfig: Record<ClaimStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "text-slate-400", bgColor: "bg-slate-500/20", icon: Clock },
  filed: { label: "Filed", color: "text-blue-400", bgColor: "bg-blue-500/20", icon: FileText },
  "adjuster-assigned": { label: "Adjuster Assigned", color: "text-violet-400", bgColor: "bg-violet-500/20", icon: User },
  "inspection-scheduled": { label: "Inspection Scheduled", color: "text-amber-400", bgColor: "bg-amber-500/20", icon: Calendar },
  approved: { label: "Approved", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircle },
  denied: { label: "Denied", color: "text-rose-400", bgColor: "bg-rose-500/20", icon: XCircle },
  supplement: { label: "Supplement Filed", color: "text-orange-400", bgColor: "bg-orange-500/20", icon: AlertTriangle },
  paid: { label: "Paid", color: "text-green-400", bgColor: "bg-green-500/20", icon: DollarSign },
  closed: { label: "Closed", color: "text-gray-400", bgColor: "bg-gray-500/20", icon: CheckCircle },
};

const statusOrder: ClaimStatus[] = [
  "pending",
  "filed",
  "adjuster-assigned",
  "inspection-scheduled",
  "approved",
  "supplement",
  "paid",
  "closed",
];

const claimTypeLabels: Record<string, string> = {
  roof: "Roof",
  siding: "Siding",
  gutters: "Gutters",
  "full-exterior": "Full Exterior",
  interior: "Interior",
};

export function ClaimDetailsModal({ claimId, isOpen, onClose }: ClaimDetailsModalProps) {
  const { showToast } = useToast();
  const { data: claim, isLoading } = useClaim(claimId);
  const updateClaim = useUpdateClaim();
  const deleteClaim = useDeleteClaim();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!isOpen) return null;

  const config = claim ? statusConfig[claim.status] : statusConfig.pending;
  const StatusIcon = config.icon;

  const handleStatusChange = async (newStatus: ClaimStatus) => {
    if (!claim) return;
    
    try {
      await updateClaim.mutateAsync({ id: claim.id, status: newStatus });
      showToast("success", "Status Updated", `Claim status changed to ${statusConfig[newStatus].label}`);
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleSaveChanges = async () => {
    if (!claim || Object.keys(editData).length === 0) return;
    
    try {
      await updateClaim.mutateAsync({ id: claim.id, ...editData });
      showToast("success", "Claim Updated", "Changes saved successfully");
      setIsEditing(false);
      setEditData({});
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleDelete = async () => {
    if (!claim) return;
    
    try {
      await deleteClaim.mutateAsync(claim.id);
      showToast("success", "Claim Deleted", "The claim has been removed");
      onClose();
    } catch (err) {
      showToast("error", "Delete Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  // Calculate current step in pipeline
  const currentStepIndex = claim ? statusOrder.indexOf(claim.status) : 0;

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-[hsl(var(--surface-primary))] border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {isLoading || !claim ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                      <StatusIcon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        {claim.customer.firstName} {claim.customer.lastName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${config.bgColor} ${config.color}`}>
                          {config.label}
                        </Badge>
                        <span className="text-sm text-text-muted">
                          {claim.carrier} • {claimTypeLabels[claim.claimType]}
                        </span>
                        {claim.claimNumber && (
                          <span className="text-sm text-text-muted font-mono">
                            #{claim.claimNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditData({}); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveChanges} disabled={updateClaim.isPending}>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)}>
                          <Trash2 className="w-4 h-4 text-rose-400" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Status Pipeline */}
                  <div className="p-5 border-b border-border bg-surface-secondary/30">
                    <h3 className="text-sm font-medium text-text-muted mb-3">Claim Progress</h3>
                    <div className="flex items-center gap-1">
                      {statusOrder.filter(s => s !== "denied" && s !== "supplement").map((status, index) => {
                        const isActive = status === claim.status;
                        const isPast = index < currentStepIndex;
                        const statusCfg = statusConfig[status];
                        
                        return (
                          <div key={status} className="flex items-center flex-1">
                            <button
                              onClick={() => handleStatusChange(status)}
                              className={`
                                flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all
                                ${isActive 
                                  ? `${statusCfg.bgColor} ${statusCfg.color} ring-2 ring-offset-2 ring-offset-[hsl(var(--surface-primary))]` 
                                  : isPast 
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-surface-secondary text-text-muted hover:bg-surface-hover"
                                }
                              `}
                              disabled={updateClaim.isPending}
                            >
                              {statusCfg.label}
                            </button>
                            {index < statusOrder.filter(s => s !== "denied" && s !== "supplement").length - 1 && (
                              <ChevronRight className={`w-4 h-4 mx-1 ${isPast ? "text-emerald-400" : "text-text-muted"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Quick status buttons for special states */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("supplement")}
                        className={claim.status === "supplement" ? "bg-orange-500/20 text-orange-400" : ""}
                        disabled={updateClaim.isPending}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        File Supplement
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("denied")}
                        className={claim.status === "denied" ? "bg-rose-500/20 text-rose-400" : "text-rose-400"}
                        disabled={updateClaim.isPending}
                      >
                        <XCircle className="w-3 h-3" />
                        Mark Denied
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 p-5">
                    {/* Left Column - Customer & Property */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer Info
                        </h3>
                        <div className="space-y-2">
                          <p className="text-sm text-text-primary font-medium">
                            {claim.customer.firstName} {claim.customer.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <MapPin className="w-3.5 h-3.5 text-text-muted" />
                            {claim.customer.address}
                            <br />
                            {claim.customer.city}, {claim.customer.state} {claim.customer.zipCode}
                          </div>
                          {claim.customer.phone && (
                            <a
                              href={`tel:${claim.customer.phone}`}
                              className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {claim.customer.phone}
                            </a>
                          )}
                          {claim.customer.email && (
                            <a
                              href={`mailto:${claim.customer.email}`}
                              className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {claim.customer.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Adjuster Info */}
                      <div>
                        <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Adjuster
                        </h3>
                        {claim.adjusterName ? (
                          <div className="space-y-2">
                            <p className="text-sm text-text-primary font-medium">
                              {claim.adjusterName}
                            </p>
                            {claim.adjusterCompany && (
                              <p className="text-sm text-text-muted">{claim.adjusterCompany}</p>
                            )}
                            {claim.adjusterPhone && (
                              <a
                                href={`tel:${claim.adjusterPhone}`}
                                className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {claim.adjusterPhone}
                              </a>
                            )}
                            {claim.adjusterEmail && (
                              <a
                                href={`mailto:${claim.adjusterEmail}`}
                                className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {claim.adjusterEmail}
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-text-muted italic">No adjuster assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Middle Column - Financials */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Financial Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Initial Estimate</span>
                            <span className="text-sm font-medium text-text-primary">
                              {claim.initialEstimate ? formatCurrency(claim.initialEstimate) : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Approved Value (RCV)</span>
                            <span className="text-sm font-medium text-emerald-400">
                              {claim.approvedValue ? formatCurrency(claim.approvedValue) : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">ACV</span>
                            <span className="text-sm font-medium text-text-primary">
                              {claim.acv ? formatCurrency(claim.acv) : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Depreciation</span>
                            <span className="text-sm font-medium text-rose-400">
                              {claim.depreciation ? `-${formatCurrency(claim.depreciation)}` : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Deductible</span>
                            <span className="text-sm font-medium text-text-primary">
                              {claim.deductible ? formatCurrency(claim.deductible) : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Supplements</span>
                            <span className="text-sm font-medium text-orange-400">
                              {claim.supplementValue ? formatCurrency(claim.supplementValue) : "-"}
                              {claim.supplementCount > 0 && (
                                <span className="text-text-muted ml-1">({claim.supplementCount})</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-surface-secondary/50 rounded px-2">
                            <span className="text-sm font-medium text-text-primary">Total Paid</span>
                            <span className="text-lg font-bold text-green-400">
                              {claim.totalPaid ? formatCurrency(claim.totalPaid) : "$0"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Dates & Timeline */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Key Dates
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Date of Loss</span>
                            <span className="text-sm text-text-primary">
                              {new Date(claim.dateOfLoss).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <span className="text-sm text-text-muted">Claim Filed</span>
                            <span className="text-sm text-text-primary">
                              {new Date(claim.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {claim.inspectionDate && (
                            <div className="flex justify-between items-center py-2 border-b border-border">
                              <span className="text-sm text-text-muted">Inspection</span>
                              <span className="text-sm text-amber-400">
                                {new Date(claim.inspectionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {claim.reinspectionDate && (
                            <div className="flex justify-between items-center py-2 border-b border-border">
                              <span className="text-sm text-text-muted">Re-inspection</span>
                              <span className="text-sm text-orange-400">
                                {new Date(claim.reinspectionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Activity Timeline */}
                      {claim.statusHistory && claim.statusHistory.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Recent Activity
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {claim.statusHistory.slice(0, 5).map((event) => (
                              <div key={event.id} className="flex gap-2 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2 flex-shrink-0" />
                                <div>
                                  <p className="text-text-secondary">{event.title}</p>
                                  <p className="text-xs text-text-muted">
                                    {new Date(event.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  {claim.notes && (
                    <div className="p-5 border-t border-border">
                      <h3 className="text-sm font-medium text-text-muted mb-2">Notes</h3>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{claim.notes}</p>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/80 flex items-center justify-center z-10"
                    >
                      <div className="bg-surface-primary border border-border rounded-lg p-6 max-w-sm text-center">
                        <Trash2 className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-text-primary mb-2">Delete Claim?</h3>
                        <p className="text-sm text-text-muted mb-4">
                          This action cannot be undone. The claim will be permanently removed.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteClaim.isPending}
                          >
                            {deleteClaim.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ClaimDetailsModal;
