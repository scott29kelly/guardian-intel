"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Scale,
  Home,
  Shield,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  Ruler,
} from "lucide-react";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getStatusClass, cn } from "@/lib/utils";

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
}

interface CustomerCompareModalProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

// Helper to determine if a value is the "best" among compared customers
function isBestValue(
  value: number | null | undefined,
  allValues: (number | null | undefined)[],
  higherIsBetter = true
): boolean {
  const numericValues = allValues.filter((v): v is number => v != null);
  if (numericValues.length < 2 || value == null) return false;
  
  const best = higherIsBetter 
    ? Math.max(...numericValues) 
    : Math.min(...numericValues);
  
  return value === best && numericValues.filter(v => v === best).length === 1;
}

// Helper to determine if a value is the "worst" among compared customers
function isWorstValue(
  value: number | null | undefined,
  allValues: (number | null | undefined)[],
  higherIsBetter = true
): boolean {
  const numericValues = allValues.filter((v): v is number => v != null);
  if (numericValues.length < 2 || value == null) return false;
  
  const worst = higherIsBetter 
    ? Math.min(...numericValues) 
    : Math.max(...numericValues);
  
  return value === worst && numericValues.filter(v => v === worst).length === 1;
}

// Comparison row component
function CompareRow({
  label,
  icon: Icon,
  values,
  format = "text",
  higherIsBetter = true,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  values: { value: string | number | null; customerId: string }[];
  format?: "text" | "currency" | "number" | "years" | "sqft";
  higherIsBetter?: boolean;
}) {
  const numericValues = values.map((v) =>
    typeof v.value === "number" ? v.value : null
  );

  const formatValue = (val: string | number | null): string => {
    if (val == null) return "—";
    if (typeof val === "string") return val;

    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "number":
        return val.toLocaleString();
      case "years":
        return `${val} yrs`;
      case "sqft":
        return `${val.toLocaleString()} sqft`;
      default:
        return String(val);
    }
  };

  return (
    <div className="grid gap-4 py-3 border-b border-border/50 last:border-0" 
         style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="flex items-center gap-2 text-text-muted">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
      </div>
      {values.map((v, idx) => {
        const isBest = isBestValue(
          typeof v.value === "number" ? v.value : null,
          numericValues,
          higherIsBetter
        );
        const isWorst = isWorstValue(
          typeof v.value === "number" ? v.value : null,
          numericValues,
          higherIsBetter
        );

        return (
          <div
            key={v.customerId + idx}
            className={cn(
              "text-center font-mono text-sm",
              isBest && "text-emerald-400 font-semibold",
              isWorst && "text-rose-400",
              !isBest && !isWorst && "text-text-secondary"
            )}
          >
            {formatValue(v.value)}
            {isBest && <span className="ml-1 text-[10px]">★</span>}
          </div>
        );
      })}
    </div>
  );
}

// Score comparison component with visual rings
function ScoreCompareRow({
  label,
  customers,
  scoreKey,
}: {
  label: string;
  customers: Customer[];
  scoreKey: "leadScore" | "urgencyScore" | "profitPotential";
}) {
  const scores = customers.map((c) => c[scoreKey]);
  const maxScore = Math.max(...scores);
  const hasVariance = new Set(scores).size > 1;

  return (
    <div
      className="grid gap-4 py-4"
      style={{ gridTemplateColumns: `140px repeat(${customers.length}, 1fr)` }}
    >
      <div className="flex items-center gap-2 text-text-muted">
        <TrendingUp className="w-4 h-4" />
        <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
      </div>
      {customers.map((customer) => {
        const score = customer[scoreKey];
        const isBest = hasVariance && score === maxScore && scores.filter(s => s === maxScore).length === 1;

        return (
          <div
            key={customer.id}
            className={cn(
              "flex justify-center",
              isBest && "relative"
            )}
          >
            {isBest && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold z-10">
                ★
              </div>
            )}
            <ScoreRing
              score={scoreKey === "profitPotential" ? Math.min(99, Math.round(score / 200)) : score}
              size="sm"
              showLabel={false}
            />
          </div>
        );
      })}
    </div>
  );
}

