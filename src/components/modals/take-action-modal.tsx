"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Customer } from "@/lib/mock-data";

interface TakeActionModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

type ActionType = "call" | "email" | "meeting" | "note" | "task";

const actions = [
  { id: "call", label: "Log Call", icon: Phone, color: "accent-primary" },
  { id: "email", label: "Send Email", icon: Mail, color: "accent-secondary" },
  { id: "meeting", label: "Schedule Meeting", icon: Calendar, color: "accent-warning" },
  { id: "note", label: "Add Note", icon: FileText, color: "text-secondary" },
  { id: "task", label: "Create Task", icon: Clock, color: "accent-danger" },
] as const;

export function TakeActionModal({
  customer,
  isOpen,
  onClose,
}: TakeActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>("call");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<"positive" | "neutral" | "negative" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSuccess(true);
    
    // Close after showing success
    setTimeout(() => {
      setIsSuccess(false);
      setNotes("");
      setOutcome(null);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl z-[9999] overflow-hidden"
          >
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent-success)/0.2)] flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-accent-success" />
                </div>
                <h3 className="font-display font-bold text-xl text-text-primary mb-2">
                  Action Logged Successfully
                </h3>
                <p className="font-mono text-sm text-text-muted">
                  Activity recorded for {customer.firstName} {customer.lastName}
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div>
                    <h2 className="font-display font-bold text-lg text-text-primary">
                      Take Action
                    </h2>
                    <p className="font-mono text-xs text-text-muted">
                      {customer.firstName} {customer.lastName}
                    </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Action Type Selection */}
                  <div>
                    <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2 block">
                      Action Type
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {actions.map((action) => {
                        const Icon = action.icon;
                        const isSelected = selectedAction === action.id;
                        return (
                          <button
                            key={action.id}
                            onClick={() => setSelectedAction(action.id)}
                            className={`
                              flex flex-col items-center gap-1 p-3 rounded border transition-all
                              ${isSelected 
                                ? "bg-[hsl(var(--accent-primary)/0.1)] border-[hsl(var(--accent-primary)/0.5)] text-accent-primary" 
                                : "bg-surface-secondary border-border text-text-muted hover:text-text-secondary hover:border-border-hover"
                              }
                            `}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-mono text-[10px] uppercase">{action.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {selectedAction === "call" && (
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${customer.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[hsl(var(--accent-primary)/0.1)] border border-[hsl(var(--accent-primary)/0.3)] rounded text-accent-primary font-mono text-sm hover:bg-[hsl(var(--accent-primary)/0.2)] transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        Call {customer.phone}
                      </a>
                    </div>
                  )}

                  {selectedAction === "email" && (
                    <div className="flex gap-2">
                      <a 
                        href={`mailto:${customer.email}?subject=Following up on your roof assessment`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[hsl(var(--accent-secondary)/0.1)] border border-[hsl(var(--accent-secondary)/0.3)] rounded text-accent-secondary font-mono text-sm hover:bg-[hsl(var(--accent-secondary)/0.2)] transition-all"
                      >
                        <Mail className="w-4 h-4" />
                        Compose Email
                      </a>
                    </div>
                  )}

                  {/* Outcome (for calls) */}
                  {selectedAction === "call" && (
                    <div>
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2 block">
                        Outcome
                      </label>
                      <div className="flex gap-2">
                        {[
                          { id: "positive", label: "Positive", color: "accent-success" },
                          { id: "neutral", label: "Neutral", color: "accent-warning" },
                          { id: "negative", label: "Negative", color: "accent-danger" },
                        ].map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setOutcome(o.id as typeof outcome)}
                            className={`
                              flex-1 px-3 py-2 rounded border font-mono text-xs transition-all
                              ${outcome === o.id 
                                ? `bg-[hsl(var(--${o.color})/0.1)] border-[hsl(var(--${o.color})/0.5)] text-${o.color}` 
                                : "bg-surface-secondary border-border text-text-muted hover:text-text-secondary"
                              }
                            `}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2 block">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add details about this interaction..."
                      className="w-full h-24 px-3 py-2 bg-surface-secondary border border-border rounded font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[hsl(var(--accent-primary)/0.5)] resize-none"
                    />
                  </div>

                  {/* Schedule Follow-up */}
                  {(selectedAction === "call" || selectedAction === "meeting") && (
                    <div>
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-2 block">
                        Schedule Follow-up
                      </label>
                      <div className="flex gap-2">
                        {["Tomorrow", "In 3 Days", "Next Week", "Custom"].map((option) => (
                          <button
                            key={option}
                            className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-muted hover:text-text-secondary hover:border-border-hover transition-all"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-surface-secondary/30 flex items-center justify-end gap-2">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded font-mono text-xs text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Log Action
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
