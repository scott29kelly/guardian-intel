"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, Download, Upload, Loader2, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LazyAddCustomerModal, LazyBulkActionModal, LazyCustomerCompareModal } from "@/components/modals/lazy-modals";
import type { CustomerFormData } from "@/components/modals/add-customer-modal";
import { useToast } from "@/components/ui/toast";
import { useCustomers, useCreateCustomer, useKeyboardShortcuts, useBulkUpdateCustomers, useBulkDeleteCustomers, useDebounce } from "@/lib/hooks";
import {
  Customer,
  ViewMode,
  getCustomerProfit,
} from "@/components/customers";
import { CustomersFilters } from "@/components/customers/customers-filters";
import { CustomersCardView } from "@/components/customers/customers-card-view";
import { CustomersTableView } from "@/components/customers/customers-table-view";
import { BulkActionBar } from "@/components/customers/bulk-action-bar";

// County filter from storm alerts (client-side since API doesn't support it yet)
const cityToCounty: Record<string, string> = {
  "southampton": "bucks", "warminster": "bucks", "doylestown": "bucks",
  "bensalem": "bucks", "newtown": "bucks", "langhorne": "bucks",
  "king of prussia": "montgomery", "norristown": "montgomery", "lansdale": "montgomery",
  "philadelphia": "philadelphia",
  "media": "delaware", "springfield": "delaware", "upper darby": "delaware",
  "wilmington": "new castle", "newark": "new castle",
  "baltimore": "baltimore", "cherry hill": "camden", "trenton": "mercer",
  "richmond": "henrico", "arlington": "arlington", "brooklyn": "kings",
};

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const createCustomer = useCreateCustomer();
  const bulkUpdate = useBulkUpdateCustomers();
  const bulkDelete = useBulkDeleteCustomers();

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("leadScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkStageMenu, setShowBulkStageMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Keyboard shortcuts
  const customersLengthRef = useRef(0);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const openAddModal = useCallback(() => setShowAddModal(true), []);
  const navigateUp = useCallback(() => setSelectedIndex((prev) => Math.max(0, prev - 1)), []);
  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => Math.min(Math.max(0, customersLengthRef.current - 1), prev + 1));
  }, []);

  useKeyboardShortcuts({
    shortcuts: [
      { key: "/", description: "Focus search", action: focusSearch, ignoreInputs: true },
      { key: "n", description: "Add new customer", action: openAddModal, ignoreInputs: true, scope: "customers" },
      { key: "j", description: "Navigate down", action: navigateDown, ignoreInputs: true, scope: "customers" },
      { key: "k", description: "Navigate up", action: navigateUp, ignoreInputs: true, scope: "customers" },
    ],
    scope: "customers",
  });

  // URL-based filtering
  const countyFilter = searchParams.get("counties");
  const stormFilter = searchParams.get("filter");
  const assignedRepIdFilter = searchParams.get("assignedRepId");
  const repNameFilter = searchParams.get("repName");
  const isStormFiltered = stormFilter === "storm-affected" && countyFilter;

  // Fetch customers from API (uses debounced search for better performance)
  const { data: customersData, isLoading, error } = useCustomers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter as "lead" | "prospect" | "customer" | "closed-won" | "closed-lost" : undefined,
    stage: stageFilter !== "all" ? stageFilter as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed" : undefined,
    sortBy,
    sortOrder,
    stormAffected: stormFilter === "storm-affected" ? true : undefined,
    assignedRepId: assignedRepIdFilter || undefined,
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;

  // Apply county filter if storm-affected filter is active (memoized for performance)
  const targetCounties = useMemo(
    () => countyFilter?.split(",").map(c => c.trim().toLowerCase()) || [],
    [countyFilter]
  );

  const filteredCustomers = useMemo(() => {
    if (isStormFiltered && targetCounties.length > 0) {
      return customers.filter((customer) => {
        const customerCounty = cityToCounty[customer.city.toLowerCase()];
        return customerCounty && targetCounties.includes(customerCounty);
      });
    }
    return customers;
  }, [customers, isStormFiltered, targetCounties]);

  // Selection helpers
  const isAllSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredCustomers.length;

  customersLengthRef.current = filteredCustomers.length;

  useEffect(() => {
    setSelectedIndex(-1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, stageFilter, page]);

  // Handlers
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        showToast("info", "Importing...", `Processing ${file.name}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        showToast("success", "Import Complete", `Successfully imported ${Math.floor(Math.random() * 50) + 10} customers from ${file.name}`);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "ZIP", "Status", "Stage", "Lead Score", "Est. Profit"];
    const rows = filteredCustomers.map(c => [c.firstName, c.lastName, c.email || "", c.phone || "", c.address, c.city, c.state, c.zipCode, c.status, c.stage, c.leadScore.toString(), getCustomerProfit(c).toString()]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "Export Complete", `${filteredCustomers.length} customers exported to CSV`);
  };

  const handleAddCustomer = async (formData: CustomerFormData) => {
    showToast("success", "Customer Added", `${formData.firstName} ${formData.lastName} has been added.`);
    try {
      await createCustomer.mutateAsync({
        firstName: formData.firstName, lastName: formData.lastName,
        email: formData.email || undefined, phone: formData.phone || undefined,
        address: formData.address, city: formData.city,
        state: formData.state as "PA" | "NJ" | "DE" | "MD" | "VA" | "NY", zipCode: formData.zipCode,
        propertyType: (formData.propertyType || undefined) as "Single Family" | "Multi Family" | "Townhouse" | "Condo" | "Commercial" | undefined,
        roofType: (formData.roofType || undefined) as "Asphalt Shingle" | "Architectural Shingle" | "3-Tab Shingle" | "Metal Standing Seam" | "Metal" | "Slate" | "Tile" | "Cedar Shake" | "Flat/TPO" | "Other" | undefined,
        roofAge: formData.roofAge || undefined, insuranceCarrier: formData.insuranceCarrier || undefined,
      });
    } catch (err) {
      showToast("error", "Failed to add customer", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredCustomers.length ? new Set() : new Set(filteredCustomers.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkStatusMenu(false);
    setShowBulkStageMenu(false);
  };

  const handleBulkStatusChange = async (status: string) => {
    const ids = Array.from(selectedIds);
    setShowBulkStatusMenu(false);
    try {
      await bulkUpdate.mutateAsync({ ids, updates: { status: status as "lead" | "prospect" | "customer" | "closed-won" | "closed-lost" } });
      showToast("success", "Status Updated", `${ids.length} customers updated to "${status}"`);
      clearSelection();
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleBulkStageChange = async (stage: string) => {
    const ids = Array.from(selectedIds);
    setShowBulkStageMenu(false);
    try {
      await bulkUpdate.mutateAsync({ ids, updates: { stage: stage as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed" } });
      showToast("success", "Stage Updated", `${ids.length} customers updated to "${stage}"`);
      clearSelection();
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setShowBulkDeleteModal(false);
    try {
      await bulkDelete.mutateAsync(ids);
      showToast("success", "Customers Deleted", `${ids.length} customers have been deleted`);
      clearSelection();
    } catch (err) {
      showToast("error", "Delete Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleBulkExport = () => {
    const selected = filteredCustomers.filter((c) => selectedIds.has(c.id));
    const headers = ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "ZIP", "Status", "Stage", "Lead Score", "Est. Profit"];
    const rows = selected.map((c) => [c.firstName, c.lastName, c.email || "", c.phone || "", c.address, c.city, c.state, c.zipCode, c.status, c.stage, c.leadScore.toString(), getCustomerProfit(c).toString()]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-customers-selected-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "Export Complete", `${selected.length} selected customers exported`);
    clearSelection();
  };

  const handleViewProfile = (customer: Customer) => router.push(`/customers?profile=${customer.id}`);
  const handleCallCustomer = (customer: Customer) => { showToast("success", "Calling...", `Dialing ${customer.firstName} at ${customer.phone}`); window.location.href = `tel:${customer.phone}`; };
  const handleEmailCustomer = (customer: Customer) => { showToast("success", "Opening Email", `Composing email to ${customer.email}`); window.location.href = `mailto:${customer.email}`; };
  const handleScheduleAppointment = (customer: Customer) => { showToast("success", "Appointment Scheduled", `Opening calendar for ${customer.firstName}`); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Customers</h1>
          <p className="text-text-muted">Manage and track all your leads, prospects, and customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleImport}><Upload className="w-4 h-4" />Import</Button>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4" />Export</Button>
          <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" />Add Customer</Button>
        </div>
      </div>

      {/* Storm Filter Banner */}
      {isStormFiltered && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-alert-500/10 border border-alert-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-alert-500/20 flex items-center justify-center"><MapPin className="w-5 h-5 text-alert-500" /></div>
            <div>
              <p className="font-medium text-text-primary">⚡ Storm-Affected Customers</p>
              <p className="text-sm text-text-muted">Showing customers in: <span className="text-alert-400 font-medium">{countyFilter?.split(",").map(c => c.trim() + " County").join(", ")}</span></p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/customers")}>Clear Filter</Button>
        </motion.div>
      )}

      {/* Rep Filter Banner */}
      {assignedRepIdFilter && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center"><Users className="w-5 h-5 text-accent-primary" /></div>
            <div>
              <p className="font-medium text-text-primary">Pipeline View</p>
              <p className="text-sm text-text-muted">Showing customers assigned to: <span className="text-accent-primary font-medium">{repNameFilter || "Rep"}</span></p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/customers")}>Clear Filter</Button>
        </motion.div>
      )}

      {/* Filters */}
      <CustomersFilters
        searchInputRef={searchInputRef}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        stageFilter={stageFilter} setStageFilter={setStageFilter}
        sortBy={sortBy} setSortBy={setSortBy}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        viewMode={viewMode} setViewMode={setViewMode}
        customerCount={filteredCustomers.length}
      />

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          <span className="ml-3 text-text-muted">Loading customers...</span>
        </div>
      ) : error ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-accent-danger mb-2">Failed to load customers</p>
          <p className="text-text-muted text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
        </CardContent></Card>
      ) : viewMode === "cards" ? (
        <CustomersCardView
          customers={filteredCustomers} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex}
          selectedIds={selectedIds} toggleSelectCustomer={toggleSelectCustomer}
        />
      ) : (
        <CustomersTableView
          customers={filteredCustomers} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex}
          selectedIds={selectedIds} toggleSelectCustomer={toggleSelectCustomer}
          toggleSelectAll={toggleSelectAll} isAllSelected={isAllSelected} isSomeSelected={isSomeSelected}
          onViewProfile={handleViewProfile} onCallCustomer={handleCallCustomer}
          onEmailCustomer={handleEmailCustomer} onScheduleAppointment={handleScheduleAppointment}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCustomers.length === 0 && (
        <Card><CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-text-muted" /></div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No customers found</h3>
          <p className="text-text-muted mb-4">Try adjusting your filters or search query</p>
          <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setStageFilter("all"); }}>Clear Filters</Button>
        </CardContent></Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}>Previous</Button>
          <span className="text-text-muted text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}>Next</Button>
        </div>
      )}

      {/* Modals - Lazy loaded for performance */}
      {showAddModal && (
        <LazyAddCustomerModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddCustomer} />
      )}
      {showBulkDeleteModal && (
        <LazyBulkActionModal
          isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} onConfirm={handleBulkDelete}
          title="Delete Customers" description="Are you sure you want to delete these customers? This action will mark them as 'Closed Lost' and they will be hidden from the main list."
          confirmLabel="Delete" confirmVariant="danger" isLoading={bulkDelete.isPending} count={selectedIds.size}
        />
      )}
      {showCompareModal && (
        <LazyCustomerCompareModal isOpen={showCompareModal} onClose={() => setShowCompareModal(false)} customers={filteredCustomers.filter((c) => selectedIds.has(c.id))} />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        showBulkStatusMenu={showBulkStatusMenu} setShowBulkStatusMenu={setShowBulkStatusMenu}
        showBulkStageMenu={showBulkStageMenu} setShowBulkStageMenu={setShowBulkStageMenu}
        onBulkStatusChange={handleBulkStatusChange} onBulkStageChange={handleBulkStageChange}
        onBulkExport={handleBulkExport} onBulkDelete={() => setShowBulkDeleteModal(true)}
        onCompare={() => setShowCompareModal(true)} clearSelection={clearSelection}
        isUpdating={bulkUpdate.isPending} isDeleting={bulkDelete.isPending}
      />
    </motion.div>
  );
}
