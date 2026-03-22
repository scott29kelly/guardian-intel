"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, History, FileText, Edit, Zap, Bot, Image } from "lucide-react";
import { TakeActionModal } from "./take-action-modal";
import type { Customer, IntelItem, WeatherEvent } from "@/types/crm";
import { calculateCustomerScores } from "@/lib/services/scoring";
import { ActivityTimeline } from "@/components/customer/activity-timeline";
import { ProfileOverviewTab } from "./customer-profile/profile-overview-tab";
import { ProfileNotesTab } from "./customer-profile/profile-notes-tab";
import { InfographicGeneratorModal } from "@/features/infographic-generator/components";

interface CustomerProfileModalProps {
  customer: Customer;
  intelItems?: IntelItem[];
  weatherEvents?: WeatherEvent[];
  isOpen: boolean;
  onClose: () => void;
  onAskAI?: () => void;
}

interface Note {
  id: string;
  date: string;
  note: string;
  user: string;
}

export function CustomerProfileModal({ customer, intelItems = [], weatherEvents = [], isOpen, onClose, onAskAI }: CustomerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "notes" | "infographics">("overview");
  const [showActionModal, setShowActionModal] = useState(false);
  const [showInfographicGenerator, setShowInfographicGenerator] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);

  const scores = calculateCustomerScores({ customer, intelItems, weatherEvents });

  const handleAddNote = (noteText: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      note: noteText,
      user: "S. Mitchell",
    };
    setNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "infographics", label: "Infographics", icon: Image },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999]"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-[95vw] max-w-[800px] h-[90vh] max-h-[85vh] bg-surface-primary border border-border rounded-lg shadow-2xl z-[9999] overflow-hidden flex flex-col"
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
                  <button onClick={onClose} className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-all ${
                        activeTab === tab.id
                          ? "text-accent-primary border-b-2 border-accent-primary bg-surface-secondary/30"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "overview" && <ProfileOverviewTab customer={customer} scores={scores} />}
                {activeTab === "timeline" && (
                  <ActivityTimeline customerId={customer.id} maxHeight="calc(90vh - 280px)" limit={20} />
                )}
                {activeTab === "notes" && (
                  <ProfileNotesTab notes={notes} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote} />
                )}
                {activeTab === "infographics" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-text-primary">Briefings</h3>
                      <button
                        onClick={() => setShowInfographicGenerator(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90"
                      >
                        <Zap className="h-3 w-3" />
                        Generate New
                      </button>
                    </div>
                    <p className="text-sm text-text-muted">
                      Generated briefings for this customer will appear here.
                    </p>
                    {/* Quick-launch presets */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-text-secondary">Quick Launch</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Pre-Knock Briefing", "Post-Storm Follow-up", "Insurance Meeting", "Customer Leave-Behind"].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setShowInfographicGenerator(true)}
                            className="px-3 py-2 text-xs text-text-secondary bg-surface-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors text-left"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-surface-secondary/30 flex items-center justify-between">
                <button className="px-4 py-2 text-accent-danger font-mono text-xs uppercase tracking-wider hover:bg-accent-danger/10 rounded transition-all">
                  Delete Customer
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                    Close
                  </button>
                  <button onClick={onAskAI} className="px-4 py-2 bg-intel-500/10 border border-intel-500/30 rounded font-mono text-xs text-intel-400 hover:bg-intel-500/20 transition-all flex items-center gap-2">
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

      <TakeActionModal customer={customer} isOpen={showActionModal} onClose={() => setShowActionModal(false)} />

      {/* Infographic Generator Modal */}
      {showInfographicGenerator && (
        <InfographicGeneratorModal
          isOpen={showInfographicGenerator}
          onClose={() => setShowInfographicGenerator(false)}
          customerId={customer.id}
          customerName={customer.firstName + " " + customer.lastName}
        />
      )}
    </>
  );
}
