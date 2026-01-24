"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation,
  Clock,
  ChevronRight,
  Loader2,
  X,
  Download,
  Eye,
} from "lucide-react";

interface ReadyDeck {
  id: string;
  customerId: string;
  customerName: string;
  templateId: string;
  templateName: string;
  status: string;
  completedAt: string | null;
  actualSlides: number | null;
  processingTimeMs: number | null;
  generatedDeck: unknown | null;
}

interface ReadyDecksWidgetProps {
  onViewDeck?: (deck: ReadyDeck) => void;
  maxDisplay?: number;
}

export function ReadyDecksWidget({ onViewDeck, maxDisplay = 5 }: ReadyDecksWidgetProps) {
  const [decks, setDecks] = useState<ReadyDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReadyDecks();
  }, []);

  const fetchReadyDecks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/decks/ready?limit=${maxDisplay}`);
      const data = await response.json();

      if (data.success) {
        setDecks(data.decks);
      } else {
        setError(data.error || "Failed to fetch decks");
      }
    } catch (err) {
      setError("Failed to load ready decks");
      console.error("Ready decks fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (deckId: string) => {
    try {
      const response = await fetch(`/api/decks/ready?id=${deckId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setDecks((prev) => prev.filter((d) => d.id !== deckId));
      }
    } catch (err) {
      console.error("Failed to dismiss deck:", err);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Don't render anything if no decks and not loading
  if (!isLoading && decks.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Presentation className="w-4 h-4 text-accent-primary" />
        <span className="text-sm text-text-secondary">Ready Decks</span>
        {decks.length > 0 && (
          <span className="ml-auto text-xs bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded-full">
            {decks.length}
          </span>
        )}
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            <span className="ml-2 text-xs text-text-muted">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-xs text-text-muted text-center py-4">{error}</div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {decks.map((deck) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="group relative flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => onViewDeck?.(deck)}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                    <Presentation className="w-4 h-4 text-accent-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {deck.customerName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{deck.templateName}</span>
                      {deck.actualSlides && (
                        <>
                          <span>•</span>
                          <span>{deck.actualSlides} slides</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(deck.completedAt)}
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDeck?.(deck);
                      }}
                      className="p-1 hover:bg-surface-secondary rounded transition-colors"
                      title="View deck"
                    >
                      <Eye className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(deck.id);
                      }}
                      className="p-1 hover:bg-surface-secondary rounded transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Footer - View All */}
      {decks.length > 0 && (
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              // Navigate to a dedicated page or open modal
              // For now, just refresh
              fetchReadyDecks();
            }}
            className="w-full flex items-center justify-center gap-1 text-xs text-accent-primary hover:underline"
          >
            View all scheduled decks
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for sidebar or smaller spaces
 */
export function ReadyDecksBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/decks/ready?limit=1");
        const data = await response.json();
        if (data.success) {
          setCount(data.count);
        }
      } catch {
        // Ignore errors for badge
      }
    };

    fetchCount();
    // Poll every 5 minutes
    const interval = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-medium bg-accent-primary text-white rounded-full px-1">
      {count}
    </span>
  );
}
