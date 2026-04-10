"use client";

/**
 * Decks Page
 *
 * Lists all generated decks for the current user with status tracking,
 * filtering, and artifact download buttons.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Search,
  Loader2,
  FileText,
  Image as ImageIcon,
  Headphones,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDecks, useDeleteDeck, type DeckListItem } from "@/lib/hooks/use-decks";
import { useCustomerArtifacts } from "@/lib/hooks";
import { cn, formatDistanceToNow } from "@/lib/utils";
import { ArtifactViewerModal, GenerateArtifactsButton } from "@/features/multi-artifact";
import type { ArtifactType, ArtifactState } from "@/features/multi-artifact";

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "warning" as const,
    icon: Clock,
    className: "",
  },
  processing: {
    label: "Processing",
    variant: "accent" as const,
    icon: RefreshCw,
    className: "animate-spin",
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
    icon: CheckCircle2,
    className: "",
  },
  failed: {
    label: "Failed",
    variant: "danger" as const,
    icon: AlertCircle,
    className: "",
  },
};

const statusFilters = [
  { value: "all", label: "All" },
  { value: "processing", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

function DeckCard({
  deck,
  onOpenArtifact,
  onDelete,
}: {
  deck: DeckListItem;
  onOpenArtifact: (type: ArtifactType, state: ArtifactState, customerName: string) => void;
  onDelete: (deckId: string, customerId: string) => void;
}) {
  const config = statusConfig[deck.status];
  const StatusIcon = config.icon;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { generate, isGenerating } = useCustomerArtifacts(deck.customerId);

  function handleOpenArtifact(type: ArtifactType) {
    let state: ArtifactState;
    switch (type) {
      case "deck":
        state = { status: "ready", url: deck.pdfUrl, error: null, completedAt: null };
        break;
      case "infographic":
        state = { status: "ready", url: deck.infographicUrl, error: null, completedAt: null };
        break;
      case "audio":
        state = { status: "ready", url: deck.audioUrl, error: null, completedAt: null };
        break;
      case "report":
        state = { status: "ready", url: null, error: null, completedAt: null, markdown: deck.reportMarkdown };
        break;
    }
    onOpenArtifact(type, state, deck.customerName);
  }

  return (
    <Card className="relative bg-surface-primary border-border hover:border-accent-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* Header: customer name + status + delete */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-text-primary truncate">
            {deck.customerName}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={config.variant}>
              <StatusIcon
                className={cn("w-3 h-3 mr-1", config.className)}
              />
              {config.label}
            </Badge>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isGenerating}
              className="p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors disabled:opacity-50"
              title="Delete deck"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Template name */}
        <p className="text-sm text-text-secondary mb-3 truncate">
          {deck.templateName}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-text-muted mb-3">
          Created {formatDistanceToNow(deck.createdAt, { addSuffix: true })}
          {deck.status === "completed" && deck.processingTimeMs && (
            <span>
              {" "}· completed in {(deck.processingTimeMs / 1000).toFixed(0)}s
            </span>
          )}
        </p>

        {/* Processing indicator */}
        {deck.status === "processing" && (
          <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full w-1/3 bg-accent-primary rounded-full"
              animate={{ x: ["0%", "200%", "0%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </div>
        )}

        {/* Failed: error message + retry button */}
        {deck.status === "failed" && (
          <div className="mb-3">
            {deck.errorMessage && (
              <p className="text-xs text-rose-400 line-clamp-2 mb-2">
                {deck.errorMessage}
              </p>
            )}
            <button
              onClick={() => generate({ customerId: deck.customerId, artifacts: ["deck", "infographic", "audio", "report"] })}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Retrying...</>
              ) : (
                <><RefreshCw className="w-3 h-3" /> Retry</>
              )}
            </button>
          </div>
        )}

        {/* Artifact chips -- open in-page modal per D-DECKS-01/D-DECKS-02 */}
        {deck.status === "completed" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {deck.pdfUrl && (
                <button
                  onClick={() => handleOpenArtifact("deck")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-surface-secondary border border-border rounded-full hover:bg-surface-hover transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  Deck
                </button>
              )}
              {deck.infographicUrl && (
                <button
                  onClick={() => handleOpenArtifact("infographic")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-surface-secondary border border-border rounded-full hover:bg-surface-hover transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  Infographic
                </button>
              )}
              {deck.audioUrl && (
                <button
                  onClick={() => handleOpenArtifact("audio")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-surface-secondary border border-border rounded-full hover:bg-surface-hover transition-colors"
                >
                  <Headphones className="w-3 h-3" />
                  Audio
                </button>
              )}
              {deck.reportMarkdown && (
                <button
                  onClick={() => handleOpenArtifact("report")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-surface-secondary border border-border rounded-full hover:bg-surface-hover transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  Report
                </button>
              )}
            </div>
            {/* Regenerate with artifact type selector */}
            <GenerateArtifactsButton
              customerId={deck.customerId}
              onGenerate={(artifacts) => generate({ customerId: deck.customerId, artifacts })}
              isGenerating={isGenerating}
              variant="inline"
            />
          </div>
        )}

      </CardContent>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(30, 58, 95, 0.92)" }}
          >
            <p className="text-sm font-medium text-white mb-3">Delete this deck?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-white/80 border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deck.id, deck.customerId);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function DecksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<ArtifactType | null>(null);
  const [viewerState, setViewerState] = useState<ArtifactState | null>(null);
  const [viewerCustomerName, setViewerCustomerName] = useState<string>("");

  const { data, isLoading, error } = useDecks({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });

  const { deleteDeck } = useDeleteDeck();

  const handleDeleteDeck = async (deckId: string, customerId: string) => {
    try {
      await deleteDeck({ customerId, deckId });
    } catch (err) {
      console.error("[Decks] Failed to delete deck:", err);
    }
  };

  const decks = data?.decks || [];

  const deckTypes = useMemo(() => {
    const types = [...new Set(decks.map((d) => d.templateName))].sort();
    return [
      { value: "all", label: "All Types" },
      ...types.map((t) => ({ value: t, label: t })),
    ];
  }, [decks]);

  const filteredDecks = useMemo(() => {
    let result = decks;
    if (typeFilter !== "all") {
      result = result.filter((d) => d.templateName === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.customerName.toLowerCase().includes(q) ||
          d.templateName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [decks, typeFilter, searchQuery]);

  const handleOpenArtifact = (type: ArtifactType, state: ArtifactState, customerName: string) => {
    setViewerType(type);
    setViewerState(state);
    setViewerCustomerName(customerName);
    setViewerOpen(true);
  };

  const activeCount = decks.filter(
    (d) => d.status === "pending" || d.status === "processing"
  ).length;

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-8 h-8 text-accent-primary" />
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Decks
          </h1>
        </div>
        <p className="text-text-muted">
          View and manage all your generated decks
        </p>
      </div>

      {/* Active processing banner */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-accent-primary/[0.08] border border-accent-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary" />
          </span>
          <p className="text-sm text-accent-primary">
            {activeCount} deck{activeCount !== 1 ? "s" : ""} currently generating — this page auto-refreshes
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                statusFilter === f.value
                  ? "bg-accent-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Deck type filter */}
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 cursor-pointer"
          >
            {deckTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-text-secondary">Failed to load decks</p>
        </div>
      )}

      {/* Deck grid */}
      {!isLoading && !error && filteredDecks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onOpenArtifact={handleOpenArtifact} onDelete={handleDeleteDeck} />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !error && filteredDecks.length === 0 && (
        <div className="flex flex-col items-center py-16">
          <Layers className="w-12 h-12 text-text-muted mb-4" />
          {decks.length === 0 && !searchQuery ? (
            <>
              <p className="text-text-secondary font-medium mb-1">
                No decks generated yet
              </p>
              <p className="text-sm text-text-muted">
                Generate a deck from a customer page to see it here
              </p>
            </>
          ) : (
            <>
              <p className="text-text-secondary font-medium mb-1">
                No matching decks
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-sm text-accent-primary hover:underline mt-1"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>

      {/* Artifact viewer modal -- rendered outside motion.div to avoid transform breaking fixed positioning */}
      <ArtifactViewerModal
        isOpen={viewerOpen}
        onClose={() => { setViewerOpen(false); setViewerType(null); setViewerState(null); }}
        artifactType={viewerType}
        artifactState={viewerState}
        customerName={viewerCustomerName}
      />
    </>
  );
}
