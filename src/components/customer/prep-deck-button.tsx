"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useDeckGeneration } from "@/lib/hooks/use-deck-generation";
import { cn } from "@/lib/utils";

interface PrepDeckButtonProps {
  customerId: string;
  customerName: string;
  /** Compact mode for card views */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function PrepDeckButton({
  customerId,
  customerName,
  compact = false,
  className,
}: PrepDeckButtonProps) {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const {
    isLoading,
    hasDeck,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
    isInProgress,
    deck,
    schedule,
    cancel,
    isScheduling,
    isCancelling,
    refetch,
  } = useDeckGeneration(customerId);

  // Handle scheduling a new deck
  const handleSchedule = async () => {
    try {
      await schedule();
    } catch (error) {
      console.error("Failed to schedule deck:", error);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    try {
      await cancel(deck?.id);
      setShowConfirmCancel(false);
    } catch (error) {
      console.error("Failed to cancel deck:", error);
    }
  };

  // Handle retry after failure
  const handleRetry = async () => {
    // First cancel the failed job, then schedule a new one
    if (deck?.id) {
      await cancel(deck.id);
    }
    await schedule();
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <Button 
        variant="outline" 
        size={compact ? "sm" : "default"} 
        disabled
        className={className}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        {!compact && <span className="ml-2">Loading...</span>}
      </Button>
    );
  }

  // Completed state - show download
  if (isCompleted && deck) {
    const resultPayload = deck.pdfUrl ? { pdfUrl: deck.pdfUrl } : 
      (typeof deck === 'object' && 'resultPayload' in deck && deck.resultPayload) 
        ? JSON.parse(deck.resultPayload as string) 
        : null;
    const pdfUrl = resultPayload?.pdfUrl;

    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => pdfUrl && window.open(pdfUrl, "_blank")}
                disabled={!pdfUrl}
              >
                <CheckCircle2 className="w-4 h-4" />
                {!compact && <span className="ml-2">Deck Ready</span>}
                {pdfUrl && <Download className="w-3 h-3 ml-1" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generated {deck.completedAt ? formatTimeAgo(deck.completedAt) : "recently"}</p>
              {deck.processingTimeMs && (
                <p className="text-xs text-muted-foreground">
                  Took {(deck.processingTimeMs / 1000).toFixed(1)}s
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Regenerate button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSchedule}
                disabled={isScheduling}
              >
                <RefreshCw className={cn("w-4 h-4", isScheduling && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate deck</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Failed state
  if (isFailed && deck) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={handleRetry}
                disabled={isScheduling}
              >
                <AlertCircle className="w-4 h-4" />
                {!compact && <span className="ml-2">Failed</span>}
                <RefreshCw className={cn("w-3 h-3 ml-1", isScheduling && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Generation failed</p>
              {deck.errorMessage && (
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {deck.errorMessage}
                </p>
              )}
              <p className="text-xs mt-1">Click to retry</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // In progress state (pending or processing)
  if (isInProgress && deck) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className="border-amber-500/50 text-amber-400"
                disabled
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                {!compact && (
                  <span className="ml-2">
                    {isProcessing ? "Generating..." : "Queued"}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isProcessing ? "Generating your deck" : "Waiting for worker"}</p>
              <p className="text-xs text-muted-foreground">
                Started {formatTimeAgo(deck.createdAt)}
              </p>
              {deck.isStale && (
                <p className="text-xs text-amber-400 mt-1">
                  Taking longer than expected
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Cancel button (only for pending) */}
          {isPending && (
            <AnimatePresence>
              {showConfirmCancel ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1"
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowConfirmCancel(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </motion.div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => setShowConfirmCancel(true)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel generation</TooltipContent>
                </Tooltip>
              )}
            </AnimatePresence>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Default state - ready to generate
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleSchedule}
            disabled={isScheduling}
            className={cn(
              "border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500",
              className
            )}
          >
            {isScheduling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {!compact && (
              <span className="ml-2">
                {isScheduling ? "Scheduling..." : "Prep Deck"}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Generate a personalized sales deck</p>
          <p className="text-xs text-muted-foreground">
            Uses AI to create a tailored presentation
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact status badge for card views
 */
export function DeckStatusBadge({ customerId }: { customerId: string }) {
  const { isLoading, isPending, isProcessing, isCompleted, isFailed } = 
    useDeckGeneration(customerId);

  if (isLoading) return null;

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
        <CheckCircle2 className="w-3 h-3" />
        Deck Ready
      </span>
    );
  }

  if (isPending || isProcessing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        {isProcessing ? "Generating" : "Queued"}
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }

  return null;
}
