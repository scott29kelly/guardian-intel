"use client";

import { motion } from "framer-motion";
import { CheckSquare, Square } from "lucide-react";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { Customer } from "./types";

interface CustomersCardViewProps {
  customers: Customer[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectedIds: Set<string>;
  toggleSelectCustomer: (id: string) => void;
}

export function CustomersCardView({
  customers,
  selectedIndex,
  setSelectedIndex,
  selectedIds,
  toggleSelectCustomer,
}: CustomersCardViewProps) {
  return (
    <div className="space-y-4">
      {customers.map((customer, index) => (
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
  );
}
