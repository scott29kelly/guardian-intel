"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  FileText,
  Calendar,
  Eye,
  CheckSquare,
  Square,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatCurrency, getStatusClass } from "@/lib/utils";
import { Customer, getCustomerProfit } from "./types";

interface CustomersTableViewProps {
  customers: Customer[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectedIds: Set<string>;
  toggleSelectCustomer: (id: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onViewProfile: (customer: Customer) => void;
  onCallCustomer: (customer: Customer) => void;
  onEmailCustomer: (customer: Customer) => void;
  onScheduleAppointment: (customer: Customer) => void;
}

export function CustomersTableView({
  customers,
  selectedIndex,
  setSelectedIndex,
  selectedIds,
  toggleSelectCustomer,
  toggleSelectAll,
  isAllSelected,
  isSomeSelected,
  onViewProfile,
  onCallCustomer,
  onEmailCustomer,
  onScheduleAppointment,
}: CustomersTableViewProps) {
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  return (
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
              {customers.map((customer, index) => (
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
                    <span className="text-sm text-text-secondary">
                      {typeof customer.assignedRep === 'object' && customer.assignedRep
                        ? customer.assignedRep.name
                        : customer.assignedRep ?? 'Unassigned'}
                    </span>
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
                            onClick={() => { onViewProfile(customer); setShowActionsMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View Profile
                          </button>
                          <button
                            onClick={() => { onCallCustomer(customer); setShowActionsMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </button>
                          <button
                            onClick={() => { onEmailCustomer(customer); setShowActionsMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            Send Email
                          </button>
                          <button
                            onClick={() => { onScheduleAppointment(customer); setShowActionsMenu(null); }}
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
  );
}
