"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Home,
  Calendar,
  DollarSign,
  Shield,
  CloudRain,
  AlertTriangle,
  TrendingUp,
  User,
  Clock,
  Zap,
} from "lucide-react";
import { cn, formatCurrency, timeAgo, getPriorityClass } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { Progress } from "@/components/ui/progress";
import type { Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";

interface CustomerIntelCardProps {
  customer: Customer;
  intelItems: IntelItem[];
  weatherEvents: WeatherEvent[];
}

export function CustomerIntelCard({
  customer,
  intelItems,
  weatherEvents,
}: CustomerIntelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalIntel = intelItems.filter((i) => i.priority === "critical");
  const highIntel = intelItems.filter((i) => i.priority === "high");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lead":
        return <Badge className="status-lead">Lead</Badge>;
      case "prospect":
        return <Badge variant="default">Prospect</Badge>;
      case "customer":
        return <Badge variant="success">Customer</Badge>;
      case "closed-won":
        return <Badge variant="success">Closed Won</Badge>;
      case "closed-lost":
        return <Badge variant="danger">Closed Lost</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 overflow-hidden",
        isExpanded && "glow-primary",
        criticalIntel.length > 0 && !isExpanded && "border-rose-500/30"
      )}
    >
      {/* Collapsed Header - Always Visible */}
      <div
        className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Customer Info + Scores */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Lead Score Ring */}
            <ScoreRing score={customer.leadScore} size="md" label="Lead Score" />

            {/* Customer Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-display text-lg font-semibold text-white truncate">
                  {customer.firstName} {customer.lastName}
                </h3>
                {getStatusBadge(customer.status)}
                {criticalIntel.length > 0 && (
                  <Badge variant="danger" className="animate-pulse">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {criticalIntel.length} Critical
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-surface-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {customer.city}, {customer.state}
                </span>
                <span className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  {customer.roofType} • {customer.roofAge}yr
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatCurrency(customer.profitPotential)} potential
                </span>
              </div>

              {/* Quick Intel Preview */}
              {!isExpanded && intelItems.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {intelItems.slice(0, 2).map((intel) => (
                    <span
                      key={intel.id}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        getPriorityClass(intel.priority)
                      )}
                    >
                      {intel.title}
                    </span>
                  ))}
                  {intelItems.length > 2 && (
                    <span className="text-xs text-surface-500">
                      +{intelItems.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Secondary Scores + Expand */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3">
              <ScoreRing score={customer.urgencyScore} size="sm" label="Urgency" />
              <ScoreRing
                score={100 - customer.churnRisk}
                size="sm"
                label="Retention"
              />
            </div>

            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-surface-700/50">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 py-4 border-b border-surface-700/50">
                <Button size="sm" variant="accent">
                  <Zap className="w-4 h-4" />
                  Quick Call
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </Button>
                <div className="ml-auto flex items-center gap-2 text-sm text-surface-400">
                  <Clock className="w-4 h-4" />
                  Last contact: {timeAgo(customer.lastContact)}
                </div>
              </div>

              {/* Grid Layout for Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Column 1: Contact & Property */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                      Contact Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-guardian-400" />
                        <span className="text-white">{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-guardian-400" />
                        <span className="text-white">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-guardian-400" />
                        <span className="text-white">
                          {customer.address}, {customer.city}, {customer.state}{" "}
                          {customer.zipCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                      Property Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-800/50 rounded-lg p-3">
                        <p className="text-xs text-surface-400">Year Built</p>
                        <p className="text-lg font-semibold text-white">
                          {customer.yearBuilt}
                        </p>
                      </div>
                      <div className="bg-surface-800/50 rounded-lg p-3">
                        <p className="text-xs text-surface-400">Sq Footage</p>
                        <p className="text-lg font-semibold text-white">
                          {customer.squareFootage.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-surface-800/50 rounded-lg p-3">
                        <p className="text-xs text-surface-400">Roof Age</p>
                        <p className="text-lg font-semibold text-white">
                          {customer.roofAge} years
                        </p>
                      </div>
                      <div className="bg-surface-800/50 rounded-lg p-3">
                        <p className="text-xs text-surface-400">Value</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(customer.propertyValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Insurance & Weather */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Insurance Intel
                    </h4>
                    <div className="bg-surface-800/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-surface-400">Carrier</span>
                        <span className="text-sm font-medium text-white">
                          {customer.insuranceCarrier}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-surface-400">Policy Type</span>
                        <span className="text-sm font-medium text-white">
                          {customer.policyType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-surface-400">Deductible</span>
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(customer.deductible)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {weatherEvents.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                        <CloudRain className="w-4 h-4 inline mr-1" />
                        Weather Events
                      </h4>
                      <div className="space-y-2">
                        {weatherEvents.map((event) => (
                          <div
                            key={event.id}
                            className="bg-surface-800/50 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-white capitalize">
                                {event.eventType} - {event.severity}
                              </p>
                              <p className="text-xs text-surface-400">
                                {event.eventDate.toLocaleDateString()}
                                {event.hailSize && ` • ${event.hailSize}" hail`}
                                {event.windSpeed && ` • ${event.windSpeed}mph winds`}
                              </p>
                            </div>
                            {!event.claimFiled && (
                              <Badge variant="warning" className="text-xs">
                                No Claim
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Intel Feed */}
                <div>
                  <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Intelligence Feed
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {intelItems.map((intel) => (
                      <div
                        key={intel.id}
                        className={cn(
                          "rounded-lg p-3 border",
                          intel.priority === "critical" &&
                            "bg-rose-500/10 border-rose-500/30",
                          intel.priority === "high" &&
                            "bg-amber-500/10 border-amber-500/30",
                          intel.priority === "medium" &&
                            "bg-guardian-500/10 border-guardian-500/30",
                          intel.priority === "low" &&
                            "bg-surface-800/50 border-surface-700/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-white">
                            {intel.title}
                          </p>
                          <Badge
                            className={cn("text-xs shrink-0", getPriorityClass(intel.priority))}
                          >
                            {intel.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-surface-400 leading-relaxed">
                          {intel.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-surface-500">
                            {intel.source} • {intel.confidence}% confidence
                          </span>
                          {intel.actionable && (
                            <Badge variant="accent" className="text-xs">
                              Actionable
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Next Action Bar */}
              <div className="mt-4 pt-4 border-t border-surface-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-400">
                    Assigned to{" "}
                    <span className="text-white font-medium">
                      {customer.assignedRep}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-surface-400">Next:</span>
                  <Badge variant="default">{customer.nextAction}</Badge>
                  <span className="text-sm text-surface-500">
                    {customer.nextActionDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
