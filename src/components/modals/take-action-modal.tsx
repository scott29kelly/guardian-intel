"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  PanelRightClose,
  Expand,
  Maximize2,
  Sparkles,
  Loader2,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react";
import { Customer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAIAnalysis } from "@/lib/hooks/use-ai-analysis";

type ViewMode = "panel" | "expanded" | "fullscreen";

interface TakeActionModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

type ActionType = "call" | "email" | "meeting" | "note" | "task";

const actions = [
  { id: "call", label: "Log Call", icon: Phone, color: "accent-primary" },
  { id: "email", label: "Send Email", icon: Mail, color: "accent-secondary" },
  { id: "meeting", label: "Schedule", icon: Calendar, color: "accent-warning" },
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
  const [viewMode, setViewMode] = useState<ViewMode>("panel");

  // AI Analysis hook with context
  const analysisContext = useMemo(() => ({
    activityType: selectedAction,
    outcome: outcome || undefined,
    customerName: `${customer.firstName} ${customer.lastName}`,
  }), [selectedAction, outcome, customer.firstName, customer.lastName]);
  
  const { 
    analyze, 
    isAnalyzing, 
    lastResult: analysisResult,
    clearResult: clearAnalysis,
  } = useAIAnalysis({ context: analysisContext });

  const handleAnalyzeNotes = async () => {
    if (!notes.trim()) return;
    await analyze(notes);
  };

  // Reset view mode and analysis when modal opens
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
          {/* Backdrop - covers entire viewport with explicit dimensions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed top-0 left-0 w-screen h-screen z-[10000]",
              viewMode === "panel" 
                ? "bg-black/40 backdrop-blur-[2px]" 
                : "bg-black/60 backdrop-blur-md"
            )}
            onClick={onClose}
          />

          {/* Slide-over Drawer - iOS style with view mode support */}
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
            style={viewMode === "panel" ? {
              boxShadow: "-8px 0 40px rgba(0,0,0,0.4), -2px 0 10px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05) inset",
            } : {
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-20 h-20 rounded-full bg-[hsl(var(--accent-success)/0.15)] flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-accent-success" />
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-2">
                  Action Logged
                </h3>
                <p className="font-mono text-sm text-text-muted">
                  Activity recorded for {customer.firstName} {customer.lastName}
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header with iOS-style handle */}
                <div className={cn(
                  "border-b border-border/50",
                  viewMode === "panel" 
                    ? "bg-gradient-to-b from-surface-secondary/50 to-transparent" 
                    : "bg-[hsl(var(--surface-secondary))]",
                  viewMode !== "panel" && "rounded-t-2xl"
                )}>
                  {/* iOS-style drag indicator - only in panel mode */}
                  {viewMode === "panel" && (
                    <div className="flex justify-center pt-2 pb-1">
                      <div className="w-10 h-1 rounded-full bg-border/60" />
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center justify-between",
                    viewMode === "panel" ? "px-5 pb-4 pt-2" : "p-4"
                  )}>
                    <div className="flex items-center gap-3">
                      {viewMode === "panel" && (
                        <button 
                          onClick={onClose}
                          className="p-2 -ml-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      <div>
                        <h2 className="font-display font-bold text-lg text-text-primary">
                          Take Action
                        </h2>
                        <p className="font-mono text-xs text-text-muted">
                          {customer.firstName} {customer.lastName}
                        </p>
                      </div>
                    </div>
                    
                    {/* View Mode Controls */}
                    <div className="flex items-center gap-1">
                      <div className="flex items-center border border-border rounded-lg p-0.5 mr-2">
                        <button
                          onClick={() => setViewMode("panel")}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "panel" 
                              ? "bg-accent-primary/20 text-accent-primary" 
                              : "text-text-muted hover:text-text-primary"
                          )}
                          title="Side panel"
                        >
                          <PanelRightClose className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("expanded")}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "expanded" 
                              ? "bg-accent-primary/20 text-accent-primary" 
                              : "text-text-muted hover:text-text-primary"
                          )}
                          title="Expanded view"
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("fullscreen")}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "fullscreen" 
                              ? "bg-accent-primary/20 text-accent-primary" 
                              : "text-text-muted hover:text-text-primary"
                          )}
                          title="Fullscreen"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Action Type Selection */}
                  <div>
                    <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">
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
                              flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                              ${isSelected 
                                ? "bg-[hsl(var(--accent-primary)/0.1)] border-accent-primary text-accent-primary" 
                                : "bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                              }
                            `}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-mono text-[10px] uppercase leading-tight text-center">
                              {action.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {selectedAction === "call" && customer.phone && (
                    <a 
                      href={`tel:${customer.phone}`}
                      className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-[hsl(var(--accent-primary)/0.15)] to-[hsl(var(--accent-primary)/0.05)] border border-[hsl(var(--accent-primary)/0.3)] rounded-xl text-accent-primary font-mono text-sm hover:from-[hsl(var(--accent-primary)/0.2)] hover:to-[hsl(var(--accent-primary)/0.1)] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Phone className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Call {customer.phone}</span>
                    </a>
                  )}

                  {selectedAction === "email" && customer.email && (
                    <a 
                      href={`mailto:${customer.email}?subject=Following up on your roof assessment`}
                      className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-[hsl(var(--accent-secondary)/0.15)] to-[hsl(var(--accent-secondary)/0.05)] border border-[hsl(var(--accent-secondary)/0.3)] rounded-xl text-accent-secondary font-mono text-sm hover:from-[hsl(var(--accent-secondary)/0.2)] hover:to-[hsl(var(--accent-secondary)/0.1)] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Compose Email</span>
                    </a>
                  )}

                  {/* Outcome (for calls) */}
                  {selectedAction === "call" && (
                    <div>
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">
                        Outcome
                      </label>
                      <div className="flex gap-2">
                        {[
                          { id: "positive", label: "Positive", color: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400", activeColor: "bg-emerald-500/20 border-emerald-500" },
                          { id: "neutral", label: "Neutral", color: "bg-amber-500/10 border-amber-500/50 text-amber-400", activeColor: "bg-amber-500/20 border-amber-500" },
                          { id: "negative", label: "Negative", color: "bg-red-500/10 border-red-500/50 text-red-400", activeColor: "bg-red-500/20 border-red-500" },
                        ].map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setOutcome(o.id as typeof outcome)}
                            className={`
                              flex-1 px-4 py-3 rounded-lg border-2 font-mono text-xs font-medium transition-all
                              ${outcome === o.id 
                                ? o.activeColor 
                                : "bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-hover"
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
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
                        Notes
                      </label>
                      <button
                        onClick={handleAnalyzeNotes}
                        disabled={!notes.trim() || isAnalyzing}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-intel-400 hover:text-intel-300 hover:bg-intel-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add details about this interaction..."
                      className="w-full h-28 px-4 py-3 bg-surface-secondary border-2 border-transparent rounded-xl font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:bg-surface-primary resize-none transition-all"
                    />
                  </div>

                  {/* AI Insights */}
                  {analysisResult && analysisResult.insights.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-intel-500/10 border border-intel-500/30 rounded-xl space-y-3"
                    >
                      {/* Header with sentiment */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-intel-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs font-mono uppercase tracking-wider">AI Insights</span>
                          {analysisResult.source === "heuristic" && (
                            <span className="text-xs text-text-muted">(basic)</span>
                          )}
                        </div>
                        {/* Sentiment indicator */}
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                          analysisResult.sentiment === "positive" && "bg-emerald-500/20 text-emerald-400",
                          analysisResult.sentiment === "negative" && "bg-rose-500/20 text-rose-400",
                          analysisResult.sentiment === "mixed" && "bg-amber-500/20 text-amber-400",
                          analysisResult.sentiment === "neutral" && "bg-surface-700 text-text-secondary"
                        )}>
                          {analysisResult.sentiment === "positive" && <TrendingUp className="w-3 h-3" />}
                          {analysisResult.sentiment === "negative" && <TrendingDown className="w-3 h-3" />}
                          {analysisResult.sentiment === "mixed" && <AlertTriangle className="w-3 h-3" />}
                          {analysisResult.sentiment === "neutral" && <Minus className="w-3 h-3" />}
                          <span className="capitalize">{analysisResult.sentiment}</span>
                        </div>
                      </div>
                      
                      {/* Insights */}
                      <ul className="space-y-1.5">
                        {analysisResult.insights.map((insight, index) => (
                          <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                            <Check className="w-3 h-3 text-intel-400 mt-1 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>

                      {/* Suggested next steps */}
                      {analysisResult.nextSteps.length > 0 && (
                        <div className="pt-2 border-t border-intel-500/20">
                          <p className="text-xs text-text-muted mb-1.5 font-mono uppercase tracking-wider">Suggested Next Steps:</p>
                          <div className="space-y-1">
                            {analysisResult.nextSteps.slice(0, 2).map((step, index) => (
                              <div
                                key={index}
                                className="text-xs text-intel-400 bg-intel-500/10 px-2.5 py-1.5 rounded-lg"
                              >
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detected objections */}
                      {analysisResult.objections.length > 0 && (
                        <div className="pt-2 border-t border-intel-500/20">
                          <p className="text-xs text-text-muted mb-1.5 font-mono uppercase tracking-wider">Objections Detected:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.objections.map((objection, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 bg-storm-500/20 text-storm-400 rounded-full"
                              >
                                {objection}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Schedule Follow-up */}
                  {(selectedAction === "call" || selectedAction === "meeting") && (
                    <div>
                      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">
                        Schedule Follow-up
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["Tomorrow", "3 Days", "1 Week", "Custom"].map((option) => (
                          <button
                            key={option}
                            className="px-3 py-3 bg-surface-secondary border-2 border-transparent rounded-lg font-mono text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover hover:border-border transition-all"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer - iOS style with frosted glass effect */}
                <div className={cn(
                  "p-5 border-t border-border/50 flex items-center gap-3",
                  viewMode === "panel"
                    ? "bg-surface-secondary/80 backdrop-blur-sm"
                    : "bg-[hsl(var(--surface-secondary))]"
                )}>
                  <button 
                    onClick={onClose}
                    className="flex-1 px-5 py-3.5 bg-surface-secondary border border-border/50 rounded-2xl font-mono text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 px-5 py-3.5 rounded-2xl font-mono text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
                    style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}
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
