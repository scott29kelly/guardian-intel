"use client";

/**
 * PredictiveAlertsPanel Component
 * 
 * Full panel for displaying and managing storm predictions.
 * Shows timeline view, affected customers, and notification controls.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  Clock,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  Bell,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  Target,
  Calendar,
  Info,
  Phone,
  Mail,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PredictiveStormCard } from "./predictive-storm-card";
import {
  usePredictions,
  useAffectedCustomers,
  useSendPredictionNotification,
  type StormPrediction,
  type AffectedCustomer,
} from "@/lib/hooks/use-predictions";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

interface PredictiveAlertsPanelProps {
  onCustomerClick?: (customerId: string) => void;
  initialFilter?: "all" | "urgent" | "24h" | "48h" | "72h";
}

type TimeFilter = "all" | "24h" | "48h" | "72h";
type SeverityFilter = "all" | "marginal" | "slight" | "enhanced" | "moderate" | "high";

export function PredictiveAlertsPanel({
  onCustomerClick,
  initialFilter = "all",
}: PredictiveAlertsPanelProps) {
  const { showToast } = useToast();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    initialFilter === "urgent" ? "48h" : initialFilter as TimeFilter
  );
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(
    initialFilter === "urgent" ? "enhanced" : "all"
  );
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [selectedPrediction, setSelectedPrediction] = useState<StormPrediction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const hoursMap: Record<TimeFilter, number> = {
    all: 72,
    "24h": 24,
    "48h": 48,
    "72h": 72,
  };

  const { data: predictionsData, isLoading } = usePredictions({
    hours: hoursMap[timeFilter],
    state: stateFilter === "all" ? undefined : stateFilter,
    minSeverity: severityFilter === "all" ? undefined : severityFilter,
  });

  const { data: affectedCustomers, isLoading: customersLoading } = useAffectedCustomers(
    selectedPrediction?.id || null
  );

  const sendNotification = useSendPredictionNotification();

  const predictions = predictionsData?.data || [];

  // Group predictions by time bucket
  const groupedPredictions = useMemo(() => {
    const next24: StormPrediction[] = [];
    const next48: StormPrediction[] = [];
    const next72: StormPrediction[] = [];

    for (const p of predictions) {
      if (p.hoursUntil <= 24) next24.push(p);
      else if (p.hoursUntil <= 48) next48.push(p);
      else next72.push(p);
    }

    return { next24, next48, next72 };
  }, [predictions]);

  // Get unique states from predictions
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    predictions.forEach((p) => p.affectedArea.states.forEach((s) => states.add(s)));
    return Array.from(states).sort();
  }, [predictions]);

  const handleNotify = async (prediction: StormPrediction) => {
    try {
      await sendNotification.mutateAsync({
        predictionId: prediction.id,
        title: `Storm Alert: ${prediction.type} - ${prediction.affectedArea.states.join(", ")}`,
        body: prediction.recommendation,
        severity: prediction.severity,
        hoursUntil: prediction.hoursUntil,
        affectedStates: prediction.affectedArea.states,
      });
      showToast("success", "Team Notified", "Push notifications sent successfully");
    } catch (err) {
      showToast("error", "Notification Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const urgentCount = predictions.filter(
    (p) => p.priorityLevel === "urgent" || p.priorityLevel === "critical"
  ).length;

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
              <CloudLightning className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">72-Hour Storm Forecast</h2>
              <p className="text-sm text-text-muted">
                Predictive alerts for first-mover advantage
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {urgentCount} Urgent
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <p className="text-2xl font-bold text-text-primary">{predictions.length}</p>
            <p className="text-xs text-text-muted">Total Predictions</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <p className="text-2xl font-bold text-orange-400">{groupedPredictions.next24.length}</p>
            <p className="text-xs text-text-muted">Next 24 Hours</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {predictions.reduce((sum, p) => sum + p.potentialAffectedCustomers, 0)}
            </p>
            <p className="text-xs text-text-muted">Affected Customers</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-secondary/50 text-center">
            <p className="text-2xl font-bold text-accent-success">
              {formatCurrency(predictions.reduce((sum, p) => sum + p.estimatedDamageValue, 0))}
            </p>
            <p className="text-xs text-text-muted">Potential Value</p>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-border grid grid-cols-3 gap-4">
                {/* Time Filter */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">Time Window</label>
                  <div className="flex gap-1">
                    {(["24h", "48h", "72h", "all"] as TimeFilter[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeFilter(t)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          timeFilter === t
                            ? "bg-accent-primary text-white"
                            : "bg-surface-secondary text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {t === "all" ? "All" : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">Min Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                    className="w-full px-3 py-1.5 bg-surface-secondary rounded border border-border text-sm text-text-primary"
                  >
                    <option value="all">All Severities</option>
                    <option value="marginal">Marginal+</option>
                    <option value="slight">Slight+</option>
                    <option value="enhanced">Enhanced+</option>
                    <option value="moderate">Moderate+</option>
                    <option value="high">High Only</option>
                  </select>
                </div>

                {/* State Filter */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">State</label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface-secondary rounded border border-border text-sm text-text-primary"
                  >
                    <option value="all">All States</option>
                    {availableStates.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Predictions List */}
        <div className="col-span-2 space-y-4">
          {isLoading ? (
            <div className="panel p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="panel p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
                <CloudLightning className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No Storms Predicted</h3>
              <p className="text-sm text-text-muted">
                The next {hoursMap[timeFilter]} hours look clear for your service area.
              </p>
            </div>
          ) : (
            <>
              {/* Timeline Groups */}
              {groupedPredictions.next24.length > 0 && (
                <TimelineSection
                  title="Next 24 Hours"
                  icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                  predictions={groupedPredictions.next24}
                  selected={selectedPrediction}
                  onSelect={setSelectedPrediction}
                  onNotify={handleNotify}
                  urgent
                />
              )}
              
              {groupedPredictions.next48.length > 0 && timeFilter !== "24h" && (
                <TimelineSection
                  title="24-48 Hours"
                  icon={<Clock className="w-4 h-4 text-amber-400" />}
                  predictions={groupedPredictions.next48}
                  selected={selectedPrediction}
                  onSelect={setSelectedPrediction}
                  onNotify={handleNotify}
                />
              )}
              
              {groupedPredictions.next72.length > 0 && (timeFilter === "72h" || timeFilter === "all") && (
                <TimelineSection
                  title="48-72 Hours"
                  icon={<Calendar className="w-4 h-4 text-text-muted" />}
                  predictions={groupedPredictions.next72}
                  selected={selectedPrediction}
                  onSelect={setSelectedPrediction}
                  onNotify={handleNotify}
                />
              )}
            </>
          )}
        </div>

        {/* Affected Customers Sidebar */}
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-secondary">Affected Customers</span>
              </div>
            </div>
            
            {selectedPrediction ? (
              <div className="p-3">
                <div className="mb-3 p-2 bg-surface-secondary/50 rounded text-xs text-text-muted">
                  Customers in {selectedPrediction.affectedArea.states.join(", ")} within{" "}
                  {selectedPrediction.affectedArea.radiusMiles} miles of predicted storm path
                </div>
                
                {customersLoading ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
                  </div>
                ) : affectedCustomers && affectedCustomers.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {affectedCustomers.slice(0, 20).map((customer) => (
                      <AffectedCustomerCard
                        key={customer.id}
                        customer={customer}
                        onClick={() => onCustomerClick?.(customer.id)}
                      />
                    ))}
                    {affectedCustomers.length > 20 && (
                      <p className="text-center text-xs text-text-muted py-2">
                        +{affectedCustomers.length - 20} more customers
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-text-muted">
                    No customers found in affected area
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Target className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">
                  Select a prediction to see affected customers
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Panel */}
          {selectedPrediction && affectedCustomers && affectedCustomers.length > 0 && (
            <div className="panel p-4">
              <h4 className="text-sm font-medium text-text-primary mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button size="sm" className="w-full">
                  <Zap className="w-4 h-4" />
                  Create Outreach Campaign
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="w-4 h-4" />
                  Send Pre-Storm Email
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Bell className="w-4 h-4" />
                  Alert Field Team
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface TimelineSectionProps {
  title: string;
  icon: React.ReactNode;
  predictions: StormPrediction[];
  selected: StormPrediction | null;
  onSelect: (p: StormPrediction) => void;
  onNotify: (p: StormPrediction) => void;
  urgent?: boolean;
}

function TimelineSection({
  title,
  icon,
  predictions,
  selected,
  onSelect,
  onNotify,
  urgent,
}: TimelineSectionProps) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 ${urgent ? "text-orange-400" : "text-text-muted"}`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="outline" className="text-[10px]">{predictions.length}</Badge>
      </div>
      <div className="space-y-3">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className={`transition-all ${selected?.id === prediction.id ? "ring-2 ring-accent-primary rounded-lg" : ""}`}
          >
            <PredictiveStormCard
              prediction={prediction}
              onClick={() => onSelect(prediction)}
              onNotify={() => onNotify(prediction)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface AffectedCustomerCardProps {
  customer: AffectedCustomer;
  onClick?: () => void;
}

function AffectedCustomerCard({ customer, onClick }: AffectedCustomerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-2 rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-primary">
          {customer.firstName} {customer.lastName}
        </span>
        <Badge variant="outline" className="text-[10px]">
          Score: {customer.leadScore}
        </Badge>
      </div>
      <p className="text-xs text-text-muted truncate">
        {customer.address}, {customer.city}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-text-muted">
          {customer.distanceFromCenter.toFixed(1)} mi away
        </span>
        {customer.estimatedJobValue && (
          <span className="text-[10px] text-accent-success">
            {formatCurrency(customer.estimatedJobValue)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default PredictiveAlertsPanel;
