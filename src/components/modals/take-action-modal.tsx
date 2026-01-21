"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Send, CheckCircle, ChevronRight, PanelRightClose, Expand, Maximize2, Sparkles, Loader2 } from "lucide-react";
import { Customer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAIAnalysis } from "@/lib/hooks/use-ai-analysis";
import { ActionTypeSelector, ActionType } from "./take-action/action-type-selector";
import { AIInsightsPanel } from "./take-action/ai-insights-panel";
import { OutcomeSelector } from "./take-action/outcome-selector";

type ViewMode = "panel" | "expanded" | "fullscreen";

interface TakeActionModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export function TakeActionModal({ customer, isOpen, onClose }: TakeActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>("call");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<"positive" | "neutral" | "negative" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("panel");

  const analysisContext = useMemo(() => ({
    activityType: selectedAction,
    outcome: outcome || undefined,
    customerName: `${customer.firstName} ${customer.lastName}`,
  }), [selectedAction, outcome, customer.firstName, customer.lastName]);

  const { analyze, isAnalyzing, lastResult: analysisResult, clearResult: clearAnalysis } = useAIAnalysis({ context: analysisContext });

  const handleAnalyzeNotes = async () => {
    if (!notes.trim()) return;
    await analyze(notes);
  };

  useEffect(() => {
    if (isOpen) {
      setViewMode("panel");
      clearAnalysis();
    }
  }, [isOpen, clearAnalysis]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setNotes("");
      setOutcome(null);
      clearAnalysis();
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed top-0 left-0 w-screen h-screen z-[10000]", viewMode === "panel" ? "bg-black/40 backdrop-blur-[2px]" : "bg-black/60 backdrop-blur-md")}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, x: viewMode === "panel" ? "100%" : 0, scale: viewMode !== "panel" ? 0.95 : 1 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: viewMode === "panel" ? "100%" : 0, scale: viewMode !== "panel" ? 0.95 : 1 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed bg-[hsl(var(--surface-primary))] z-[10001] flex flex-col overflow-hidden",
              viewMode === "panel" && "right-0 top-2 bottom-2 w-full max-w-[420px] border border-border/50 border-r-0 rounded-l-3xl",
              viewMode === "expanded" && "inset-0 m-auto w-[90vw] max-w-2xl h-[80vh] max-h-[700px] rounded-2xl border border-border",
              viewMode === "fullscreen" && "inset-3 rounded-2xl border border-border"
            )}
            style={viewMode === "panel" ? { boxShadow: "-8px 0 40px rgba(0,0,0,0.4)" } : { boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
          >
            {isSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-[hsl(var(--accent-success)/0.15)] flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-accent-success" />
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-2">Action Logged</h3>
                <p className="font-mono text-sm text-text-muted">Activity recorded for {customer.firstName} {customer.lastName}</p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className={cn("border-b border-border/50", viewMode === "panel" ? "bg-gradient-to-b from-surface-secondary/50 to-transparent" : "bg-[hsl(var(--surface-secondary))]", viewMode !== "panel" && "rounded-t-2xl")}>
                  {viewMode === "panel" && <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-border/60" /></div>}
                  <div className={cn("flex items-center justify-between", viewMode === "panel" ? "px-5 pb-4 pt-2" : "p-4")}>
                    <div className="flex items-center gap-3">
                      {viewMode === "panel" && (
                        <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      <div>
                        <h2 className="font-display font-bold text-lg text-text-primary">Take Action</h2>
                        <p className="font-mono text-xs text-text-muted">{customer.firstName} {customer.lastName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center border border-border rounded-lg p-0.5 mr-2">
                        {[
                          { mode: "panel", icon: PanelRightClose, title: "Side panel" },
                          { mode: "expanded", icon: Expand, title: "Expanded view" },
                          { mode: "fullscreen", icon: Maximize2, title: "Fullscreen" },
                        ].map(({ mode, icon: Icon, title }) => (
                          <button key={mode} onClick={() => setViewMode(mode as ViewMode)} className={cn("p-1.5 rounded transition-colors", viewMode === mode ? "bg-accent-primary/20 text-accent-primary" : "text-text-muted hover:text-text-primary")} title={title}>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                      <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <ActionTypeSelector selectedAction={selectedAction} onSelect={setSelectedAction} />

                  {/* Quick Actions */}
                  {selectedAction === "call" && customer.phone && (
                    <a href={`tel:${customer.phone}`} className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-[hsl(var(--accent-primary)/0.15)] to-[hsl(var(--accent-primary)/0.05)] border border-[hsl(var(--accent-primary)/0.3)] rounded-xl text-accent-primary font-mono text-sm hover:from-[hsl(var(--accent-primary)/0.2)] hover:to-[hsl(var(--accent-primary)/0.1)] transition-all group">
                      <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Phone className="w-5 h-5" /></div>
                      <span className="font-medium">Call {customer.phone}</span>
                    </a>
                  )}

                  {selectedAction === "email" && customer.email && (
                    <a href={`mailto:${customer.email}?subject=Following up on your roof assessment`} className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-[hsl(var(--accent-secondary)/0.15)] to-[hsl(var(--accent-secondary)/0.05)] border border-[hsl(var(--accent-secondary)/0.3)] rounded-xl text-accent-secondary font-mono text-sm hover:from-[hsl(var(--accent-secondary)/0.2)] hover:to-[hsl(var(--accent-secondary)/0.1)] transition-all group">
                      <div className="w-10 h-10 rounded-full bg-accent-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Mail className="w-5 h-5" /></div>
                      <span className="font-medium">Compose Email</span>
                    </a>
                  )}

                  {selectedAction === "call" && <OutcomeSelector outcome={outcome} onSelect={setOutcome} />}

                  {/* Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Notes</label>
                      <button onClick={handleAnalyzeNotes} disabled={!notes.trim() || isAnalyzing} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-intel-400 hover:text-intel-300 hover:bg-intel-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isAnalyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</> : <><Sparkles className="w-3 h-3" />Analyze with AI</>}
                      </button>
                    </div>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details about this interaction..." className="w-full h-28 px-4 py-3 bg-surface-secondary border-2 border-transparent rounded-xl font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:bg-surface-primary resize-none transition-all" />
                  </div>

                  {analysisResult && <AIInsightsPanel result={analysisResult} />}

                  {/* Schedule Follow-up */}
                  {(selectedAction === "call" || selectedAction === "meeting") && (
                    <div>
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">Schedule Follow-up</label>
                      <div className="grid grid-cols-4 gap-2">
                        {["Tomorrow", "3 Days", "1 Week", "Custom"].map((option) => (
                          <button key={option} className="px-3 py-3 bg-surface-secondary border-2 border-transparent rounded-lg font-mono text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover hover:border-border transition-all">{option}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={cn("p-5 border-t border-border/50 flex items-center gap-3", viewMode === "panel" ? "bg-surface-secondary/80 backdrop-blur-sm" : "bg-[hsl(var(--surface-secondary))]")}>
                  <button onClick={onClose} className="flex-1 px-5 py-3.5 bg-surface-secondary border border-border/50 rounded-2xl font-mono text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">Cancel</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-5 py-3.5 rounded-2xl font-mono text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-lg" style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}>
                    {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Send className="w-4 h-4" />Log Action</>}
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
