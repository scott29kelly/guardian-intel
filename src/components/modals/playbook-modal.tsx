"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  Save,
  Loader2,
  Trash2,
  Tag,
  Plus,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PlaybookEditor } from "@/components/playbooks/playbook-editor";
import { PlaybookAIPanel } from "@/components/playbooks/playbook-ai-panel";
import type { Playbook } from "@/lib/hooks/use-playbooks";
import type { CreatePlaybookInput, UpdatePlaybookInput } from "@/lib/validations";

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbook?: Playbook | null; // null = create mode, Playbook = edit mode
  onSave: (data: CreatePlaybookInput | UpdatePlaybookInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

const categories = [
  { id: "objection-handling", label: "Objection Handling" },
  { id: "closing", label: "Closing Techniques" },
  { id: "discovery", label: "Discovery" },
  { id: "presentation", label: "Presentation" },
  { id: "follow-up", label: "Follow-up" },
  { id: "storm", label: "Storm Response" },
  { id: "cold-call", label: "Cold Calling" },
  { id: "retention", label: "Customer Retention" },
];

const types = [
  { id: "script", label: "Script" },
  { id: "checklist", label: "Checklist" },
  { id: "guide", label: "Guide" },
  { id: "template", label: "Template" },
];

const stages = [
  { id: "", label: "Any Stage" },
  { id: "new", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed", label: "Closed" },
];

export function PlaybookModal({
  isOpen,
  onClose,
  playbook,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: PlaybookModalProps) {
  const { showToast } = useToast();
  const isEditMode = !!playbook;
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "objection-handling" as string,
    type: "script" as string,
    content: "",
    stage: "",
    scenario: "",
    tags: [] as string[],
    isPublished: true,
  });
  
  const [newTag, setNewTag] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "content">("details");
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Reset form when modal opens/closes or playbook changes
  useEffect(() => {
    if (isOpen && playbook) {
      setFormData({
        title: playbook.title,
        description: playbook.description || "",
        category: playbook.category,
        type: playbook.type,
        content: playbook.content || "",
        stage: playbook.stage || "",
        scenario: playbook.scenario || "",
        tags: playbook.tags || [],
        isPublished: playbook.isPublished,
      });
      setActiveTab("details");
    } else if (isOpen && !playbook) {
      setFormData({
        title: "",
        description: "",
        category: "objection-handling",
        type: "script",
        content: "",
        stage: "",
        scenario: "",
        tags: [],
        isPublished: true,
      });
      setActiveTab("details");
    }
    setShowDeleteConfirm(false);
  }, [isOpen, playbook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showToast("error", "Required", "Please enter a title for your playbook");
      return;
    }

    try {
      await onSave({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category as CreatePlaybookInput["category"],
        type: formData.type as CreatePlaybookInput["type"],
        content: formData.content || undefined,
        stage: formData.stage || undefined,
        scenario: formData.scenario.trim() || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        isPublished: formData.isPublished,
      });
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!playbook || !onDelete) return;
    
    try {
      await onDelete(playbook.id);
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 20) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(t => t !== tagToRemove) 
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`max-h-[90vh] bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl overflow-hidden flex transition-all duration-300 ${
            showAIPanel ? "w-full max-w-6xl" : "w-full max-w-3xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-primary" />
                {isEditMode ? "Edit Playbook" : "Create New Playbook"}
              </h2>
              <div className="flex items-center gap-2">
                {/* AI Panel Toggle */}
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    showAIPanel
                      ? "bg-purple-500/20 text-purple-400"
                      : "hover:bg-purple-500/10 text-text-muted hover:text-purple-400"
                  }`}
                  title={showAIPanel ? "Hide AI Panel" : "Show AI Panel"}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">AI Assist</span>
                  {showAIPanel ? (
                    <PanelRightClose className="w-4 h-4" />
                  ) : (
                    <PanelRightOpen className="w-4 h-4" />
                  )}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>

          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-sm transition-all ${
                activeTab === "details"
                  ? "text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`flex-1 py-3 text-sm transition-all ${
                activeTab === "content"
                  ? "text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Content
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === "details" && (
                <>
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                      placeholder="e.g., Insurance Objection Handler"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
                      placeholder="Brief description of when to use this playbook..."
                    />
                  </div>

                  {/* Category & Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        {types.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stage & Scenario */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Pipeline Stage</label>
                      <select
                        value={formData.stage}
                        onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                      >
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Scenario</label>
                      <input
                        type="text"
                        value={formData.scenario}
                        onChange={(e) => setFormData(prev => ({ ...prev, scenario: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                        placeholder="e.g., homeowner hesitant"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Tags</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                          placeholder="Add a tag..."
                        />
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addTag}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-surface-secondary text-text-secondary text-sm rounded-lg"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-rose-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Published toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="w-5 h-5 rounded border-border bg-surface-secondary text-accent-primary focus:ring-accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-text-secondary">
                      Published (visible to all team members)
                    </span>
                  </label>
                </>
              )}

              {activeTab === "content" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Content (Markdown supported)
                  </label>
                  <PlaybookEditor
                    content={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    minHeight="350px"
                    playbookContext={{
                      title: formData.title || "New Playbook",
                      category: formData.category,
                      type: formData.type,
                      stage: formData.stage,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30 flex-shrink-0">
              <div>
                {isEditMode && onDelete && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-rose-400">Delete this playbook?</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditMode ? "Save Changes" : "Create Playbook"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
          </div>
          
          {/* AI Panel (Side Panel) */}
          <AnimatePresence>
            {showAIPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 350, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <PlaybookAIPanel
                  title={formData.title || "New Playbook"}
                  category={formData.category}
                  type={formData.type}
                  stage={formData.stage}
                  content={formData.content}
                  onInsert={(text) => {
                    const newContent = formData.content
                      ? `${formData.content}\n\n${text}`
                      : text;
                    setFormData(prev => ({ ...prev, content: newContent }));
                    setActiveTab("content");
                  }}
                  onClose={() => setShowAIPanel(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
