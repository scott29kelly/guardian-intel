"use client";

/**
 * CarrierStatusPanel Component
 * 
 * Displays carrier sync status and allows manual sync.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncClaimStatus, useCarrierSupport } from "@/lib/hooks/use-carriers";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

interface CarrierStatusPanelProps {
  claim: {
    id: string;
    carrier: string;
    carrierClaimId?: string | null;
    claimNumber?: string | null;
    carrierStatus?: string | null;
    carrierLastSync?: string | null;
    isFiledWithCarrier?: boolean;
    approvedValue?: number | null;
    totalPaid?: number | null;
    adjusterName?: string | null;
    adjusterPhone?: string | null;
    adjusterEmail?: string | null;
    inspectionDate?: string | null;
  };
  onFileWithCarrier?: () => void;
}

const statusColors: Record<string, string> = {
  received: "bg-blue-500/20 text-blue-400",
  assigned: "bg-cyan-500/20 text-cyan-400",
  "inspection-scheduled": "bg-purple-500/20 text-purple-400",
  "inspection-complete": "bg-indigo-500/20 text-indigo-400",
  "under-review": "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  "partially-approved": "bg-yellow-500/20 text-yellow-400",
  denied: "bg-rose-500/20 text-rose-400",
  "supplement-requested": "bg-orange-500/20 text-orange-400",
  "payment-processing": "bg-teal-500/20 text-teal-400",
  "payment-issued": "bg-green-500/20 text-green-400",
  closed: "bg-slate-500/20 text-slate-400",
};

export function CarrierStatusPanel({ claim, onFileWithCarrier }: CarrierStatusPanelProps) {
  const { showToast } = useToast();
  const carrierCode = claim.carrier.toLowerCase().replace(/\s+/g, "-");
  const { supportsDirectFiling, supportsStatusUpdates, carrier } = useCarrierSupport(claim.carrier);
  const syncStatus = useSyncClaimStatus(carrierCode);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(
    claim.carrierLastSync ? new Date(claim.carrierLastSync) : null
  );

  const handleSync = async () => {
    try {
      await syncStatus.mutateAsync(claim.id);
      setLastSyncTime(new Date());
      showToast("success", "Synced", "Claim status updated from carrier");
    } catch (error) {
      showToast(
        "error",
        "Sync Failed",
        error instanceof Error ? error.message : "Please try again"
      );
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-secondary">Carrier Integration</span>
        </div>
        {claim.isFiledWithCarrier && (
          <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
            <CheckCircle className="w-3 h-3 mr-1" />
            Filed
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Carrier Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {carrier?.displayName || claim.carrier}
            </p>
            {claim.carrierClaimId && (
              <p className="text-xs text-text-muted font-mono">
                ID: {claim.carrierClaimId}
              </p>
            )}
          </div>
          {supportsStatusUpdates && (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <RefreshCw className="w-3 h-3" />
              {formatTime(lastSyncTime?.toISOString() || claim.carrierLastSync)}
            </div>
          )}
        </div>

        {/* Status */}
        {claim.isFiledWithCarrier && claim.carrierStatus && (
          <div className="p-3 bg-surface-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">Carrier Status</span>
              <Badge className={statusColors[claim.carrierStatus] || "bg-slate-500/20 text-slate-400"}>
                {claim.carrierStatus.replace(/-/g, " ")}
              </Badge>
            </div>
            
            {/* Financial Info */}
            {(claim.approvedValue || claim.totalPaid) && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                {claim.approvedValue && (
                  <div>
                    <p className="text-xs text-text-muted">Approved</p>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCurrency(claim.approvedValue)}
                    </p>
                  </div>
                )}
                {claim.totalPaid && (
                  <div>
                    <p className="text-xs text-text-muted">Paid</p>
                    <p className="text-sm font-medium text-accent-primary">
                      {formatCurrency(claim.totalPaid)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Adjuster Info */}
        {claim.adjusterName && (
          <div className="p-3 bg-surface-secondary/50 rounded-lg">
            <p className="text-xs text-text-muted mb-2">Assigned Adjuster</p>
            <p className="text-sm font-medium text-text-primary">{claim.adjusterName}</p>
            {claim.adjusterPhone && (
              <a
                href={`tel:${claim.adjusterPhone}`}
                className="text-xs text-accent-primary hover:underline block mt-1"
              >
                {claim.adjusterPhone}
              </a>
            )}
            {claim.adjusterEmail && (
              <a
                href={`mailto:${claim.adjusterEmail}`}
                className="text-xs text-accent-primary hover:underline block mt-1"
              >
                {claim.adjusterEmail}
              </a>
            )}
          </div>
        )}

        {/* Inspection Date */}
        {claim.inspectionDate && (
          <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg">
            <Clock className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs text-text-muted">Inspection</p>
              <p className="text-sm text-text-primary">{formatDate(claim.inspectionDate)}</p>
            </div>
          </div>
        )}

        {/* Not Filed State */}
        {!claim.isFiledWithCarrier && (
          <div className="p-3 bg-surface-secondary/50 rounded-lg text-center">
            <Info className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted mb-3">
              Claim not yet filed with carrier
            </p>
            {supportsDirectFiling && onFileWithCarrier && (
              <Button size="sm" onClick={onFileWithCarrier}>
                <Send className="w-4 h-4" />
                File with {carrier?.displayName || claim.carrier}
              </Button>
            )}
            {!supportsDirectFiling && (
              <p className="text-xs text-text-muted">
                Direct filing not available for this carrier
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {claim.isFiledWithCarrier && (
          <div className="flex gap-2">
            {supportsStatusUpdates && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleSync}
                disabled={syncStatus.isPending}
              >
                {syncStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync Status
              </Button>
            )}
            {claim.claimNumber && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // In production, this would open the carrier's tracking page
                  showToast("info", "Opening Carrier Portal", `Claim #${claim.claimNumber}`);
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Track
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CarrierStatusPanel;
