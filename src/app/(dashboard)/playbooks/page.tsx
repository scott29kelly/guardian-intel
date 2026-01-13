"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Plus,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Users,
  CloudLightning,
  Shield,
  Copy,
  ThumbsUp,
  MessageSquare,
  FileText,
  Star,
  Zap,
  ArrowRight,
  X,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Loader2,
  Edit3,
  Presentation,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PlaybookCard, getCategoryInfo } from "@/components/playbooks";
import { PlaybookEditor } from "@/components/playbooks/playbook-editor";
import { PlaybookModal } from "@/components/modals/playbook-modal";
import { 
  usePlaybooks, 
  useCreatePlaybook, 
  useUpdatePlaybook, 
  useDeletePlaybook,
  type Playbook 
} from "@/lib/hooks/use-playbooks";
import type { CreatePlaybookInput, UpdatePlaybookInput } from "@/lib/validations";

// Category tabs configuration
const categories = [
  { id: "all", label: "All Playbooks", icon: BookOpen },
  { id: "storm", label: "Storm Response", icon: CloudLightning },
  { id: "objection-handling", label: "Objection Handling", icon: Shield },
  { id: "closing", label: "Closing Techniques", icon: Target },
  { id: "retention", label: "Customer Retention", icon: Users },
  { id: "cold-call", label: "Cold Calling", icon: Phone },
  { id: "discovery", label: "Discovery", icon: MessageSquare },
  { id: "presentation", label: "Presentation", icon: Presentation },
  { id: "follow-up", label: "Follow-up", icon: RotateCcw },
];

