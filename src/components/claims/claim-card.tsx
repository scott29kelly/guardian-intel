"use client";

/**
 * ClaimCard Component
 * 
 * Displays a claim in a card format for kanban or list views.
 */

import { motion } from "framer-motion";
import {
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
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Claim, ClaimStatus } from "@/lib/hooks/use-claims";

interface ClaimCardProps {
  claim: Claim;
  onClick?: () => void;
  compact?: boolean;
  draggable?: boolean;
}

// Status configuration
const statusConfig: Record<ClaimStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: Clock },
  filed: { label: "Filed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: FileText },
  "adjuster-assigned": { label: "Adjuster Assigned", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: User },
  "inspection-scheduled": { label: "Inspection Scheduled", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Calendar },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  denied: { label: "Denied", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", icon: XCircle },
  supplement: { label: "Supplement", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  paid: { label: "Paid", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: DollarSign },
  closed: { label: "Closed", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: CheckCircle },
};

const claimTypeLabels: Record<string, string> = {
  roof: "Roof",
  siding: "Siding",
  gutters: "Gutters",
  "full-exterior": "Full Exterior",
  interior: "Interior",
};

export function ClaimCard({ claim, onClick, compact = false, draggable = false }: ClaimCardProps) {
  const config = statusConfig[claim.status];
  const StatusIcon = config.icon;
  const displayValue = claim.approvedValue ?? claim.initialEstimate ?? 0;
  
  // Calculate days since date of loss
  const daysSinceLoss = Math.floor(
    (Date.now() - new Date(claim.dateOfLoss).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
        className={`
          bg-[hsl(var(--surface-primary))] border border-border rounded-lg p-3
          hover:border-[hsl(var(--border-hover))] cursor-pointer transition-all
          ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        `}
        onClick={onClick}
        draggable={draggable}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {claim.customer.firstName} {claim.customer.lastName}
            </p>
            <p className="text-xs text-text-muted truncate">
              {claim.carrier}
            </p>
          </div>
          {displayValue > 0 && (
            <span className="text-sm font-medium text-accent-success ml-2">
              {formatCurrency(displayValue)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Badge className={`text-[10px] ${config.color}`}>
            {claimTypeLabels[claim.claimType]}
          </Badge>
          <span className="text-[10px] text-text-muted">
            {daysSinceLoss}d ago
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.005 }}
      className={`
        bg-[hsl(var(--surface-primary))] border border-border rounded-lg p-4
        hover:border-[hsl(var(--border-hover))] cursor-pointer transition-all group
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-text-primary truncate">
              {claim.customer.firstName} {claim.customer.lastName}
            </h3>
            {claim.claimNumber && (
              <span className="text-xs text-text-muted font-mono">
                #{claim.claimNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <MapPin className="w-3 h-3" />
            {claim.customer.city}, {claim.customer.state}
          </div>
        </div>
        
        <Badge className={`${config.color} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </Badge>
      </div>

      {/* Carrier & Type */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-text-secondary font-medium">
          {claim.carrier}
        </span>
        <span className="text-text-muted">•</span>
        <Badge variant="secondary" className="text-xs">
          {claimTypeLabels[claim.claimType]}
        </Badge>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-surface-secondary/50 rounded-lg">
        <div className="text-center">
          <p className="text-[10px] text-text-muted uppercase">Estimate</p>
          <p className="text-sm font-medium text-text-primary">
            {claim.initialEstimate ? formatCurrency(claim.initialEstimate) : "-"}
          </p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-[10px] text-text-muted uppercase">Approved</p>
          <p className={`text-sm font-medium ${claim.approvedValue ? "text-accent-success" : "text-text-muted"}`}>
            {claim.approvedValue ? formatCurrency(claim.approvedValue) : "-"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-text-muted uppercase">Paid</p>
          <p className={`text-sm font-medium ${claim.totalPaid ? "text-green-400" : "text-text-muted"}`}>
            {claim.totalPaid ? formatCurrency(claim.totalPaid) : "-"}
          </p>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Loss: {new Date(claim.dateOfLoss).toLocaleDateString()}
          </span>
          {claim.inspectionDate && (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3 h-3" />
              Insp: {new Date(claim.inspectionDate).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {claim.customer.assignedRep && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {claim.customer.assignedRep.name}
          </span>
        )}
      </div>

      {/* Adjuster Info */}
      {claim.adjusterName && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Adjuster:</span>
            <span className="text-text-secondary">{claim.adjusterName}</span>
            {claim.adjusterCompany && (
              <span className="text-text-muted">({claim.adjusterCompany})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {claim.adjusterPhone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${claim.adjusterPhone}`;
                }}
                className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                title={`Call ${claim.adjusterPhone}`}
              >
                <Phone className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
            {claim.adjusterEmail && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${claim.adjusterEmail}`;
                }}
                className="p-1.5 rounded hover:bg-surface-hover transition-colors"
                title={`Email ${claim.adjusterEmail}`}
              >
                <Mail className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Details Arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </motion.div>
  );
}

export default ClaimCard;
