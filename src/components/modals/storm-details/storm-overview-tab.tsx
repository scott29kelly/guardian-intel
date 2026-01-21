"use client";

import { Phone, Users, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { StormEvent, AffectedCustomer, statusLabels } from "./types";

interface StormOverviewTabProps {
  event: StormEvent;
  affectedCustomers: AffectedCustomer[];
  onCallCustomer: (name: string, phone: string) => void;
  onViewAllCustomers: () => void;
}

export function StormOverviewTab({
  event,
  affectedCustomers,
  onCallCustomer,
  onViewAllCustomers,
}: StormOverviewTabProps) {
  return (
    <div className="p-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-surface-secondary/50 rounded-lg">
          {event.hailSize ? (
            <>
              <div className="text-2xl font-bold text-text-primary">{event.hailSize}"</div>
              <div className="text-xs text-text-muted">Hail Size</div>
            </>
          ) : event.windSpeed ? (
            <>
              <div className="text-2xl font-bold text-text-primary">{event.windSpeed}</div>
              <div className="text-xs text-text-muted">mph Winds</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-text-primary">-</div>
              <div className="text-xs text-text-muted">Metrics</div>
            </>
          )}
        </div>
        <div className="text-center p-3 bg-surface-secondary/50 rounded-lg">
          <div className="text-2xl font-bold text-text-primary">{event.affectedCustomers}</div>
          <div className="text-xs text-text-muted">Customers Affected</div>
        </div>
        <div className="text-center p-3 bg-amber-500/10 rounded-lg">
          <div className="text-2xl font-bold text-amber-400">{event.inspectionsPending}</div>
          <div className="text-xs text-text-muted">Inspections Pending</div>
        </div>
        <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(event.opportunity)}</div>
          <div className="text-xs text-text-muted">Opportunity Value</div>
        </div>
      </div>

      {/* Affected Customers */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-primary" />
            Affected Customers
          </h3>
          <button
            onClick={onViewAllCustomers}
            className="text-sm text-accent-primary hover:opacity-80 flex items-center gap-1"
          >
            View All
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {affectedCustomers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 bg-surface-secondary/30 rounded-lg border border-border hover:border-accent-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary/30 to-accent-primary/10 flex items-center justify-center text-sm font-medium text-accent-primary">
                  {customer.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{customer.name}</p>
                  <p className="text-xs text-text-muted">{customer.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusLabels[customer.status].color}>
                  {statusLabels[customer.status].label}
                </Badge>
                <button
                  onClick={() => onCallCustomer(customer.name, customer.phone)}
                  className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
