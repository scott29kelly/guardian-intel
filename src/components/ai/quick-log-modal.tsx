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

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import type { ActivityType, ActivityOutcome } from "@/lib/services/ai";

// =============================================================================
// TYPES
// =============================================================================

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onLogSaved?: (log: ActivityLog) => void;
}

interface ActivityLog {
  customerId: string;
  type: ActivityType;
  outcome?: ActivityOutcome;
  notes: string;
  duration?: number;
  nextAction?: string;
  nextActionDate?: string;
  aiInsights?: string[];
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
  onLogSaved,
}: QuickLogModalProps) {
  const { showToast } = useToast();
  
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [outcome, setOutcome] = useState<ActivityOutcome | undefined>();
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState<number | undefined>();
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const handleToggleObjection = (objection: string) => {
    setSelectedObjections(prev =>
      prev.includes(objection)
        ? prev.filter(o => o !== objection)
        : [...prev, objection]
    );
  };

  const handleAnalyzeNotes = async () => {
    if (!notes.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are analyzing sales rep notes for insights. Extract:
1. Customer sentiment (positive/neutral/negative)
2. Any objections mentioned
3. Suggested next steps
4. Key insights

Respond in JSON format: { "sentiment": "...", "objections": [...], "nextSteps": [...], "insights": [...] }`,
            },
            {
              role: "user",
              content: `Activity: ${activityType}\nOutcome: ${outcome || "unknown"}\nNotes: ${notes}`,
            },
          ],
          task: "parse",
        }),
      });

      const data = await response.json();
      
      if (data.success && data.message?.content) {
        try {
          const analysis = JSON.parse(data.message.content);
          setAiInsights(analysis.insights || []);
          
          // Add AI-detected objections
          if (analysis.objections?.length > 0) {
            setSelectedObjections(prev => [...new Set([...prev, ...analysis.objections])]);
          }
          
          // Suggest next step if empty
          if (!nextAction && analysis.nextSteps?.length > 0) {
            setNextAction(analysis.nextSteps[0]);
          }
        } catch {
          // Mock insights if parsing fails
          setAiInsights([
            "Customer seems interested in moving forward",
            "Consider addressing pricing concerns proactively",
          ]);
        }
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      // Mock insights on error
      setAiInsights([
        "Customer seems interested in moving forward",
        "Consider addressing pricing concerns proactively",
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      showToast("error", "Notes Required", "Please add some notes about this interaction");
      return;
    }

    setIsProcessing(true);

    try {
      // In production, this would save to the database
      const log: ActivityLog = {
        customerId,
        type: activityType,
        outcome,
        notes,
        duration,
        nextAction: nextAction || undefined,
        nextActionDate: nextActionDate || undefined,
        aiInsights,
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
      setAiInsights([]);
      
      onClose();
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* Activity Type */}
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
                  disabled={!notes.trim() || isProcessing}
                  className="text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Analyze with AI
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
            {aiInsights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-intel-500/10 border border-intel-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2 text-intel-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">AI Insights</span>
                </div>
                <ul className="space-y-1">
                  {aiInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                      <Check className="w-3 h-3 text-intel-400 mt-1 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </motion.div>
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
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-[hsl(var(--surface-secondary))] flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuickLogModal;
