"use client";

/**
 * Quick Log Modal
 * 
 * Allows reps to quickly log customer interactions.
 * AI processes the notes to:
 * - Extract sentiment
 * - Identify objections
 * - Suggest next actions
 * - Generate insights
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  MapPin,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAIAnalysis } from "@/lib/hooks/use-ai-analysis";
import type { ActivityType, ActivityOutcome } from "@/lib/services/ai";

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityLog {
  id: string;
  customerId: string;
  type: ActivityType;
  outcome?: ActivityOutcome;
  notes: string;
  duration?: number;
  nextAction?: string;
  nextActionDate?: string;
  aiInsights?: string[];
  objections?: string[];
  createdAt: string;
  createdBy: string;
}

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  activities?: ActivityLog[];
  onLogSaved?: (log: ActivityLog) => void;
}

// =============================================================================
// OPTIONS
// =============================================================================

const ACTIVITY_TYPES: Array<{ value: ActivityType; label: string; icon: typeof Phone }> = [
  { value: "call", label: "Call", icon: Phone },
  { value: "visit", label: "Site Visit", icon: MapPin },
  { value: "email", label: "Email", icon: Mail },
  { value: "text", label: "Text", icon: MessageSquare },
  { value: "note", label: "Note", icon: FileText },
];

const OUTCOMES: Array<{ value: ActivityOutcome; label: string; color: string }> = [
  { value: "connected", label: "Connected", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "voicemail", label: "Voicemail", color: "bg-amber-500/20 text-amber-400" },
  { value: "no_answer", label: "No Answer", color: "bg-surface-700 text-text-secondary" },
  { value: "scheduled", label: "Scheduled", color: "bg-intel-500/20 text-intel-400" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-purple-500/20 text-purple-400" },
  { value: "closed_won", label: "Closed Won", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-rose-500/20 text-rose-400" },
  { value: "follow_up_needed", label: "Follow Up", color: "bg-storm-500/20 text-storm-400" },
];

const COMMON_OBJECTIONS = [
  "Price too high",
  "Comparing quotes",
  "Need to discuss with spouse",
  "Bad timing",
  "Not convinced of damage",
  "Insurance concerns",
  "Already have contractor",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function QuickLogModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  activities = [],
  onLogSaved,
}: QuickLogModalProps) {
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [outcome, setOutcome] = useState<ActivityOutcome | undefined>();
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState<number | undefined>();
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // AI Analysis hook with context
  const analysisContext = useMemo(() => ({
    activityType,
    outcome: outcome || undefined,
    customerName,
  }), [activityType, outcome, customerName]);
  
  const { 
    analyze, 
    isAnalyzing, 
    lastResult: analysisResult,
    clearResult: clearAnalysis,
    error: analysisError 
  } = useAIAnalysis({ context: analysisContext });

  const handleToggleObjection = (objection: string) => {
    setSelectedObjections(prev =>
      prev.includes(objection)
        ? prev.filter(o => o !== objection)
        : [...prev, objection]
    );
  };

  const handleAnalyzeNotes = async () => {
    if (!notes.trim()) return;
    
    const result = await analyze(notes);
    
    // Add detected objections to selection
    if (result.objections.length > 0) {
      // Map AI objections to our common objection labels
      const mappedObjections = result.objections.map(obj => {
        // Find matching common objection
        const match = COMMON_OBJECTIONS.find(common => 
          common.toLowerCase().includes(obj.toLowerCase()) ||
          obj.toLowerCase().includes(common.toLowerCase())
        );
        return match || obj;
      });
      setSelectedObjections(prev => [...new Set([...prev, ...mappedObjections])]);
    }
    
    // Suggest next step if empty
    if (!nextAction && result.nextSteps.length > 0) {
      setNextAction(result.nextSteps[0]);
    }
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      showToast("error", "Notes Required", "Please add some notes about this interaction");
      return;
    }

    setIsProcessing(true);

    try {
      // Create activity log with all data
      const log: ActivityLog = {
        id: Date.now().toString(),
        customerId,
        type: activityType,
        outcome,
        notes,
        duration,
        nextAction: nextAction || undefined,
        nextActionDate: nextActionDate || undefined,
        aiInsights: analysisResult?.insights,
        objections: selectedObjections.length > 0 ? selectedObjections : undefined,
        createdAt: new Date().toISOString(),
        createdBy: "S. Mitchell",
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onLogSaved?.(log);
      showToast("success", "Activity Logged", `${activityType} logged for ${customerName}`);
      
      // Reset form
      setNotes("");
      setOutcome(undefined);
      setDuration(undefined);
      setSelectedObjections([]);
      setNextAction("");
      setNextActionDate("");
      clearAnalysis();
      
      // Switch to history tab to show the new activity
      setActiveTab("history");
    } catch (error) {
      showToast("error", "Save Failed", "Could not save activity log");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-[hsl(var(--surface-secondary))]">
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                Log Activity
              </h2>
              <p className="text-sm text-text-muted">
                {customerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("log")}
              className={`flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors ${
                activeTab === "log"
                  ? "text-accent-primary border-b-2 border-accent-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Log New Activity
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors ${
                activeTab === "history"
                  ? "text-accent-primary border-b-2 border-accent-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Activity History ({activities.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* History Tab */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-text-muted font-mono text-sm">No activities logged yet</p>
                    <p className="text-text-muted font-mono text-xs mt-1">Log your first activity to see it here</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("log")}
                      className="mt-4"
                    >
                      Log Activity
                    </Button>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="panel p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {activity.type === "call" && <Phone className="w-4 h-4 text-intel-400" />}
                          {activity.type === "visit" && <MapPin className="w-4 h-4 text-intel-400" />}
                          {activity.type === "email" && <Mail className="w-4 h-4 text-intel-400" />}
                          {activity.type === "text" && <MessageSquare className="w-4 h-4 text-intel-400" />}
                          {activity.type === "note" && <FileText className="w-4 h-4 text-intel-400" />}
                          <span className="font-mono text-sm text-text-primary capitalize">{activity.type}</span>
                          {activity.outcome && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.outcome.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs text-text-muted">
                          {new Date(activity.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-text-secondary mb-2">{activity.notes}</p>
                      {activity.objections && activity.objections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {activity.objections.map((obj, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-storm-500/20 text-storm-400 text-xs rounded-full">
                              {obj}
                            </span>
                          ))}
                        </div>
                      )}
                      {activity.nextAction && (
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-2 pt-2 border-t border-border">
                          <AlertCircle className="w-3 h-3" />
                          <span>Next: {activity.nextAction}</span>
                          {activity.nextActionDate && (
                            <span className="text-intel-400">
                              ({new Date(activity.nextActionDate).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-text-muted mt-2">
                        Logged by {activity.createdBy}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Log Tab - Activity Type */}
            {activeTab === "log" && (
              <>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Activity Type
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setActivityType(type.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      activityType === type.value
                        ? "bg-intel-500/20 border-intel-500/50 text-intel-400"
                        : "bg-surface-secondary border-border text-text-secondary hover:border-surface-600"
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Outcome
              </label>
              <div className="flex flex-wrap gap-2">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                      outcome === o.value
                        ? `${o.color} border-current`
                        : "bg-surface-secondary border-border text-text-secondary hover:border-surface-600"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration (for calls) */}
            {activityType === "call" && (
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Call Duration (minutes)
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={duration || ""}
                    onChange={e => setDuration(parseInt(e.target.value) || undefined)}
                    placeholder="5"
                    className="w-24 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-intel-500/50"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">
                  Notes
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalyzeNotes}
                  disabled={!notes.trim() || isAnalyzing}
                  className="text-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What happened during this interaction? AI will analyze your notes for insights..."
                rows={4}
                className="w-full px-4 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-intel-500/50"
              />
            </div>

            {/* AI Insights */}
            {analysisResult && analysisResult.insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-intel-500/10 border border-intel-500/30 rounded-lg space-y-3"
              >
                {/* Header with sentiment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-intel-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">AI Insights</span>
                    {analysisResult.source === "heuristic" && (
                      <span className="text-xs text-text-muted">(basic)</span>
                    )}
                  </div>
                  {/* Sentiment indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    analysisResult.sentiment === "positive" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : analysisResult.sentiment === "negative"
                      ? "bg-rose-500/20 text-rose-400"
                      : analysisResult.sentiment === "mixed"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-surface-700 text-text-secondary"
                  }`}>
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
                {analysisResult.nextSteps.length > 0 && !nextAction && (
                  <div className="pt-2 border-t border-intel-500/20">
                    <p className="text-xs text-text-muted mb-1.5">Suggested Next Steps:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.nextSteps.slice(0, 2).map((step, index) => (
                        <button
                          key={index}
                          onClick={() => setNextAction(step)}
                          className="px-2 py-1 bg-intel-500/20 hover:bg-intel-500/30 text-intel-400 text-xs rounded-full transition-colors"
                        >
                          + {step}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Analysis error */}
            {analysisError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {analysisError}
                </div>
              </div>
            )}

            {/* Objections */}
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Objections Encountered
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_OBJECTIONS.map(objection => (
                  <button
                    key={objection}
                    onClick={() => handleToggleObjection(objection)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                      selectedObjections.includes(objection)
                        ? "bg-storm-500/20 border-storm-500/50 text-storm-400"
                        : "bg-surface-secondary border-border text-text-secondary hover:border-surface-600"
                    }`}
                  >
                    {objection}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Action */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Next Action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  placeholder="Follow up call, send proposal..."
                  className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-intel-500/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={e => setNextActionDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-intel-500/50"
                />
              </div>
            </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-[hsl(var(--surface-secondary))] flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              {activeTab === "history" ? "Close" : "Cancel"}
            </Button>
            {activeTab === "log" && (
              <Button onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Activity
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuickLogModal;
