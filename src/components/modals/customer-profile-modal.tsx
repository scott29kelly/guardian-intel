"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Home,
  Shield,
  Calendar,
  Clock,
  User,
  FileText,
  History,
  Edit,
  Trash2,
  ExternalLink,
  Camera,
  Zap,
  Bot,
  FileCheck,
} from "lucide-react";
import { TakeActionModal } from "./take-action-modal";
import { Customer, mockIntelItems, mockWeatherEvents } from "@/lib/mock-data";
import { calculateCustomerScores } from "@/lib/services/scoring";
import { StreetViewPreview } from "@/components/property/street-view-preview";
import { ActivityTimeline } from "@/components/customer/activity-timeline";
import { CustomerClaimsTab } from "@/components/claims/customer-claims-tab";
import { CustomerPhotosTab } from "@/components/photos/customer-photos-tab";
import { CustomerContractsTab } from "@/components/contracts/customer-contracts-tab";

interface CustomerProfileModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onAskAI?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};

interface Note {
  id: string;
  date: string;
  note: string;
  user: string;
}

export function CustomerProfileModal({
  customer,
  isOpen,
  onClose,
  onAskAI,
}: CustomerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "claims" | "contracts" | "photos" | "notes">("overview");
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [notes, setNotes] = useState<Note[]>([
    { id: "1", date: "Jan 5, 2026", note: "Customer very interested in insurance claim process. Has visible hail damage on north-facing roof slope.", user: "Sarah Mitchell" },
    { id: "2", date: "Jan 2, 2026", note: "Roof is 24 years old, 3-tab shingles. Multiple storm events in area. High priority for inspection.", user: "System" },
  ]);

  // Calculate dynamic scores based on customer data
  const customerIntel = mockIntelItems.filter(i => i.customerId === customer.id);
  const customerWeather = mockWeatherEvents.filter(e => e.customerId === customer.id);
  const scores = calculateCustomerScores({
    customer,
    intelItems: customerIntel,
    weatherEvents: customerWeather,
  });

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      note: newNoteText.trim(),
      user: "S. Mitchell", // Current user
    };
    
    setNotes([newNote, ...notes]);
    setNewNoteText("");
    setShowAddNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Modal - Properly centered using inset and auto margins */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 m-auto w-[95vw] max-w-[800px] h-[90vh] max-h-[85vh] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl z-[9999] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-secondary/50">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg"
                  style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}
                >
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-text-primary">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="data-badge capitalize">{customer.status}</span>
                    <span className="font-mono text-xs text-text-muted">ID: {customer.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { id: "overview", label: "Overview", icon: User },
                { id: "timeline", label: "Timeline", icon: History },
                { id: "claims", label: "Claims", icon: FileCheck },
                { id: "contracts", label: "Contracts", icon: FileText },
                { id: "photos", label: "Photos", icon: Camera },
                { id: "notes", label: "Notes", icon: Edit },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`
                      flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-all
                      ${activeTab === tab.id 
                        ? "text-accent-primary border-b-2 border-accent-primary bg-surface-secondary/30" 
                        : "text-text-muted hover:text-text-secondary"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Street View Preview */}
                  <div className="panel p-4">
                    <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5" />
                      Property Street View
                    </h3>
                    <StreetViewPreview
                      address={customer.address}
                      city={customer.city}
                      state={customer.state}
                      zipCode={customer.zipCode}
                      height="220px"
                      showControls={true}
                      showExpandButton={false}
                    />
                  </div>

                  {/* Contact & Property Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Contact Info */}
                    <div className="panel p-4">
                      <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        Contact Information
                      </h3>
                      <div className="space-y-3">
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-accent-primary hover:underline">
                          <Phone className="w-4 h-4" />
                          <span className="font-mono text-sm">{customer.phone}</span>
                        </a>
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-text-secondary hover:text-accent-primary">
                          <Mail className="w-4 h-4" />
                          <span className="font-mono text-sm">{customer.email}</span>
                        </a>
                        <div className="flex items-start gap-3 text-text-secondary">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <div className="font-mono text-sm">
                            <p>{customer.address}</p>
                            <p>{customer.city}, {customer.state} {customer.zipCode}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Property Info */}
                    <div className="panel p-4">
                      <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" />
                        Property Details
                      </h3>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Type</span>
                          <span className="text-text-secondary">{customer.propertyType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Year Built</span>
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
                          <span className="text-text-muted">Roof Age</span>
                          <span className={customer.roofAge > 15 ? "text-accent-danger" : "text-text-secondary"}>
                            {customer.roofAge} years
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Value</span>
                          <span className="text-accent-success">{formatCurrency(customer.propertyValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insurance & Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Insurance */}
                    <div className="panel p-4">
                      <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        Insurance
                      </h3>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Carrier</span>
                          <span className="text-text-secondary">{customer.insuranceCarrier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Policy Type</span>
                          <span className="text-text-secondary">{customer.policyType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Deductible</span>
                          <span className="text-accent-success">{formatCurrency(customer.deductible)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="panel p-4">
                      <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
                        Scores & Metrics
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-surface-secondary rounded">
                          <div className="text-2xl font-mono font-bold text-accent-success">{customer.leadScore}</div>
                          <div className="text-[10px] font-mono text-text-muted uppercase">Lead</div>
                        </div>
                        <div className="text-center p-2 bg-surface-secondary rounded cursor-help" title="Priority based on roof age, storms, and timing">
                          <div className="text-2xl font-mono font-bold text-accent-primary">{scores.urgencyScore}</div>
                          <div className="text-[10px] font-mono text-text-muted uppercase">Urgency</div>
                        </div>
                        <div className="text-center p-2 bg-surface-secondary rounded cursor-help" title="Likelihood of closing based on engagement">
                          <div className="text-2xl font-mono font-bold text-accent-warning">{scores.retentionScore}</div>
                          <div className="text-[10px] font-mono text-text-muted uppercase">Retention</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex justify-between items-center cursor-help" title={`Based on ${customer.squareFootage.toLocaleString()} sqft, ${customer.roofType}`}>
                          <span className="font-mono text-xs text-text-muted">Est. Profit</span>
                          <span className="font-mono text-lg font-bold text-accent-success">
                            {formatCurrency(scores.profitPotential)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sales Info */}
                  <div className="panel p-4">
                    <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Sales Information
                    </h3>
                    <div className="grid grid-cols-4 gap-4 font-mono text-sm">
                      <div>
                        <span className="text-text-muted block text-xs">Assigned To</span>
                        <span className="text-text-primary">{typeof customer.assignedRep === 'object' ? customer.assignedRep?.name : customer.assignedRep ?? 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-xs">Stage</span>
                        <span className="text-text-primary capitalize">{customer.stage}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-xs">Last Contact</span>
                        <span className="text-text-primary">{new Date((customer as any).lastContact || (customer as any).updatedAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-xs">Next Action</span>
                        <span className="text-accent-primary">{(customer as any).nextAction || 'No action scheduled'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <ActivityTimeline
                  customerId={customer.id}
                  maxHeight="calc(90vh - 280px)"
                  limit={20}
                />
              )}

              {activeTab === "claims" && (
                <CustomerClaimsTab
                  customerId={customer.id}
                  customerName={`${customer.firstName} ${customer.lastName}`}
                />
              )}

              {activeTab === "contracts" && (
                <CustomerContractsTab
                  customerId={customer.id}
                  customerName={`${customer.firstName} ${customer.lastName}`}
                />
              )}

              {activeTab === "photos" && (
                <CustomerPhotosTab
                  customerId={customer.id}
                  customerName={`${customer.firstName} ${customer.lastName}`}
                />
              )}

              {activeTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-text-muted font-mono text-sm">Customer notes:</p>
                    <button 
                      onClick={() => setShowAddNote(!showAddNote)}
                      className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                    >
                      {showAddNote ? "Cancel" : "+ Add Note"}
                    </button>
                  </div>

                  {/* Add Note Form */}
                  {showAddNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="panel p-4 border-accent-primary/50"
                    >
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Enter note about this customer..."
                        className="w-full h-24 px-3 py-2 bg-surface-secondary border border-border rounded font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            setShowAddNote(false);
                            setNewNoteText("");
                          }}
                          className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-muted hover:text-text-primary transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNote}
                          disabled={!newNoteText.trim()}
                          className="px-3 py-1.5 rounded font-mono text-xs text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: newNoteText.trim() ? `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` : undefined }}
                        >
                          Save Note
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <div className="panel p-8 text-center">
                      <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="font-mono text-sm text-text-muted">No notes yet</p>
                      <p className="font-mono text-xs text-text-muted mt-1">Click "+ Add Note" to create one</p>
                    </div>
                  ) : (
                    notes.map((item) => (
                      <div key={item.id} className="panel p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-text-muted">{item.user} • {item.date}</span>
                          <button 
                            onClick={() => handleDeleteNote(item.id)}
                            className="text-text-muted hover:text-accent-danger transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-mono text-sm text-text-secondary">{item.note}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-surface-secondary/30 flex items-center justify-between">
              <button className="px-4 py-2 text-accent-danger font-mono text-xs uppercase tracking-wider hover:bg-[hsl(var(--accent-danger)/0.1)] rounded transition-all">
                Delete Customer
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                >
                  Close
                </button>
                <button
                  onClick={onAskAI}
                  className="px-4 py-2 bg-intel-500/10 border border-intel-500/30 rounded font-mono text-xs text-intel-400 hover:bg-intel-500/20 transition-all flex items-center gap-2"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Ask AI
                </button>
                <button
                  onClick={() => setShowActionModal(true)}
                  className="px-4 py-2 rounded font-mono text-xs text-white flex items-center gap-2 transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Take Action
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

    </AnimatePresence>

      {/* Take Action Modal */}
      <TakeActionModal
        customer={customer}
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
      />

    </>
  );
}
