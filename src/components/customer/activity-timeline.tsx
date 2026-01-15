"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Video,
  Users,
  CloudLightning,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  ChevronDown,
  Loader2,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  useTimeline,
  flattenTimelinePages,
  groupTimelineByDate,
  type TimelineItem,
  type TimelineItemType,
} from "@/lib/hooks/use-timeline";

interface ActivityTimelineProps {
  customerId: string;
  /** Max height for scrollable container */
  maxHeight?: string;
  /** Number of items per page */
  limit?: number;
  /** Filter to specific types */
  types?: TimelineItemType[];
  /** Show in compact mode (for card previews) */
  compact?: boolean;
  /** Maximum items to show in compact mode */
  compactLimit?: number;
}

// Icon mapping for timeline item types
const typeIcons: Record<TimelineItemType, React.ElementType> = {
  interaction: Phone,
  weather_event: CloudLightning,
  intel: AlertTriangle,
  note: FileText,
  stage_change: TrendingUp,
  claim: Shield,
};

// Interaction subtype icons
const interactionIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  visit: MapPin,
  meeting: Users,
  "video-call": Video,
};

// Color classes for different types and priorities
const typeColors: Record<TimelineItemType, string> = {
  interaction: "bg-accent-primary/10 text-accent-primary border-accent-primary/30",
  weather_event: "bg-accent-danger/10 text-accent-danger border-accent-danger/30",
  intel: "bg-accent-warning/10 text-accent-warning border-accent-warning/30",
  note: "bg-surface-secondary text-text-muted border-border",
  stage_change: "bg-accent-success/10 text-accent-success border-accent-success/30",
  claim: "bg-intel-500/10 text-intel-400 border-intel-500/30",
};

const priorityColors: Record<string, string> = {
  low: "bg-surface-secondary text-text-muted",
  medium: "bg-accent-primary/10 text-accent-primary",
  high: "bg-accent-warning/10 text-accent-warning",
  critical: "bg-accent-danger/10 text-accent-danger",
};

function TimelineItemCard({
  item,
  compact,
}: {
  item: TimelineItem;
  compact?: boolean;
}) {
  // Get the appropriate icon
  const getIcon = () => {
    if (item.type === "interaction" && item.metadata.interactionType) {
      return interactionIcons[item.metadata.interactionType as string] || Phone;
    }
    return typeIcons[item.type];
  };

  const Icon = getIcon();
  const colorClass = typeColors[item.type];

  // Format the time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-text-primary truncate">{item.title}</p>
          {item.description && (
            <p className="font-mono text-[10px] text-text-muted truncate">{item.description}</p>
          )}
        </div>
        <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
          {formatTime(item.date)}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-8 pb-4 group"
    >
      {/* Timeline line */}
      <div className="absolute left-3 top-3 bottom-0 w-px bg-border group-last:hidden" />
      
      {/* Icon */}
      <div 
        className={`
          absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center border
          ${colorClass}
        `}
      >
        <Icon className="w-3 h-3" />
      </div>

      {/* Content */}
      <div className="panel p-3 hover:border-border-hover transition-colors">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-mono text-sm font-medium text-text-primary">{item.title}</h4>
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.priority && item.priority !== "medium" && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${priorityColors[item.priority]}`}>
                {item.priority}
              </span>
            )}
            <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(item.date)}
            </span>
          </div>
        </div>

        {item.description && (
          <p className="font-mono text-xs text-text-secondary mb-2 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-3 flex-wrap">
          {item.user && (
            <span className="font-mono text-[10px] text-text-muted">
              by {item.user}
            </span>
          )}
          
          {/* Type-specific metadata */}
          {item.type === "interaction" && item.metadata.outcome != null ? (
            <span className="data-badge text-[9px]">
              {String(item.metadata.outcome)}
            </span>
          ) : null}
          
          {item.type === "interaction" && item.metadata.duration != null ? (
            <span className="font-mono text-[10px] text-text-muted">
              {Math.floor(Number(item.metadata.duration) / 60)}m {Number(item.metadata.duration) % 60}s
            </span>
          ) : null}

          {item.type === "weather_event" && item.metadata.severity != null ? (
            <span className="data-badge text-[9px] border-accent-danger/30 text-accent-danger">
              {String(item.metadata.severity)}
            </span>
          ) : null}

          {item.type === "intel" && item.metadata.confidence != null ? (
            <span className="font-mono text-[10px] text-text-muted">
              {Number(item.metadata.confidence)}% confidence
            </span>
          ) : null}

          {item.type === "claim" && item.metadata.approvedValue != null ? (
            <span className="font-mono text-[10px] text-accent-success">
              ${Number(item.metadata.approvedValue).toLocaleString()}
            </span>
          ) : null}

          {item.metadata.nextAction != null ? (
            <span className="flex items-center gap-1 text-accent-primary font-mono text-[10px]">
              <Zap className="w-3 h-3" />
              {String(item.metadata.nextAction)}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function ActivityTimeline({
  customerId,
  maxHeight = "400px",
  limit = 20,
  types,
  compact = false,
  compactLimit = 5,
}: ActivityTimelineProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTimeline(customerId, { limit, types });

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || compact) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver, compact]);

  // Get flattened items
  const allItems = flattenTimelinePages(data?.pages);
  const displayItems = compact ? allItems.slice(0, compactLimit) : allItems;
  const groupedItems = compact ? null : groupTimelineByDate(displayItems);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        <span className="ml-2 font-mono text-sm text-text-muted">Loading timeline...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="panel p-4 border-accent-danger/30 bg-accent-danger/5">
        <p className="font-mono text-sm text-accent-danger">
          Failed to load timeline: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  // Empty state
  if (displayItems.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <Clock className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="font-mono text-sm text-text-muted">No activity yet</p>
        <p className="font-mono text-xs text-text-muted mt-1">
          Activity will appear here as it happens
        </p>
      </div>
    );
  }

  // Compact mode (for card previews)
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-mono text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Recent Activity
          </h4>
          {totalCount > compactLimit && (
            <span className="font-mono text-[10px] text-text-muted">
              +{totalCount - compactLimit} more
            </span>
          )}
        </div>
        <div className="divide-y divide-border">
          {displayItems.map((item) => (
            <TimelineItemCard key={item.id} item={item} compact />
          ))}
        </div>
      </div>
    );
  }

  // Full timeline with grouping
  return (
    <div 
      className="overflow-y-auto pr-2" 
      style={{ maxHeight }}
    >
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {Array.from(groupedItems!.entries()).map(([groupLabel, items]) => (
            <motion.div
              key={groupLabel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              {/* Group header */}
              <div className="sticky top-0 z-10 bg-surface-primary/95 backdrop-blur-sm py-2">
                <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-primary/50" />
                  {groupLabel}
                  <span className="text-[10px] text-text-muted">({items.length})</span>
                </h3>
              </div>

              {/* Items in group */}
              <div className="space-y-0">
                {items.map((item) => (
                  <TimelineItemCard key={item.id} item={item} />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            <span className="font-mono text-xs text-text-muted">Loading more...</span>
          </div>
        )}
        {!hasNextPage && displayItems.length > 0 && (
          <p className="text-center font-mono text-xs text-text-muted">
            — End of timeline —
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Condensed timeline for customer cards
 */
export function RecentActivityPreview({
  customerId,
  limit = 3,
}: {
  customerId: string;
  limit?: number;
}) {
  return (
    <ActivityTimeline
      customerId={customerId}
      compact
      compactLimit={limit}
    />
  );
}
