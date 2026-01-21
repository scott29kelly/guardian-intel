"use client";

/**
 * Claims Page
 * 
 * Insurance claim tracking with Kanban board and table views.
 */

import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimCard } from "@/components/claims/claim-card";
import { ClaimDetailsModal } from "@/components/claims/claim-details-modal";
import { AddClaimModal } from "@/components/claims/add-claim-modal";
import { useClaims, useClaimStats, useUpdateClaim, type ClaimStatus, type Claim } from "@/lib/hooks/use-claims";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

type ViewMode = "kanban" | "table";

// Kanban column configuration
const kanbanColumns: { id: ClaimStatus; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "border-slate-500" },
  { id: "filed", label: "Filed", color: "border-blue-500" },
  { id: "adjuster-assigned", label: "Adjuster Assigned", color: "border-violet-500" },
  { id: "inspection-scheduled", label: "Inspection", color: "border-amber-500" },
  { id: "approved", label: "Approved", color: "border-emerald-500" },
  { id: "supplement", label: "Supplement", color: "border-orange-500" },
  { id: "paid", label: "Paid", color: "border-green-500" },
];

const statusColors: Record<ClaimStatus, string> = {
  pending: "bg-slate-500/20 text-slate-400",
  filed: "bg-blue-500/20 text-blue-400",
  "adjuster-assigned": "bg-violet-500/20 text-violet-400",
  "inspection-scheduled": "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  denied: "bg-rose-500/20 text-rose-400",
  supplement: "bg-orange-500/20 text-orange-400",
  paid: "bg-green-500/20 text-green-400",
  closed: "bg-gray-500/20 text-gray-400",
};