export default function PlaybooksPage() {
  const { showToast } = useToast();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [favorited, setFavorited] = useState<Set<string>>(new Set());
  const [showPracticeMode, setShowPracticeMode] = useState(false);
  const [practiceStep, setPracticeStep] = useState(0);
  const [isPracticePaused, setIsPracticePaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);

  // API Hooks
  const { data: playbooksData, isLoading, error } = usePlaybooks({
    category: selectedCategory !== "all" ? selectedCategory as CreatePlaybookInput["category"] : undefined,
    search: searchQuery || undefined,
    limit: 100,
  });

  const createMutation = useCreatePlaybook();
  const updateMutation = useUpdatePlaybook();
  const deleteMutation = useDeletePlaybook();

  // Derived state
  const playbooks = playbooksData?.data || [];
  const selectedPlaybook = useMemo(
    () => playbooks.find((p) => p.id === selectedPlaybookId),
    [playbooks, selectedPlaybookId]
  );

  // Parse markdown content into steps (for display)
  const parseContentToSteps = (content: string) => {
    if (!content) return [];
    
    // Split by ## headers
    const sections = content.split(/(?=^## )/gm).filter(Boolean);
    
    return sections.map((section, index) => {
      const lines = section.trim().split("\n");
      const titleLine = lines[0];
      const title = titleLine.replace(/^##\s*/, "").trim() || `Step ${index + 1}`;
      const contentLines = lines.slice(1).join("\n").trim();
      
      // Extract tips (lines starting with > or - Tip:)
      const tips: string[] = [];
      const contentWithoutTips = contentLines
        .split("\n")
        .filter((line) => {
          if (line.match(/^>\s*\*?Tip/i) || line.match(/^-\s*\*?Tip/i)) {
            tips.push(line.replace(/^[>\-]\s*\*?Tip:?\s*/i, "").replace(/\*$/g, "").trim());
            return false;
          }
          return true;
        })
        .join("\n")
        .trim();
      
      return {
        title,
        content: contentWithoutTips || section.trim(),
        tips,
      };
    });
  };

  const steps = selectedPlaybook ? parseContentToSteps(selectedPlaybook.content) : [];

  // Handlers
  const handleCreatePlaybook = () => {
    setEditingPlaybook(null);
    setShowModal(true);
  };

  const handleEditPlaybook = (playbook: Playbook) => {
    setEditingPlaybook(playbook);
    setShowModal(true);
  };

  const handleSavePlaybook = async (data: CreatePlaybookInput | UpdatePlaybookInput) => {
    if (editingPlaybook) {
      await updateMutation.mutateAsync({ id: editingPlaybook.id, data });
      showToast("success", "Playbook Updated", `"${(data as UpdatePlaybookInput).title || editingPlaybook.title}" has been saved`);
    } else {
      const result = await createMutation.mutateAsync(data as CreatePlaybookInput);
      showToast("success", "Playbook Created", `"${result.playbook.title}" has been added`);
      setSelectedPlaybookId(result.playbook.id);
    }
  };

  const handleDeletePlaybook = async (id: string) => {
    const playbook = playbooks.find((p) => p.id === id);
    await deleteMutation.mutateAsync(id);
    showToast("success", "Playbook Deleted", `"${playbook?.title}" has been removed`);
    if (selectedPlaybookId === id) {
      setSelectedPlaybookId(null);
    }
  };

  const handleFavorite = (playbookId: string, playbookTitle: string) => {
    const newFavorited = new Set(favorited);
    if (newFavorited.has(playbookId)) {
      newFavorited.delete(playbookId);
      showToast("info", "Removed from Favorites", `${playbookTitle} removed from favorites`);
    } else {
      newFavorited.add(playbookId);
      showToast("success", "Added to Favorites", `${playbookTitle} added to favorites`);
    }
    setFavorited(newFavorited);
  };

  const handleStartPracticeMode = () => {
    setPracticeStep(0);
    setIsPracticePaused(false);
    setShowPracticeMode(true);
    showToast("info", "Practice Mode", "Follow along with each step. Take your time!");
  };

  const handleNextPracticeStep = () => {
    if (practiceStep < steps.length - 1) {
      setPracticeStep((prev) => prev + 1);
    } else {
      showToast("success", "Practice Complete!", "Great job completing the playbook!");
      setShowPracticeMode(false);
    }
  };

  const handleFeedback = (type: "positive" | "improvement" | "notes", playbookTitle: string) => {
    const messages = {
      positive: `Thanks for the feedback! "${playbookTitle}" marked as effective`,
      improvement: `Feedback submitted for "${playbookTitle}"`,
      notes: `Note saved for "${playbookTitle}"`,
    };
    showToast(type === "positive" ? "success" : "info", "Feedback Recorded", messages[type]);
  };

  const handleCopyStep = (stepContent: string, stepId: string) => {
    navigator.clipboard.writeText(stepContent);
    setCopiedStep(stepId);
    showToast("success", "Copied!", "Script copied to clipboard");
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Category color helper
  const getCategoryColor = (category: string) => {
    const config = getCategoryInfo(category);
    return config.gradient;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left Sidebar - Categories & Playbook List */}
        <div className="w-96 flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
              Sales Playbooks
            </h1>
            <p className="text-text-muted">
              Battle-tested scripts and techniques for every situation
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/25 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedPlaybookId(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedCategory === cat.id
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Playbook List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                <p className="text-text-muted">Failed to load playbooks</p>
                <p className="text-sm text-text-muted mt-1">{error.message}</p>
              </div>
            ) : playbooks.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No playbooks found</p>
                <p className="text-sm text-text-muted mt-1">
                  {searchQuery ? "Try a different search term" : "Create your first playbook"}
                </p>
              </div>
            ) : (
              playbooks.map((playbook) => (
                <PlaybookCard
                  key={playbook.id}
                  playbook={playbook}
                  isSelected={selectedPlaybookId === playbook.id}
                  isFavorited={favorited.has(playbook.id)}
                  onClick={() => setSelectedPlaybookId(playbook.id)}
                />
              ))
            )}
          </div>

          {/* Add New Button */}
          <Button className="mt-4 w-full" onClick={handleCreatePlaybook}>
            <Plus className="w-4 h-4" />
            Create Custom Playbook
          </Button>
        </div>

        {/* Right Panel - Playbook Details */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedPlaybook ? (
              <motion.div
                key={selectedPlaybook.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Playbook Header */}
                <Card className="mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCategoryColor(
                            selectedPlaybook.category
                          )} flex items-center justify-center shadow-lg shadow-accent-primary/20`}
                        >
                          {(() => {
                            const { icon: Icon } = getCategoryInfo(selectedPlaybook.category);
                            return <Icon className="w-7 h-7 text-white" />;
                          })()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-text-primary mb-1">
                            {selectedPlaybook.title}
                          </h2>
                          {selectedPlaybook.description && (
                            <p className="text-text-muted max-w-2xl">
                              {selectedPlaybook.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3">
                            <Badge className="capitalize">
                              {selectedPlaybook.type}
                            </Badge>
                            {selectedPlaybook.stage && (
                              <span className="text-sm text-text-muted flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {selectedPlaybook.stage} stage
                              </span>
                            )}
                            <span className="text-sm text-text-muted flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              Used {selectedPlaybook.usageCount} times
                            </span>
                            {selectedPlaybook.rating && (
                              <span className="text-sm text-amber-400 flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-current" />
                                {selectedPlaybook.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlaybook(selectedPlaybook)}
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleFavorite(selectedPlaybook.id, selectedPlaybook.title)
                          }
                          className={
                            favorited.has(selectedPlaybook.id)
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                              : ""
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${
                              favorited.has(selectedPlaybook.id) ? "fill-current" : ""
                            }`}
                          />
                          {favorited.has(selectedPlaybook.id) ? "Favorited" : "Favorite"}
                        </Button>
                        {steps.length > 0 && (
                          <Button size="sm" onClick={handleStartPracticeMode}>
                            <Zap className="w-4 h-4" />
                            Practice Mode
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Practice Mode Overlay */}
                <AnimatePresence>
                  {showPracticeMode && steps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-4 p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                            <Play className="w-5 h-5 text-accent-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-text-primary">
                              Practice Mode Active
                            </h3>
                            <p className="text-sm text-text-muted">
                              Step {practiceStep + 1} of {steps.length}:{" "}
                              {steps[practiceStep]?.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPracticeStep(0)}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPracticePaused(!isPracticePaused)}
                          >
                            {isPracticePaused ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                            {isPracticePaused ? "Resume" : "Pause"}
                          </Button>
                          <Button size="sm" onClick={handleNextPracticeStep}>
                            <SkipForward className="w-4 h-4" />
                            {practiceStep === steps.length - 1 ? "Finish" : "Next Step"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPracticeMode(false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-2 bg-surface-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-primary transition-all duration-300"
                          style={{
                            width: `${((practiceStep + 1) / steps.length) * 100}%`,
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                  {steps.length > 0 ? (
                    // Render parsed steps
                    steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className={`overflow-hidden transition-all ${
                            showPracticeMode && practiceStep === index
                              ? "ring-2 ring-accent-primary shadow-lg shadow-accent-primary/20"
                              : ""
                          }`}
                        >
                          <div
                            className={`h-1 bg-gradient-to-r ${getCategoryColor(
                              selectedPlaybook.category
                            )}`}
                          />
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                                  showPracticeMode && practiceStep === index
                                    ? "bg-accent-primary text-white"
                                    : "bg-surface-secondary text-accent-primary"
                                }`}
                              >
                                {showPracticeMode && practiceStep > index ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-text-primary">
                                    {step.title}
                                  </h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleCopyStep(
                                        step.content,
                                        `${selectedPlaybook.id}-${index}`
                                      )
                                    }
                                    className="text-text-muted hover:text-text-primary"
                                  >
                                    {copiedStep === `${selectedPlaybook.id}-${index}` ? (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" />
                                        Copy Script
                                      </>
                                    )}
                                  </Button>
                                </div>

                                {/* Script Content */}
                                <div className="bg-surface-secondary/50 rounded-lg p-4 border border-border mb-4">
                                  <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                                    {step.content}
                                  </p>
                                </div>

                                {/* Tips */}
                                {step.tips && step.tips.length > 0 && (
                                  <div className="flex items-start gap-2 text-sm">
                                    <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {step.tips.map((tip, tipIndex) => (
                                        <span
                                          key={tipIndex}
                                          className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs"
                                        >
                                          {tip}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Arrow to next step */}
                            {index < steps.length - 1 && (
                              <div className="flex justify-center mt-4">
                                <ArrowRight className="w-5 h-5 text-text-muted rotate-90" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : selectedPlaybook.content ? (
                    // Render raw content with markdown
                    <Card>
                      <CardContent className="p-6">
                        <PlaybookEditor
                          content={selectedPlaybook.content}
                          onChange={() => {}}
                          readOnly
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    // Empty content
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
                          <p className="text-text-muted">No content yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => handleEditPlaybook(selectedPlaybook)}
                          >
                            <Edit3 className="w-4 h-4" />
                            Add Content
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Feedback Section */}
                  <Card className="mt-6">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-medium text-text-primary mb-2">
                          How did this playbook work?
                        </h4>
                        <p className="text-sm text-text-muted mb-4">
                          Your feedback helps improve our playbooks for everyone
                        </p>
                        <div className="flex justify-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleFeedback("positive", selectedPlaybook.title)
                            }
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Worked Great
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleFeedback("improvement", selectedPlaybook.title)
                            }
                          >
                            <MessageSquare className="w-4 h-4" />
                            Suggest Improvement
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleFeedback("notes", selectedPlaybook.title)
                            }
                          >
                            <FileText className="w-4 h-4" />
                            Add Notes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-primary/10 flex items-center justify-center mx-auto mb-6 border border-accent-primary/30">
                    <BookOpen className="w-12 h-12 text-accent-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Select a Playbook
                  </h3>
                  <p className="text-text-muted mb-6">
                    Choose a playbook from the list to view detailed scripts, objection
                    handlers, and proven closing techniques.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      {playbooks.length} Playbooks
                    </Badge>
                    <Badge className="bg-violet-500/20 text-violet-400">
                      {categories.length - 1} Categories
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <PlaybookModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPlaybook(null);
        }}
        playbook={editingPlaybook}
        onSave={handleSavePlaybook}
        onDelete={handleDeletePlaybook}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </motion.div>
  );
}