export function CustomerCompareModal({
  customers,
  isOpen,
  onClose,
}: CustomerCompareModalProps) {
  if (!isOpen || customers.length < 2) return null;

  // Grid layout: 2 customers = 2 columns, 3-4 = responsive grid
  const isGridLayout = customers.length > 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 m-auto w-[95vw] max-w-[1100px] h-[90vh] max-h-[85vh] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl z-[9999] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-secondary/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-text-primary">
                    Compare Customers
                  </h2>
                  <p className="text-sm text-text-muted">
                    Comparing {customers.length} customers side by side
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop-only message for mobile */}
            <div className="md:hidden flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Scale className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Desktop Feature
              </h3>
              <p className="text-text-muted max-w-xs">
                Customer comparison works best on larger screens. Please use a desktop or tablet for the full experience.
              </p>
            </div>

            {/* Content - Desktop */}
            <div className="hidden md:flex flex-col flex-1 overflow-y-auto">
              {/* Customer Headers */}
              <div
                className="grid gap-4 p-4 border-b border-border bg-surface-secondary/30 sticky top-0 z-10"
                style={{ gridTemplateColumns: `140px repeat(${customers.length}, 1fr)` }}
              >
                <div />
                {customers.map((customer) => (
                  <div key={customer.id} className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-display font-bold text-lg"
                      style={{
                        background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
                      }}
                    >
                      {customer.firstName[0]}
                      {customer.lastName[0]}
                    </div>
                    <h3 className="font-semibold text-text-primary">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    <div className="flex items-center justify-center gap-1 mt-1 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />
                      {customer.city}, {customer.state}
                    </div>
                    <Badge className={cn("mt-2", getStatusClass(customer.status))}>
                      {customer.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Scores Section */}
              <div className="px-4 py-2 bg-surface-secondary/20">
                <h4 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Scores & Metrics
                </h4>
              </div>
              <div className="px-4">
                <ScoreCompareRow
                  label="Lead Score"
                  customers={customers}
                  scoreKey="leadScore"
                />
                <ScoreCompareRow
                  label="Urgency"
                  customers={customers}
                  scoreKey="urgencyScore"
                />
                <CompareRow
                  label="Est. Profit"
                  icon={DollarSign}
                  values={customers.map((c) => ({
                    value: c.profitPotential,
                    customerId: c.id,
                  }))}
                  format="currency"
                  higherIsBetter={true}
                />
              </div>

              {/* Pipeline Section */}
              <div className="px-4 py-2 bg-surface-secondary/20 mt-2">
                <h4 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Pipeline Status
                </h4>
              </div>
              <div className="px-4">
                <CompareRow
                  label="Status"
                  values={customers.map((c) => ({
                    value: c.status,
                    customerId: c.id,
                  }))}
                />
                <CompareRow
                  label="Stage"
                  values={customers.map((c) => ({
                    value: c.stage,
                    customerId: c.id,
                  }))}
                />
              </div>

              {/* Property Details Section */}
              <div className="px-4 py-2 bg-surface-secondary/20 mt-2">
                <h4 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Property Details
                </h4>
              </div>
              <div className="px-4">
                <CompareRow
                  label="Type"
                  icon={Building}
                  values={customers.map((c) => ({
                    value: c.propertyType,
                    customerId: c.id,
                  }))}
                />
                <CompareRow
                  label="Year Built"
                  icon={Calendar}
                  values={customers.map((c) => ({
                    value: c.yearBuilt,
                    customerId: c.id,
                  }))}
                  format="number"
                  higherIsBetter={true}
                />
                <CompareRow
                  label="Size"
                  icon={Ruler}
                  values={customers.map((c) => ({
                    value: c.squareFootage,
                    customerId: c.id,
                  }))}
                  format="sqft"
                  higherIsBetter={true}
                />
                <CompareRow
                  label="Property Value"
                  icon={Home}
                  values={customers.map((c) => ({
                    value: c.propertyValue,
                    customerId: c.id,
                  }))}
                  format="currency"
                  higherIsBetter={true}
                />
                <CompareRow
                  label="Roof Type"
                  values={customers.map((c) => ({
                    value: c.roofType,
                    customerId: c.id,
                  }))}
                />
                <CompareRow
                  label="Roof Age"
                  values={customers.map((c) => ({
                    value: c.roofAge,
                    customerId: c.id,
                  }))}
                  format="years"
                  higherIsBetter={false}
                />
              </div>

              {/* Insurance Section */}
              <div className="px-4 py-2 bg-surface-secondary/20 mt-2">
                <h4 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Insurance Details
                </h4>
              </div>
              <div className="px-4 pb-4">
                <CompareRow
                  label="Carrier"
                  icon={Shield}
                  values={customers.map((c) => ({
                    value: c.insuranceCarrier,
                    customerId: c.id,
                  }))}
                />
                <CompareRow
                  label="Policy Type"
                  values={customers.map((c) => ({
                    value: c.policyType,
                    customerId: c.id,
                  }))}
                />
                <CompareRow
                  label="Deductible"
                  values={customers.map((c) => ({
                    value: c.deductible,
                    customerId: c.id,
                  }))}
                  format="currency"
                  higherIsBetter={false}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="hidden md:flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30">
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Best value
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  Needs attention
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