export default function ClaimsPage() {
  const { showToast } = useToast();
  const updateClaim = useUpdateClaim();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all");
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Fetch data (uses debounced search for better performance)
  const { data: claimsData, isLoading } = useClaims({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    carrier: carrierFilter !== "all" ? carrierFilter : undefined,
    limit: 100,
  });
  
  const { data: stats } = useClaimStats();
  
  const claims = claimsData?.data || [];
  
  // Get unique carriers for filter
  const carriers = useMemo(() => {
    const uniqueCarriers = [...new Set(claims.map((c) => c.carrier))];
    return uniqueCarriers.sort();
  }, [claims]);

  // Group claims by status for Kanban
  const claimsByStatus = useMemo(() => {
    const grouped: Record<ClaimStatus, Claim[]> = {
      pending: [],
      filed: [],
      "adjuster-assigned": [],
      "inspection-scheduled": [],
      approved: [],
      denied: [],
      supplement: [],
      paid: [],
      closed: [],
    };
    
    claims.forEach((claim) => {
      if (grouped[claim.status]) {
        grouped[claim.status].push(claim);
      }
    });
    
    return grouped;
  }, [claims]);

  const handleDragStart = (e: React.DragEvent, claimId: string) => {
    e.dataTransfer.setData("claimId", claimId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ClaimStatus) => {
    e.preventDefault();
    const claimId = e.dataTransfer.getData("claimId");
    
    if (!claimId) return;
    
    try {
      await updateClaim.mutateAsync({ id: claimId, status: newStatus });
      showToast("success", "Status Updated", `Claim moved to ${newStatus.replace("-", " ")}`);
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleExport = () => {
    const headers = [
      "Claim Number",
      "Customer",
      "Carrier",
      "Type",
      "Status",
      "Date of Loss",
      "Estimate",
      "Approved",
      "Paid",
      "Adjuster",
    ];
    
    const rows = claims.map((c) => [
      c.claimNumber || "",
      `${c.customer.firstName} ${c.customer.lastName}`,
      c.carrier,
      c.claimType,
      c.status,
      new Date(c.dateOfLoss).toLocaleDateString(),
      c.initialEstimate?.toString() || "",
      c.approvedValue?.toString() || "",
      c.totalPaid?.toString() || "",
      c.adjusterName || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast("success", "Export Complete", `${claims.length} claims exported to CSV`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent-primary" />
            Insurance Claims
          </h1>
          <p className="text-text-muted">
            Track and manage insurance claims through their lifecycle
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            File Claim
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalClaims}</p>
                  <p className="text-xs text-text-muted">Total Claims</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.needsAction}</p>
                  <p className="text-xs text-text-muted">Needs Action</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.approvalRate}%</p>
                  <p className="text-xs text-text-muted">Approval Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(stats.financials.totalPaid)}
                  </p>
                  <p className="text-xs text-text-muted">Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(stats.financials.pendingRevenue)}
                  </p>
                  <p className="text-xs text-text-muted">Pending Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by customer, claim number, or carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | "all")}
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="filed">Filed</option>
              <option value="adjuster-assigned">Adjuster Assigned</option>
              <option value="inspection-scheduled">Inspection Scheduled</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="supplement">Supplement</option>
              <option value="paid">Paid</option>
              <option value="closed">Closed</option>
            </select>

            {/* Carrier Filter */}
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50"
            >
              <option value="all">All Carriers</option>
              {carriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-all ${
                  viewMode === "kanban"
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <List className="w-4 h-4" />
                Table
              </button>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-text-muted">
              {claims.length} claims
            </span>
            {(statusFilter !== "all" || carrierFilter !== "all" || searchQuery) && (
              <>
                <span className="text-border">|</span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-text-primary">×</button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-text-primary">×</button>
                  </Badge>
                )}
                {carrierFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Carrier: {carrierFilter}
                    <button onClick={() => setCarrierFilter("all")} className="ml-1 hover:text-text-primary">×</button>
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          <span className="ml-3 text-text-muted">Loading claims...</span>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((column) => (
            <div
              key={column.id}
              className={`flex-shrink-0 w-72 bg-surface-secondary/30 rounded-lg border-t-2 ${column.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text-primary">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {claimsByStatus[column.id]?.length || 0}
                  </Badge>
                </div>
                {stats && stats.statusBreakdown[column.id] > 0 && (
                  <p className="text-xs text-text-muted mt-1">
                    {formatCurrency(
                      claimsByStatus[column.id]?.reduce((sum, c) => sum + (c.approvedValue || c.initialEstimate || 0), 0) || 0
                    )}
                  </p>
                )}
              </div>
              
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto">
                <AnimatePresence>
                  {claimsByStatus[column.id]?.map((claim) => (
                    <div
                      key={claim.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, claim.id)}
                    >
                      <ClaimCard
                        claim={claim}
                        compact
                        draggable
                        onClick={() => setSelectedClaimId(claim.id)}
                      />
                    </div>
                  ))}
                </AnimatePresence>
                
                {claimsByStatus[column.id]?.length === 0 && (
                  <div className="py-8 text-center text-text-muted text-sm">
                    No claims
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-sm font-medium text-text-muted">Customer</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-text-muted">Carrier</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Type</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Status</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-text-muted">Estimate</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-text-muted">Approved</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-text-muted">Paid</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Date of Loss</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Adjuster</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, index) => (
                    <motion.tr
                      key={claim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border/50 hover:bg-surface-secondary/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedClaimId(claim.id)}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {claim.customer.firstName} {claim.customer.lastName}
                          </p>
                          <p className="text-xs text-text-muted">
                            {claim.customer.city}, {claim.customer.state}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-text-secondary">{claim.carrier}</span>
                        {claim.claimNumber && (
                          <p className="text-xs text-text-muted font-mono">#{claim.claimNumber}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {claim.claimType.replace("-", " ")}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={statusColors[claim.status]}>
                          {claim.status.replace("-", " ")}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-text-secondary">
                          {claim.initialEstimate ? formatCurrency(claim.initialEstimate) : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-medium text-emerald-400">
                          {claim.approvedValue ? formatCurrency(claim.approvedValue) : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-medium text-green-400">
                          {claim.totalPaid ? formatCurrency(claim.totalPaid) : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-text-secondary">
                          {new Date(claim.dateOfLoss).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-text-muted">
                          {claim.adjusterName || "-"}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              
              {claims.length === 0 && (
                <div className="py-16 text-center">
                  <Shield className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No claims found</h3>
                  <p className="text-text-muted mb-4">
                    {searchQuery || statusFilter !== "all" || carrierFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Get started by filing your first claim"}
                  </p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4" />
                    File Claim
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At-Risk Alert */}
      {stats && stats.atRiskClaims.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-400">
                  {stats.atRiskClaims.length} claims at risk
                </h3>
                <p className="text-xs text-text-muted">
                  These claims are approved but haven't been paid in over 30 days
                </p>
              </div>
              <div className="flex gap-2">
                {stats.atRiskClaims.slice(0, 3).map((claim) => (
                  <Badge
                    key={claim.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-amber-500/20"
                    onClick={() => setSelectedClaimId(claim.id)}
                  >
                    {claim.customer}
                  </Badge>
                ))}
                {stats.atRiskClaims.length > 3 && (
                  <Badge variant="secondary">+{stats.atRiskClaims.length - 3} more</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ClaimDetailsModal
        claimId={selectedClaimId}
        isOpen={!!selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
      />
      
      <AddClaimModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </motion.div>
  );
}
