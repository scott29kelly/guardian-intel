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
  Bot,
  ClipboardList,
} from "lucide-react";
import { Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";
import { CustomerProfileModal } from "./modals/customer-profile-modal";
import { TakeActionModal } from "./modals/take-action-modal";
import { AIChatPanel } from "./ai/chat-panel";
import { QuickLogModal } from "./ai/quick-log-modal";
import { StreetViewThumbnail } from "./property/street-view-preview";

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
  if (score >= 80) return "text-accent-success bg-[hsl(var(--accent-success)/0.1)] border-[hsl(var(--accent-success)/0.3)]";
  if (score >= 60) return "text-accent-primary bg-[hsl(var(--accent-primary)/0.1)] border-[hsl(var(--accent-primary)/0.3)]";
  if (score >= 40) return "text-accent-warning bg-[hsl(var(--accent-warning)/0.1)] border-[hsl(var(--accent-warning)/0.3)]";
  return "text-text-muted bg-surface-secondary border-border";
};

export function CustomerIntelCard({
  customer,
  intelItems,
  weatherEvents,
}: CustomerIntelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);

  const criticalItems = intelItems.filter((i) => i.priority === "critical");
  const hasStormDamage = weatherEvents.length > 0;
  
  // Calculate retention score (inverse of churn risk)
  const retentionScore = 100 - customer.churnRisk;

  return (
    <>
      <motion.div
        layout
        className={`
          panel overflow-hidden cursor-pointer transition-all duration-300
          ${isExpanded ? "glow-intel" : "hover:border-[hsl(var(--border-hover))]"}
          ${hasStormDamage ? "border-l-2 border-l-[hsl(var(--accent-danger))]" : ""}
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
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[hsl(var(--accent-danger))] rounded-full flex items-center justify-center animate-pulse">
                  <span className="font-mono text-[10px] font-bold text-white">{criticalItems.length}</span>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-sans font-bold text-lg text-text-primary tracking-wide">
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`
                      data-badge capitalize
                      ${customer.status === "prospect" ? "border-[hsl(var(--accent-primary)/0.3)] text-accent-primary" : ""}
                      ${customer.status === "customer" ? "border-[hsl(var(--accent-success)/0.3)] text-accent-success" : ""}
                      ${customer.status === "lead" ? "border-border text-text-muted" : ""}
                    `}>
                      {customer.status}
                    </span>
                    {hasStormDamage && (
                      <span className="data-badge border-[hsl(var(--accent-danger)/0.3)] text-accent-danger flex items-center gap-1">
                        <CloudLightning className="w-3 h-3" />
                        STORM AFFECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Profit Potential */}
                <div className="text-right">
                  <span className="font-mono text-xs text-text-muted uppercase">Potential</span>
                  <p className="font-mono text-xl font-bold text-accent-success">
                    {formatCurrency(customer.profitPotential)}
                  </p>
                </div>
              </div>

              {/* Quick Info Row */}
              <div className="flex items-center gap-4 text-text-muted">
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
                          ? "bg-[hsl(var(--accent-danger)/0.1)] text-accent-danger border border-[hsl(var(--accent-danger)/0.3)]" 
                          : "bg-surface-secondary text-text-muted border border-border"
                        }
                      `}
                    >
                      {item.title}
                    </span>
                  ))}
                  {intelItems.length > 3 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-text-muted">
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
                <span className="font-mono text-[9px] text-text-muted uppercase">Urgency</span>
              </div>
              <div className="text-center">
                <div className={`
                  w-12 h-12 rounded border flex items-center justify-center mb-1
                  ${getScoreColor(retentionScore)}
                `}>
                  <span className="font-mono text-lg font-bold">{retentionScore}</span>
                </div>
                <span className="font-mono text-[9px] text-text-muted uppercase">Retention</span>
              </div>
              
              {/* Expand Button */}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                className="w-8 h-8 rounded bg-surface-secondary border border-border flex items-center justify-center"
              >
                <ChevronDown className="w-4 h-4 text-text-muted" />
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
              <div className="border-t border-border bg-surface-secondary/50">
                <div className="grid grid-cols-4 gap-px bg-border/30">
                  {/* Contact Info with Street View */}
                  <div className="p-4 bg-surface-primary/80">
                    <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      Contact
                    </h4>
                    <div className="flex gap-3">
                      {/* Street View Thumbnail */}
                      <StreetViewThumbnail
                        address={customer.address}
                        city={customer.city}
                        state={customer.state}
                        zipCode={customer.zipCode}
                        size={80}
                        onClick={() => setShowProfileModal(true)}
                      />
                      <div className="space-y-2 flex-1">
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-mono text-sm">{customer.phone}</span>
                        </a>
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="font-mono text-sm truncate">{customer.email}</span>
                        </a>
                        <div className="flex items-start gap-2 text-text-muted">
                          <MapPin className="w-3.5 h-3.5 mt-0.5" />
                          <span className="font-mono text-xs">{customer.city}, {customer.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-4 bg-surface-primary/80">
                    <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Home className="w-3 h-3" />
                      Property
                    </h4>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Built</span>
                        <span className="text-text-secondary">{customer.yearBuilt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Size</span>
                        <span className="text-text-secondary">{customer.squareFootage.toLocaleString()} sqft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Roof</span>
                        <span className="text-text-secondary">{customer.roofType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Age</span>
                        <span className={customer.roofAge > 15 ? "text-accent-danger" : "text-text-secondary"}>
                          {customer.roofAge} years
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Value</span>
                        <span className="text-text-secondary">{formatCurrency(customer.propertyValue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Insurance */}
                  <div className="p-4 bg-surface-primary/80">
                    <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Insurance
                    </h4>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Carrier</span>
                        <span className="text-text-secondary">{customer.insuranceCarrier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Type</span>
                        <span className="text-text-secondary">{customer.policyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Deductible</span>
                        <span className="text-accent-success">{formatCurrency(customer.deductible)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Weather Events */}
                  <div className="p-4 bg-surface-primary/80">
                    <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CloudLightning className="w-3 h-3" />
                      Weather Events
                    </h4>
                    {weatherEvents.length > 0 ? (
                      <div className="space-y-2">
                        {weatherEvents.map((event) => (
                          <div key={event.id} className="p-2 bg-surface-secondary/50 rounded border border-border/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`
                                font-mono text-xs uppercase
                                ${event.severity === "severe" ? "text-accent-danger" : "text-accent-warning"}
                              `}>
                                {event.eventType}
                              </span>
                              <span className="font-mono text-[10px] text-text-muted">
                                {event.eventDate.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-text-muted">
                              {event.hailSize && `${event.hailSize}" hail`}
                              {event.windSpeed && ` ${event.windSpeed} mph winds`}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted font-mono text-sm">No recent events</p>
                    )}
                  </div>
                </div>

                {/* Intel Feed */}
                {intelItems.length > 0 && (
                  <div className="p-4 border-t border-border/50">
                    <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
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
                              ? "bg-[hsl(var(--accent-danger)/0.05)] border-[hsl(var(--accent-danger)/0.3)]" 
                              : "bg-surface-secondary/50 border-border/50"
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className={`
                              font-mono text-xs font-medium
                              ${item.priority === "critical" ? "text-accent-danger" : "text-text-secondary"}
                            `}>
                              {item.title}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              {item.confidence}%
                            </span>
                          </div>
                          <p className="font-mono text-xs text-text-muted line-clamp-2">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="p-4 border-t border-border/50 flex items-center justify-between bg-surface-secondary/30">
                  <div className="flex items-center gap-4 text-text-muted font-mono text-xs">
                    <span>Assigned: {customer.assignedRep}</span>
                    <span className="capitalize">Stage: {customer.stage}</span>
                    {customer.nextAction && (
                      <span className="text-accent-primary flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {customer.nextAction}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickLog(true);
                      }}
                      className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all flex items-center gap-1"
                    >
                      <ClipboardList className="w-3 h-3" />
                      LOG
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAIChat(true);
                      }}
                      className="px-3 py-1.5 bg-intel-500/10 border border-intel-500/30 rounded font-mono text-xs text-intel-400 hover:bg-intel-500/20 transition-all flex items-center gap-1"
                    >
                      <Bot className="w-3 h-3" />
                      ASK AI
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileModal(true);
                      }}
                      className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                    >
                      VIEW PROFILE
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActionModal(true);
                      }}
                      className="px-3 py-1.5 rounded font-mono text-xs text-white hover:opacity-90 transition-all flex items-center gap-1"
                      style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                    >
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

      {/* Modals */}
      <CustomerProfileModal 
        customer={customer}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <TakeActionModal 
        customer={customer}
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
      />
      
      {/* AI Components */}
      <AIChatPanel
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        customerId={customer.id}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />
      <QuickLogModal
        isOpen={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        customerId={customer.id}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />
    </>
  );
}
