"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { AddCustomerModal, CustomerFormData } from "@/components/modals/add-customer-modal";
import { formatCurrency, getStatusClass } from "@/lib/utils";
import { mockCustomers, mockIntelItems, mockWeatherEvents, Customer } from "@/lib/mock-data";
import { calculateCustomerScores } from "@/lib/services/scoring";
import { useToast } from "@/components/ui/toast";

// Helper to get calculated scores for a customer
const getCustomerScores = (customer: Customer) => {
  const customerIntel = mockIntelItems.filter(i => i.customerId === customer.id);
  const customerWeather = mockWeatherEvents.filter(e => e.customerId === customer.id);
  return calculateCustomerScores({
    customer,
    intelItems: customerIntel,
    weatherEvents: customerWeather,
  });
};

const getCustomerProfit = (customer: Customer) => getCustomerScores(customer).profitPotential;
const getCustomerUrgency = (customer: Customer) => getCustomerScores(customer).urgencyScore;

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
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("leadScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  
  // URL-based filtering for storm alerts
  const countyFilter = searchParams.get("counties");
  const stormFilter = searchParams.get("filter");
  const alertId = searchParams.get("alertId");
  
  // Show banner when filtering by storm
  const isStormFiltered = stormFilter === "storm-affected" && countyFilter;

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

  const handleAddCustomer = (formData: CustomerFormData) => {
    const newCustomer: Customer = {
      id: `new-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      propertyType: formData.propertyType,
      yearBuilt: 2000,
      squareFootage: 2500,
      roofType: formData.roofType,
      roofAge: formData.roofAge,
      propertyValue: 350000,
      insuranceCarrier: formData.insuranceCarrier,
      policyType: "HO-3",
      deductible: 1000,
      leadScore: 50,
      urgencyScore: 50,
      profitPotential: 18000,
      churnRisk: 15,
      status: "lead",
      stage: "new",
      assignedRep: "Current User",
      lastContact: new Date(),
      nextAction: "Initial contact",
      nextActionDate: new Date(Date.now() + 86400000),
    };
    
    setCustomers(prev => [newCustomer, ...prev]);
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

  // Parse counties from URL for storm filtering
  const targetCounties = countyFilter 
    ? countyFilter.split(",").map(c => c.trim().toLowerCase())
    : [];

  // Filter and sort customers
  const filteredCustomers = customers
    .filter((customer) => {
      // County filter from storm alerts - match by city or nearby area
      if (isStormFiltered && targetCounties.length > 0) {
        // Map cities to their counties for PA, NJ, DE, MD, VA, NY
        const cityToCounty: Record<string, string> = {
          // Bucks County, PA
          "southampton": "bucks",
          "warminster": "bucks",
          "doylestown": "bucks",
          "bensalem": "bucks",
          "newtown": "bucks",
          "langhorne": "bucks",
          "levittown": "bucks",
          "bristol": "bucks",
          "quakertown": "bucks",
          // Montgomery County, PA
          "king of prussia": "montgomery",
          "norristown": "montgomery",
          "lansdale": "montgomery",
          "plymouth meeting": "montgomery",
          "blue bell": "montgomery",
          "conshohocken": "montgomery",
          "ambler": "montgomery",
          "horsham": "montgomery",
          // Philadelphia County
          "philadelphia": "philadelphia",
          // Delaware County, PA
          "media": "delaware",
          "springfield": "delaware",
          "upper darby": "delaware",
          "drexel hill": "delaware",
          // New Castle County, DE
          "wilmington": "new castle",
          "newark": "new castle",
          "bear": "new castle",
          // Spotsylvania County, VA
          "fredericksburg": "spotsylvania",
          "spotsylvania": "spotsylvania",
          // Others
          "baltimore": "baltimore",
          "cherry hill": "camden",
          "trenton": "mercer",
          "richmond": "henrico",
          "arlington": "arlington",
          "brooklyn": "kings",
          "albany": "albany",
        };
        
        const customerCity = customer.city.toLowerCase();
        const customerCounty = cityToCounty[customerCity];
        
        // Check if customer is in one of the target counties
        const matchesCounty = customerCounty && targetCounties.includes(customerCounty);
        if (!matchesCounty) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        const matchesSearch =
          fullName.includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.includes(query) ||
          customer.address.toLowerCase().includes(query) ||
          customer.city.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && customer.status !== statusFilter) return false;

      // Stage filter
      if (stageFilter !== "all" && customer.stage !== stageFilter) return false;

      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case "leadScore":
          aVal = a.leadScore;
          bVal = b.leadScore;
          break;
        case "urgencyScore":
          aVal = getCustomerUrgency(a);
          bVal = getCustomerUrgency(b);
          break;
        case "profitPotential":
          aVal = getCustomerProfit(a);
          bVal = getCustomerProfit(b);
          break;
        case "lastContact":
          aVal = a.lastContact.getTime();
          bVal = b.lastContact.getTime();
          break;
        case "name":
          aVal = `${a.firstName} ${a.lastName}`;
          bVal = `${b.firstName} ${b.lastName}`;
          break;
        default:
          aVal = a.leadScore;
          bVal = b.leadScore;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const getCustomerIntel = (customerId: string) =>
    mockIntelItems.filter((i) => i.customerId === customerId);

  const getCustomerWeather = (customerId: string) =>
    mockWeatherEvents.filter((w) => w.customerId === customerId);

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

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or address..."
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
      {viewMode === "cards" ? (
        <div className="space-y-4">
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CustomerIntelCard
                customer={customer}
                intelItems={getCustomerIntel(customer.id)}
                weatherEvents={getCustomerWeather(customer.id)}
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
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-border/50 hover:bg-surface-secondary/30">
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
      {filteredCustomers.length === 0 && (
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCustomer}
      />
    </motion.div>
  );
}
