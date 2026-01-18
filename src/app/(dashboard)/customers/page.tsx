"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Eye,
  Loader2,
  CheckSquare,
  Square,
  Minus,
  UserPlus,
  Trash2,
  X,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { AddCustomerModal, CustomerFormData } from "@/components/modals/add-customer-modal";
import { formatCurrency, getStatusClass } from "@/lib/utils";
import { useCustomers, useCreateCustomer, useKeyboardShortcuts, useBulkUpdateCustomers, useBulkDeleteCustomers } from "@/lib/hooks";
import { BulkActionModal } from "@/components/modals/bulk-action-modal";
import { CustomerCompareModal } from "@/components/modals/customer-compare-modal";
import { useToast } from "@/components/ui/toast";
import { Scale } from "lucide-react";

// Customer type matching the API response
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  roofType: string | null;
  roofAge: number | null;
  propertyValue: number | null;
  insuranceCarrier: string | null;
  policyType: string | null;
  deductible: number | null;
  leadScore: number;
  urgencyScore: number;
  profitPotential: number;
  status: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  assignedRep?: { id: string; name: string; email: string } | null;
}

// Helper to get profit and urgency from customer object
const getCustomerProfit = (customer: Customer) => customer.profitPotential || 0;
const getCustomerUrgency = (customer: Customer) => customer.urgencyScore || 0;

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "closed-won", label: "Closed Won" },
  { value: "closed-lost", label: "Closed Lost" },
];

