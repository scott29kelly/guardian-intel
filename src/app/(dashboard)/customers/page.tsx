"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { formatCurrency, getStatusClass } from "@/lib/utils";
import { mockCustomers, mockIntelItems, mockWeatherEvents } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

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
  { value: "profitPotential", label: "Profit Potential" },
  { value: "lastContact", label: "Last Contact" },
  { value: "name", label: "Name" },
];

type ViewMode = "cards" | "table";

export default function CustomersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("leadScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const handleImport = () => {
    showToast("info", "Import Started", "Select a CSV or Excel file to import customers...");
  };

  const handleExport = () => {
    showToast("success", "Export Complete", `${filteredCustomers.length} customers exported to CSV`);
  };

  const handleAddCustomer = () => {
    showToast("info", "Add Customer", "Opening new customer form...");
  };

  const handleRowAction = (customerId: string, customerName: string) => {
    showToast("info", "Quick Actions", `Opening actions for ${customerName}...`);
  };

  // Filter and sort customers
  const filteredCustomers = mockCustomers
    .filter((customer) => {
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
          aVal = a.urgencyScore;
          bVal = b.urgencyScore;
          break;
        case "profitPotential":
          aVal = a.profitPotential;
          bVal = b.profitPotential;
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

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
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
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Customers
          </h1>
          <p className="text-surface-400">
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
          <Button onClick={handleAddCustomer}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-guardian-500/50 focus:ring-1 focus:ring-guardian-500/25 transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:border-guardian-500/50"
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
              className="px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:border-guardian-500/50"
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
              className="px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:border-guardian-500/50"
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
            <div className="flex border border-surface-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 text-sm ${
                  viewMode === "cards"
                    ? "bg-guardian-500/20 text-guardian-400"
                    : "text-surface-400 hover:text-white"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm ${
                  viewMode === "table"
                    ? "bg-guardian-500/20 text-guardian-400"
                    : "text-surface-400 hover:text-white"
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-surface-500">
              {filteredCustomers.length} customers
            </span>
            {(statusFilter !== "all" || stageFilter !== "all" || searchQuery) && (
              <>
                <span className="text-surface-700">|</span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 hover:text-white"
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
                      className="ml-1 hover:text-white"
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
                      className="ml-1 hover:text-white"
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
                  <tr className="border-b border-surface-700/50">
                    <th className="text-left py-4 px-4 text-sm font-medium text-surface-400">Customer</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-surface-400">Location</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-surface-400">Lead Score</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-surface-400">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-surface-400">Stage</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-surface-400">Potential</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-surface-400">Assigned</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-surface-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
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
                        <div className="flex items-center gap-1 text-sm text-surface-300">
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
                        <span className="text-sm text-surface-300 capitalize">{customer.stage}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-medium text-emerald-400">
                          {formatCurrency(customer.profitPotential)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-surface-300">{customer.assignedRep}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRowAction(customer.id, `${customer.firstName} ${customer.lastName}`)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-surface-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No customers found</h3>
            <p className="text-surface-400 mb-4">
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
    </motion.div>
  );
}
