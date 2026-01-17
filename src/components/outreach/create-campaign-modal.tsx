"use client";

/**
 * CreateCampaignModal Component
 * 
 * Multi-step wizard for creating outreach campaigns.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Cloud,
  Play,
  Clock,
  MessageSquare,
  Mail,
  Check,
  Loader2,
  Target,
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreateCampaign, usePreviewTemplate, type CreateCampaignInput } from "@/lib/hooks/use-outreach";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "@/lib/services/outreach/types";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "basics" | "trigger" | "channels" | "templates" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "trigger", label: "Trigger" },
  { id: "channels", label: "Channels" },
  { id: "templates", label: "Templates" },
  { id: "review", label: "Review" },
];

const STORM_TYPES = [
  { id: "hail", label: "Hail", emoji: "🌨️" },
  { id: "wind", label: "Wind", emoji: "💨" },
  { id: "tornado", label: "Tornado", emoji: "🌪️" },
  { id: "flood", label: "Flood", emoji: "🌊" },
  { id: "hurricane", label: "Hurricane", emoji: "🌀" },
  { id: "general", label: "Any Storm", emoji: "⛈️" },
];

const SEVERITIES = ["minor", "moderate", "severe"];

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const { showToast } = useToast();
  const createCampaign = useCreateCampaign();
  const previewTemplate = usePreviewTemplate();

  const [step, setStep] = useState<Step>("basics");
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  // Form state
  const [form, setForm] = useState<CreateCampaignInput>({
    name: "",
    description: "",
    triggerType: "storm",
    stormTypes: ["hail", "wind"],
    minSeverity: "moderate",
    targetZipCodes: [],
    excludeRecent: 30,
    enableSms: true,
    enableEmail: true,
    smsTemplate: DEFAULT_TEMPLATES.storm_sms.body,
    emailSubject: DEFAULT_TEMPLATES.storm_email.subject,
    emailTemplate: DEFAULT_TEMPLATES.storm_email.body,
    delayMinutes: 0,
  });

  const [zipInput, setZipInput] = useState("");

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleAddZip = () => {
    if (zipInput && /^\d{5}$/.test(zipInput)) {
      if (!form.targetZipCodes?.includes(zipInput)) {
        setForm({ ...form, targetZipCodes: [...(form.targetZipCodes || []), zipInput] });
      }
      setZipInput("");
    }
  };

  const handleRemoveZip = (zip: string) => {
    setForm({ ...form, targetZipCodes: form.targetZipCodes?.filter((z) => z !== zip) });
  };

  const handlePreview = async (template: string, channel: "sms" | "email") => {
    try {
      const result = await previewTemplate.mutateAsync({ template, channel });
      setPreviewContent(result.body);
      setShowPreview(true);
    } catch (error) {
      showToast("error", "Preview Failed", "Could not generate preview");
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      showToast("error", "Validation Error", "Campaign name is required");
      return;
    }

    try {
      await createCampaign.mutateAsync(form);
      showToast("success", "Campaign Created", `${form.name} is now active`);
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast("error", "Create Failed", error instanceof Error ? error.message : "Please try again");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-primary border border-border rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-semibold text-text-primary">Create Campaign</h2>
              <p className="text-sm text-text-muted">
                Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].label}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                      ${i < currentStepIndex ? "bg-accent-primary text-white" : ""}
                      ${i === currentStepIndex ? "bg-accent-primary/20 text-accent-primary border border-accent-primary" : ""}
                      ${i > currentStepIndex ? "bg-surface-secondary text-text-muted" : ""}
                    `}
                  >
                    {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${i < currentStepIndex ? "bg-accent-primary" : "bg-surface-secondary"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step: Basics */}
            {step === "basics" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Post-Storm Hail Outreach"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does this campaign do?"
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary resize-none focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Don't contact if messaged within
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form.excludeRecent}
                      onChange={(e) => setForm({ ...form, excludeRecent: parseInt(e.target.value) || 30 })}
                      min={0}
                      max={365}
                      className="w-20 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                    />
                    <span className="text-text-muted">days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Trigger */}
            {step === "trigger" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Trigger Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "storm", icon: Cloud, label: "Storm Event", desc: "Auto-trigger on storms" },
                      { id: "manual", icon: Play, label: "Manual", desc: "Run on demand" },
                      { id: "scheduled", icon: Clock, label: "Scheduled", desc: "Run on schedule" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setForm({ ...form, triggerType: t.id as any })}
                        className={`
                          p-4 rounded-lg border text-left transition-all
                          ${form.triggerType === t.id
                            ? "border-accent-primary bg-accent-primary/10"
                            : "border-border hover:border-border-hover"
                          }
                        `}
                      >
                        <t.icon className={`w-6 h-6 mb-2 ${form.triggerType === t.id ? "text-accent-primary" : "text-text-muted"}`} />
                        <div className="font-medium text-text-primary">{t.label}</div>
                        <div className="text-xs text-text-muted">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {form.triggerType === "storm" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        Storm Types
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {STORM_TYPES.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => {
                              const types = form.stormTypes || [];
                              setForm({
                                ...form,
                                stormTypes: types.includes(st.id)
                                  ? types.filter((t) => t !== st.id)
                                  : [...types, st.id],
                              });
                            }}
                            className={`
                              px-3 py-2 rounded-lg border transition-all flex items-center gap-2
                              ${form.stormTypes?.includes(st.id)
                                ? "border-accent-primary bg-accent-primary/10"
                                : "border-border hover:border-border-hover"
                              }
                            `}
                          >
                            <span>{st.emoji}</span>
                            <span className="text-sm">{st.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        Minimum Severity
                      </label>
                      <div className="flex gap-2">
                        {SEVERITIES.map((sev) => (
                          <button
                            key={sev}
                            onClick={() => setForm({ ...form, minSeverity: sev })}
                            className={`
                              px-4 py-2 rounded-lg border capitalize
                              ${form.minSeverity === sev
                                ? "border-accent-primary bg-accent-primary/10"
                                : "border-border hover:border-border-hover"
                              }
                            `}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Target ZIP Codes (optional - leave empty for all)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="Enter ZIP"
                      className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                      onKeyDown={(e) => e.key === "Enter" && handleAddZip()}
                    />
                    <Button onClick={handleAddZip} disabled={!/^\d{5}$/.test(zipInput)}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.targetZipCodes?.map((zip) => (
                      <Badge key={zip} variant="secondary" className="gap-1">
                        {zip}
                        <button onClick={() => handleRemoveZip(zip)} className="hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {form.targetZipCodes?.length === 0 && (
                      <span className="text-sm text-text-muted">All ZIP codes will be targeted</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Channels */}
            {step === "channels" && (
              <div className="space-y-4">
                <div
                  onClick={() => setForm({ ...form, enableSms: !form.enableSms })}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${form.enableSms ? "border-accent-primary bg-accent-primary/10" : "border-border"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.enableSms ? "bg-accent-primary/20" : "bg-surface-secondary"}`}>
                      <MessageSquare className={`w-5 h-5 ${form.enableSms ? "text-accent-primary" : "text-text-muted"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">SMS Messages</div>
                      <div className="text-sm text-text-muted">Send text messages to customers</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.enableSms ? "border-accent-primary bg-accent-primary" : "border-border"}`}>
                      {form.enableSms && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setForm({ ...form, enableEmail: !form.enableEmail })}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${form.enableEmail ? "border-accent-primary bg-accent-primary/10" : "border-border"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.enableEmail ? "bg-accent-primary/20" : "bg-surface-secondary"}`}>
                      <Mail className={`w-5 h-5 ${form.enableEmail ? "text-accent-primary" : "text-text-muted"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">Email</div>
                      <div className="text-sm text-text-muted">Send emails to customers</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.enableEmail ? "border-accent-primary bg-accent-primary" : "border-border"}`}>
                      {form.enableEmail && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                {!form.enableSms && !form.enableEmail && (
                  <p className="text-sm text-rose-400">Please enable at least one channel</p>
                )}
              </div>
            )}

            {/* Step: Templates */}
            {step === "templates" && (
              <div className="space-y-6">
                {form.enableSms && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-text-primary">SMS Template</label>
                      <button
                        onClick={() => handlePreview(form.smsTemplate || "", "sms")}
                        className="text-xs text-accent-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <textarea
                      value={form.smsTemplate}
                      onChange={(e) => setForm({ ...form, smsTemplate: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary text-sm font-mono resize-none"
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      {form.smsTemplate?.length || 0} characters • {Math.ceil((form.smsTemplate?.length || 0) / 160)} segment(s)
                    </p>
                  </div>
                )}

                {form.enableEmail && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={form.emailSubject}
                        onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                        className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-text-primary">Email Body</label>
                        <button
                          onClick={() => handlePreview(form.emailTemplate || "", "email")}
                          className="text-xs text-accent-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                      </div>
                      <textarea
                        value={form.emailTemplate}
                        onChange={(e) => setForm({ ...form, emailTemplate: e.target.value })}
                        rows={10}
                        className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary text-sm font-mono resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Variables Help */}
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs font-medium text-text-primary mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {[...TEMPLATE_VARIABLES.customer, ...TEMPLATE_VARIABLES.storm, ...TEMPLATE_VARIABLES.company, ...TEMPLATE_VARIABLES.rep].map((v) => (
                      <code key={v.key} className="text-[10px] px-1.5 py-0.5 bg-surface-primary rounded text-accent-primary">
                        {`{{${v.key}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && (
              <div className="space-y-4">
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <h4 className="font-medium text-text-primary mb-3">{form.name}</h4>
                  {form.description && <p className="text-sm text-text-muted mb-3">{form.description}</p>}
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-text-muted">Trigger:</span>{" "}
                      <span className="text-text-primary capitalize">{form.triggerType}</span>
                    </div>
                    {form.triggerType === "storm" && (
                      <>
                        <div>
                          <span className="text-text-muted">Storm Types:</span>{" "}
                          <span className="text-text-primary">{form.stormTypes?.join(", ")}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Min Severity:</span>{" "}
                          <span className="text-text-primary capitalize">{form.minSeverity}</span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-text-muted">Channels:</span>{" "}
                      <span className="text-text-primary">
                        {[form.enableSms && "SMS", form.enableEmail && "Email"].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Target ZIPs:</span>{" "}
                      <span className="text-text-primary">
                        {form.targetZipCodes?.length || "All"}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Exclude Recent:</span>{" "}
                      <span className="text-text-primary">{form.excludeRecent} days</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400">
                    ✓ Campaign will be created and activated immediately
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={handlePrev} disabled={currentStepIndex === 0}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>

            {step === "review" ? (
              <Button onClick={handleSubmit} disabled={createCampaign.isPending}>
                {createCampaign.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Create Campaign
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center p-4 z-60"
              onClick={() => setShowPreview(false)}
            >
              <div
                className="bg-surface-primary border border-border rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-medium text-text-primary mb-4">Template Preview</h3>
                <div className="p-4 bg-surface-secondary rounded-lg text-sm text-text-primary whitespace-pre-wrap">
                  {previewContent}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setShowPreview(false)}>Close</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreateCampaignModal;