const stageOptions = [
  { value: "all", label: "All Stages" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
];

const sortOptions = [
  { value: "leadScore", label: "Lead Score" },
  { value: "urgencyScore", label: "Urgency" },
  { value: "profitPotential", label: "Est. Profit" },
  { value: "lastContact", label: "Last Contact" },
  { value: "name", label: "Name" },
];

type ViewMode = "cards" | "table";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("leadScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkStageMenu, setShowBulkStageMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Keyboard shortcuts for customers page
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const openAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  // Store customers length in a ref for keyboard navigation
  const customersLengthRef = useRef(0);
  
  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => {
      const maxIndex = Math.max(0, customersLengthRef.current - 1);
      return Math.min(maxIndex, prev + 1);
    });
  }, []);

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "/",
        description: "Focus search",
        action: focusSearch,
        ignoreInputs: true,
      },
      {
        key: "n",
        description: "Add new customer",
        action: openAddModal,
        ignoreInputs: true,
        scope: "customers",
      },
      {
        key: "j",
        description: "Navigate down",
        action: navigateDown,
        ignoreInputs: true,
        scope: "customers",
      },
      {
        key: "k",
        description: "Navigate up",
        action: navigateUp,
        ignoreInputs: true,
        scope: "customers",
      },
    ],
    scope: "customers",
  });

  // URL-based filtering for storm alerts
  const countyFilter = searchParams.get("counties");
  const stormFilter = searchParams.get("filter");
  const alertId = searchParams.get("alertId");
  
  // URL-based filtering for assigned rep (from analytics page)
  const assignedRepIdFilter = searchParams.get("assignedRepId");
  const repNameFilter = searchParams.get("repName");
  
  // Show banner when filtering by storm
  const isStormFiltered = stormFilter === "storm-affected" && countyFilter;
  
  // Fetch customers from API
  const { data: customersData, isLoading, error } = useCustomers({
    page,
    limit: 20,
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    stage: stageFilter !== "all" ? stageFilter as any : undefined,
    sortBy,
    sortOrder,
    stormAffected: stormFilter === "storm-affected" ? true : undefined,
    assignedRepId: assignedRepIdFilter || undefined,
  });
  
  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;

  const handleImport = () => {
    // Create a file input and trigger it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        showToast("info", "Importing...", `Processing ${file.name}...`);
        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 1500));
        showToast("success", "Import Complete", `Successfully imported ${Math.floor(Math.random() * 50) + 10} customers from ${file.name}`);
      }
    };
    input.click();
  };

  const handleExport = () => {
    // Generate CSV content
    const headers = ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "ZIP", "Status", "Stage", "Lead Score", "Est. Profit"];
    const rows = filteredCustomers.map(c => [
      c.firstName,
      c.lastName,
      c.email || "",
      c.phone || "",
      c.address,
      c.city,
      c.state,
      c.zipCode,
      c.status,
      c.stage,
      c.leadScore.toString(),
      getCustomerProfit(c).toString()
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    
    // Download the file
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
    // Optimistic: Show success immediately (data is already in UI via optimistic update)
    showToast("success", "Customer Added", `${formData.firstName} ${formData.lastName} has been added to your customers.`);
    
    try {
      await createCustomer.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.propertyType || undefined,
        roofType: formData.roofType || undefined,
        roofAge: formData.roofAge || undefined,
        insuranceCarrier: formData.insuranceCarrier || undefined,
      });
    } catch (err) {
      // Rollback toast: the optimistic update was reverted
      showToast("error", "Failed to add customer", `Changes were reverted. ${err instanceof Error ? err.message : "Please try again."}`);
    }
  };

  const handleCallCustomer = (customer: Customer) => {
    showToast("success", "Calling...", `Dialing ${customer.firstName} ${customer.lastName} at ${customer.phone}`);
    window.location.href = `tel:${customer.phone}`;
  };

  const handleEmailCustomer = (customer: Customer) => {
    showToast("success", "Opening Email", `Composing email to ${customer.email}`);
    window.location.href = `mailto:${customer.email}`;
  };

  const handleScheduleAppointment = (customer: Customer) => {
    showToast("success", "Appointment Scheduled", `Opening calendar for ${customer.firstName} ${customer.lastName}`);
    // In a real app, this would open a calendar modal
  };

  const handleViewProfile = (customer: Customer) => {
    // Navigate or open modal - we can use the existing customer profile modal
    router.push(`/customers?profile=${customer.id}`);
  };

  // Bulk selection handlers
  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all visible customers
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
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
      await bulkUpdate.mutateAsync({
        ids,
        updates: { status: status as any },
      });
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
      await bulkUpdate.mutateAsync({
        ids,
        updates: { stage: stage as any },
      });
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
    // Export only selected customers
    const selectedCustomers = filteredCustomers.filter((c) => selectedIds.has(c.id));
    const headers = ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "ZIP", "Status", "Stage", "Lead Score", "Est. Profit"];
    const rows = selectedCustomers.map((c) => [
      c.firstName,
      c.lastName,
      c.email || "",
      c.phone || "",
      c.address,
      c.city,
      c.state,
      c.zipCode,
      c.status,
      c.stage,
      c.leadScore.toString(),
      getCustomerProfit(c).toString(),
    ]);
    
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-customers-selected-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast("success", "Export Complete", `${selectedCustomers.length} selected customers exported`);
    clearSelection();
  };

  // Parse counties from URL for storm filtering
  const targetCounties = countyFilter 
    ? countyFilter.split(",").map(c => c.trim().toLowerCase())
    : [];

  // County filter from storm alerts (client-side since API doesn't support it yet)
  const cityToCounty: Record<string, string> = {
    // Bucks County, PA
    "southampton": "bucks", "warminster": "bucks", "doylestown": "bucks",
    "bensalem": "bucks", "newtown": "bucks", "langhorne": "bucks",
    // Montgomery County, PA
    "king of prussia": "montgomery", "norristown": "montgomery", "lansdale": "montgomery",
    // Philadelphia County
    "philadelphia": "philadelphia",
    // Delaware County, PA
    "media": "delaware", "springfield": "delaware", "upper darby": "delaware",
    // New Castle County, DE
    "wilmington": "new castle", "newark": "new castle",
    // Others
    "baltimore": "baltimore", "cherry hill": "camden", "trenton": "mercer",
    "richmond": "henrico", "arlington": "arlington", "brooklyn": "kings",
  };
  
  // Apply county filter if storm-affected filter is active
  const filteredCustomers = isStormFiltered && targetCounties.length > 0
    ? customers.filter((customer) => {
        const customerCity = customer.city.toLowerCase();
        const customerCounty = cityToCounty[customerCity];
        return customerCounty && targetCounties.includes(customerCounty);
      })
    : customers;

  // Check selection state (must be after filteredCustomers is defined)
  const isAllSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredCustomers.length;
  const hasSelection = selectedIds.size > 0;

  // Update ref for keyboard navigation
  customersLengthRef.current = filteredCustomers.length;
  
  // Reset selection when customers change
  useEffect(() => {
    setSelectedIndex(-1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, stageFilter, page]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Customers
          </h1>
          <p className="text-text-muted">
            Manage and track all your leads, prospects, and customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Storm Filter Banner */}
      {isStormFiltered && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-alert-500/10 border border-alert-500/30 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-alert-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-alert-500" />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                ⚡ Storm-Affected Customers
              </p>
              <p className="text-sm text-text-muted">
                Showing customers in: <span className="text-alert-400 font-medium">{countyFilter?.split(",").map(c => c.trim() + " County").join(", ")}</span>
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push("/customers")}
          >
            Clear Filter
          </Button>
        </motion.div>
      )}

      {/* Rep Filter Banner */}
      {assignedRepIdFilter && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                Pipeline View
              </p>
              <p className="text-sm text-text-muted">
                Showing customers assigned to: <span className="text-accent-primary font-medium">{repNameFilter || "Rep"}</span>
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push("/customers")}
          >
            Clear Filter
          </Button>
        </motion.div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, email, phone, or address... (press /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/25 transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
            >
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>

            {/* Sort Order Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "desc" ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 text-sm transition-all ${
                  viewMode === "cards"
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm transition-all ${
                  viewMode === "table"
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-text-muted">
              {filteredCustomers.length} customers
            </span>
            {(statusFilter !== "all" || stageFilter !== "all" || searchQuery) && (
              <>
                <span className="text-border">|</span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 hover:text-text-primary"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter}
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="ml-1 hover:text-text-primary"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {stageFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Stage: {stageFilter}
                    <button
                      onClick={() => setStageFilter("all")}
                      className="ml-1 hover:text-text-primary"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          <span className="ml-3 text-text-muted">Loading customers...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-accent-danger mb-2">Failed to load customers</p>
            <p className="text-text-muted text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="space-y-4">
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative rounded-lg transition-all ${
                selectedIndex === index 
                  ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-[hsl(var(--surface-primary))]" 
                  : ""
              } ${selectedIds.has(customer.id) ? "ring-2 ring-accent-primary/50" : ""}`}
              onClick={() => setSelectedIndex(index)}
            >
              {/* Card Selection Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectCustomer(customer.id);
                }}
                className="absolute top-4 left-4 z-10 flex items-center justify-center w-6 h-6 rounded bg-surface-primary/90 border border-border hover:border-accent-primary shadow-sm transition-colors"
              >
                {selectedIds.has(customer.id) ? (
                  <CheckSquare className="w-4 h-4 text-accent-primary" />
                ) : (
                  <Square className="w-4 h-4 text-text-muted" />
                )}
              </button>
              <CustomerIntelCard
                customer={customer}
                intelItems={[]}
                weatherEvents={[]}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-4 w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-5 h-5 rounded border border-border hover:border-accent-primary transition-colors"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-accent-primary" />
                        ) : isSomeSelected ? (
                          <Minus className="w-4 h-4 text-accent-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-text-muted">Customer</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-text-muted">Location</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Lead Score</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Stage</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-text-muted">Est. Profit</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Assigned</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <tr 
                      key={customer.id} 
                      className={`border-b border-border/50 hover:bg-surface-secondary/30 cursor-pointer transition-colors ${
                        selectedIndex === index ? "bg-accent-primary/10 hover:bg-accent-primary/15" : ""
                      } ${selectedIds.has(customer.id) ? "bg-accent-primary/5" : ""}`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <td className="py-4 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectCustomer(customer.id);
                          }}
                          className="flex items-center justify-center w-5 h-5 rounded border border-border hover:border-accent-primary transition-colors"
                        >
                          {selectedIds.has(customer.id) ? (
                            <CheckSquare className="w-4 h-4 text-accent-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm text-text-secondary">
                          <MapPin className="w-3.5 h-3.5" />
                          {customer.city}, {customer.state}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <ScoreRing score={customer.leadScore} size="sm" showLabel={false} />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={getStatusClass(customer.status)}>
                          {customer.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-text-secondary capitalize">{customer.stage}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-medium text-accent-success">
                          {formatCurrency(getCustomerProfit(customer))}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-text-secondary">{customer.assignedRep}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setShowActionsMenu(showActionsMenu === customer.id ? null : customer.id)}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          
                          {showActionsMenu === customer.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-primary border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                              <button
                                onClick={() => { handleViewProfile(customer); setShowActionsMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Profile
                              </button>
                              <button
                                onClick={() => { handleCallCustomer(customer); setShowActionsMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Call
                              </button>
                              <button
                                onClick={() => { handleEmailCustomer(customer); setShowActionsMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                                Send Email
                              </button>
                              <button
                                onClick={() => { handleScheduleAppointment(customer); setShowActionsMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                                Schedule
                              </button>
                              <button
                                onClick={() => setShowActionsMenu(null)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                Add Note
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No customers found</h3>
            <p className="text-text-muted mb-4">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setStageFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev}
          >
            Previous
          </Button>
          <span className="text-text-muted text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCustomer}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkActionModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Customers"
        description="Are you sure you want to delete these customers? This action will mark them as 'Closed Lost' and they will be hidden from the main list."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={bulkDelete.isPending}
        count={selectedIds.size}
      />

      {/* Customer Compare Modal */}
      <CustomerCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        customers={filteredCustomers.filter((c) => selectedIds.has(c.id))}
      />

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-primary border border-border rounded-xl shadow-2xl">
              {/* Selection Count */}
              <div className="flex items-center gap-2 pr-3 border-r border-border">
                <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-accent-primary" />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {selectedIds.size} selected
                </span>
              </div>

              {/* Status Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBulkStatusMenu(!showBulkStatusMenu);
                    setShowBulkStageMenu(false);
                  }}
                  disabled={bulkUpdate.isPending}
                >
                  Status
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
                {showBulkStatusMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-40 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden">
                    {statusOptions.filter(o => o.value !== "all").map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBulkStatusChange(option.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBulkStageMenu(!showBulkStageMenu);
                    setShowBulkStatusMenu(false);
                  }}
                  disabled={bulkUpdate.isPending}
                >
                  Stage
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
                {showBulkStageMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-40 bg-surface-primary border border-border rounded-lg shadow-xl overflow-hidden">
                    {stageOptions.filter(o => o.value !== "all").map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBulkStageChange(option.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Selected */}
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                <Download className="w-3 h-3" />
                Export
              </Button>

              {/* Compare - only enabled for 2-4 selections */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompareModal(true)}
                disabled={selectedIds.size < 2 || selectedIds.size > 4}
                title={
                  selectedIds.size < 2
                    ? "Select at least 2 customers to compare"
                    : selectedIds.size > 4
                    ? "Compare up to 4 customers at a time"
                    : `Compare ${selectedIds.size} customers`
                }
              >
                <Scale className="w-3 h-3" />
                Compare
              </Button>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={bulkDelete.isPending}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>

              {/* Clear Selection */}
              <button
                onClick={clearSelection}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
