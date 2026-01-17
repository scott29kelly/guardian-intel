"use client";

/**
 * CustomerContractsTab Component
 * 
 * Contracts tab for customer profile modal.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  DollarSign,
  Calendar,
  Eye,
  PenTool,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateContractModal } from "./create-contract-modal";
import { ContractSigningModal } from "./contract-signing-modal";
import { useCustomerContracts, type Contract, type ContractStatus } from "@/lib/hooks/use-contracts";
import { formatCurrency, formatDistanceToNow } from "@/lib/utils";

interface CustomerContractsTabProps {
  customerId: string;
  customerName: string;
}

const statusConfig: Record<ContractStatus, { color: string; bg: string; icon: any; label: string }> = {
  draft: { color: "text-slate-400", bg: "bg-slate-500/20", icon: FileText, label: "Draft" },
  sent: { color: "text-blue-400", bg: "bg-blue-500/20", icon: Send, label: "Sent" },
  viewed: { color: "text-amber-400", bg: "bg-amber-500/20", icon: Eye, label: "Viewed" },
  signed: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle, label: "Signed" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "text-rose-400", bg: "bg-rose-500/20", icon: XCircle, label: "Cancelled" },
  expired: { color: "text-rose-400", bg: "bg-rose-500/20", icon: Clock, label: "Expired" },
};

export function CustomerContractsTab({ customerId, customerName }: CustomerContractsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [signingContract, setSigningContract] = useState<string | null>(null);
  const [signingMode, setSigningMode] = useState<"view" | "sign" | "present">("view");

  const { data, isLoading, refetch } = useCustomerContracts(customerId);
  const contracts = data?.data || [];

  // Calculate stats
  const stats = {
    total: contracts.length,
    signed: contracts.filter((c: Contract) => c.status === "signed" || c.status === "completed").length,
    pending: contracts.filter((c: Contract) => ["draft", "sent", "viewed"].includes(c.status)).length,
    totalValue: contracts.reduce((sum: number, c: Contract) => sum + c.totalAmount, 0),
    signedValue: contracts
      .filter((c: Contract) => c.status === "signed" || c.status === "completed")
      .reduce((sum: number, c: Contract) => sum + c.totalAmount, 0),
  };

  const handleOpenContract = (contractId: string, mode: "view" | "sign" | "present") => {
    setSigningContract(contractId);
    setSigningMode(mode);
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
          <div className="text-xs text-text-muted">Total Contracts</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.signed}</div>
          <div className="text-xs text-text-muted">Signed</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
          <div className="text-xs text-text-muted">Pending</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-accent-success">{formatCurrency(stats.signedValue)}</div>
          <div className="text-xs text-text-muted">Signed Value</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Contract
        </Button>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="panel p-8 text-center">
          <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-medium text-text-primary mb-1">No Contracts</h3>
          <p className="text-sm text-text-muted mb-4">
            Create a contract to close this deal on-site.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Create Contract
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract: Contract, index: number) => {
            const status = statusConfig[contract.status as ContractStatus] || statusConfig.draft;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="panel p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary">{contract.title}</span>
                      <Badge className={`${status.bg} ${status.color} text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted mb-2">{contract.contractNumber}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-accent-success">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(contract.totalAmount)}
                      </span>
                      <span className="flex items-center gap-1 text-text-muted">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(contract.createdAt))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenContract(contract.id, "view")}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {contract.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenContract(contract.id, "present")}
                      >
                        <PenTool className="w-4 h-4" />
                        Sign
                      </Button>
                    )}
                    
                    {(contract.status === "sent" || contract.status === "viewed") && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenContract(contract.id, "sign")}
                      >
                        <PenTool className="w-4 h-4" />
                        Sign
                      </Button>
                    )}
                  </div>
                </div>

                {/* Signature Status */}
                {contract.customerSignedAt && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-text-muted">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    Signed {formatDistanceToNow(new Date(contract.customerSignedAt))}
                    {contract.signedAddress && (
                      <span className="ml-2">• {contract.signedAddress.split(",")[0]}</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Contract Modal */}
      <CreateContractModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        customerId={customerId}
        customerName={customerName}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />

      {/* Contract Signing Modal */}
      {signingContract && (
        <ContractSigningModal
          contractId={signingContract}
          isOpen={!!signingContract}
          onClose={() => setSigningContract(null)}
          onSigned={() => refetch()}
          mode={signingMode}
        />
      )}
    </div>
  );
}

export default CustomerContractsTab;
