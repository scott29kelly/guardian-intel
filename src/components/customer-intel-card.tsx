"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Home,
  CloudLightning,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";

interface CustomerIntelCardProps {
  customer: Customer;
  intelItems: IntelItem[];
  weatherEvents: WeatherEvent[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (score >= 60) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
  if (score >= 40) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  return "text-zinc-400 bg-zinc-700/50 border-zinc-600/30";
};

export function CustomerIntelCard({
  customer,
  intelItems,
  weatherEvents,
}: CustomerIntelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalItems = intelItems.filter((i) => i.priority === "critical");
  const hasStormDamage = weatherEvents.length > 0;
  
  // Calculate retention score (inverse of churn risk)
  const retentionScore = 100 - customer.churnRisk;

  return (
    <motion.div
      layout
      className={`
        panel overflow-hidden cursor-pointer transition-all duration-300
        ${isExpanded ? "glow-intel" : "hover:border-zinc-600"}
        ${hasStormDamage ? "border-l-2 border-l-orange-500" : ""}
      `}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Score Ring */}
          <div className="relative flex-shrink-0">
            <div className={`
              w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center
              ${getScoreColor(customer.leadScore)}
            `}>
              <span className="font-mono text-2xl font-bold">{customer.leadScore}</span>
              <span className="font-mono text-[8px] uppercase tracking-wider opacity-70">SCORE</span>
            </div>
            {criticalItems.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="font-mono text-[10px] font-bold text-white">{criticalItems.length}</span>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-sans font-bold text-lg text-white tracking-wide">
                  {customer.firstName} {customer.lastName}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`
                    data-badge capitalize
                    ${customer.status === "prospect" ? "border-cyan-500/30 text-cyan-400" : ""}
                    ${customer.status === "customer" ? "border-emerald-500/30 text-emerald-400" : ""}
                    ${customer.status === "lead" ? "border-zinc-500/30 text-zinc-400" : ""}
                  `}>
                    {customer.status}
                  </span>
                  {hasStormDamage && (
                    <span className="data-badge border-orange-500/30 text-orange-400 flex items-center gap-1">
                      <CloudLightning className="w-3 h-3" />
                      STORM AFFECTED
                    </span>
                  )}
                </div>
              </div>

              {/* Profit Potential */}
              <div className="text-right">
                <span className="font-mono text-xs text-zinc-500 uppercase">Potential</span>
                <p className="font-mono text-xl font-bold text-emerald-400">
                  {formatCurrency(customer.profitPotential)}
                </p>
              </div>
            </div>

            {/* Quick Info Row */}
            <div className="flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">{customer.city}, {customer.state}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">
                  {customer.roofType} • {customer.roofAge}yr
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">
                  {Math.floor((Date.now() - customer.lastContact.getTime()) / (1000 * 60 * 60 * 24))}d ago
                </span>
              </div>
            </div>

            {/* Intel Highlights */}
            {intelItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {intelItems.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className={`
                      px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider
                      ${item.priority === "critical" 
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" 
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }
                    `}
                  >
                    {item.title}
                  </span>
                ))}
                {intelItems.length > 3 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500">
                    +{intelItems.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="flex-shrink-0 flex items-center gap-6">
            <div className="text-center">
              <div className={`
                w-12 h-12 rounded border flex items-center justify-center mb-1
                ${getScoreColor(customer.urgencyScore)}
              `}>
                <span className="font-mono text-lg font-bold">{customer.urgencyScore}</span>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase">Urgency</span>
            </div>
            <div className="text-center">
              <div className={`
                w-12 h-12 rounded border flex items-center justify-center mb-1
                ${getScoreColor(retentionScore)}
              `}>
                <span className="font-mono text-lg font-bold">{retentionScore}</span>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase">Retention</span>
            </div>
            
            {/* Expand Button */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </motion.div>
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
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-zinc-700/50 bg-zinc-900/50">
              <div className="grid grid-cols-4 gap-px bg-zinc-700/30">
                {/* Contact Info */}
                <div className="p-4 bg-zinc-900/80">
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    Contact
                  </h4>
                  <div className="space-y-2">
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-mono text-sm">{customer.phone}</span>
                    </a>
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="font-mono text-sm truncate">{customer.email}</span>
                    </a>
                    <div className="flex items-start gap-2 text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 mt-0.5" />
                      <span className="font-mono text-sm">{customer.address}, {customer.city}, {customer.state} {customer.zipCode}</span>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-4 bg-zinc-900/80">
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Home className="w-3 h-3" />
                    Property
                  </h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Built</span>
                      <span className="text-zinc-300">{customer.yearBuilt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Size</span>
                      <span className="text-zinc-300">{customer.squareFootage.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Roof</span>
                      <span className="text-zinc-300">{customer.roofType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Age</span>
                      <span className={customer.roofAge > 15 ? "text-orange-400" : "text-zinc-300"}>
                        {customer.roofAge} years
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Value</span>
                      <span className="text-zinc-300">{formatCurrency(customer.propertyValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Insurance */}
                <div className="p-4 bg-zinc-900/80">
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Insurance
                  </h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Carrier</span>
                      <span className="text-zinc-300">{customer.insuranceCarrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Type</span>
                      <span className="text-zinc-300">{customer.policyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Deductible</span>
                      <span className="text-emerald-400">{formatCurrency(customer.deductible)}</span>
                    </div>
                  </div>
                </div>

                {/* Weather Events */}
                <div className="p-4 bg-zinc-900/80">
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CloudLightning className="w-3 h-3" />
                    Weather Events
                  </h4>
                  {weatherEvents.length > 0 ? (
                    <div className="space-y-2">
                      {weatherEvents.map((event) => (
                        <div key={event.id} className="p-2 bg-zinc-800/50 rounded border border-zinc-700/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`
                              font-mono text-xs uppercase
                              ${event.severity === "severe" ? "text-orange-400" : "text-yellow-400"}
                            `}>
                              {event.eventType}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500">
                              {event.eventDate.toLocaleDateString()}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-zinc-400">
                            {event.hailSize && `${event.hailSize}" hail`}
                            {event.windSpeed && ` ${event.windSpeed} mph winds`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 font-mono text-sm">No recent events</p>
                  )}
                </div>
              </div>

              {/* Intel Feed */}
              {intelItems.length > 0 && (
                <div className="p-4 border-t border-zinc-700/50">
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Intelligence Feed
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {intelItems.map((item) => (
                      <div
                        key={item.id}
                        className={`
                          p-3 rounded border
                          ${item.priority === "critical" 
                            ? "bg-orange-500/5 border-orange-500/30" 
                            : "bg-zinc-800/50 border-zinc-700/50"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className={`
                            font-mono text-xs font-medium
                            ${item.priority === "critical" ? "text-orange-400" : "text-zinc-300"}
                          `}>
                            {item.title}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {item.confidence}%
                          </span>
                        </div>
                        <p className="font-mono text-xs text-zinc-500 line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="p-4 border-t border-zinc-700/50 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4 text-zinc-500 font-mono text-xs">
                  <span>Assigned: {customer.assignedRep}</span>
                  <span className="capitalize">Stage: {customer.stage}</span>
                  {customer.nextAction && (
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {customer.nextAction}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded font-mono text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all">
                    VIEW PROFILE
                  </button>
                  <button className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded font-mono text-xs text-white hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    TAKE ACTION
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
