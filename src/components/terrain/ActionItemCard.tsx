'use client';

import { Circle, CheckCircle2, Clock, XCircle, PlayCircle, ChevronRight } from 'lucide-react';
import { ActionItem } from '@/lib/terrain/types';
import { format, formatDistanceToNow } from 'date-fns';

interface ActionItemCardProps {
  item: ActionItem;
  onStatusChange?: (newStatus: ActionItem['status']) => void;
  compact?: boolean;
}

const STATUS_CONFIG = {
  pending: { icon: Circle, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
  in_progress: { icon: PlayCircle, color: 'text-intel-400', bgColor: 'bg-intel-500/10' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  dismissed: { icon: XCircle, color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
};

const URGENCY_CONFIG = {
  immediate: { label: 'Immediate', color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  this_week: { label: 'This Week', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  this_month: { label: 'This Month', color: 'text-intel-400', bgColor: 'bg-intel-500/20' },
  this_quarter: { label: 'This Quarter', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
};

const TEAM_LABELS = {
  sales: 'Sales Team',
  production: 'Production',
  leadership: 'Leadership',
  operations: 'Operations',
  all: 'All Teams',
};

export default function ActionItemCard({ item, onStatusChange, compact = false }: ActionItemCardProps) {
  const statusConfig = STATUS_CONFIG[item.status];
  const urgencyConfig = URGENCY_CONFIG[item.urgency];
  const StatusIcon = statusConfig.icon;
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <button
          onClick={() => onStatusChange?.(item.status === 'completed' ? 'pending' : 'completed')}
          className={`p-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity`}
        >
          <StatusIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${item.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            {item.action}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${urgencyConfig.bgColor} ${urgencyConfig.color}`}>
          {urgencyConfig.label}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`glass-panel p-4 ${item.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange?.(item.status === 'completed' ? 'pending' : 'completed')}
          className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity shrink-0`}
        >
          <StatusIcon className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${urgencyConfig.bgColor} ${urgencyConfig.color}`}>
              {urgencyConfig.label}
            </span>
            <span className="text-xs text-text-muted">
              Assign to: {TEAM_LABELS[item.assignTo]}
            </span>
          </div>
          
          <p className={`font-medium ${item.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            {item.action}
          </p>
          
          <p className="text-sm text-text-secondary mt-1">{item.rationale}</p>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="w-3.5 h-3.5" />
              {item.dueDate ? (
                <span>Due {format(item.dueDate, 'MMM d')}</span>
              ) : (
                <span>No deadline</span>
              )}
            </div>
            
            <span className="text-xs text-text-muted">
              Impact: {item.expectedImpact}
            </span>
          </div>
        </div>
      </div>
      
      {/* Quick status change buttons */}
      {item.status === 'pending' && onStatusChange && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={() => onStatusChange('in_progress')}
            className="flex-1 py-2 px-3 rounded-lg bg-intel-500/10 hover:bg-intel-500/20 border border-intel-500/30 text-intel-400 text-sm font-medium transition-colors"
          >
            Start Working
          </button>
          <button
            onClick={() => onStatusChange('dismissed')}
            className="py-2 px-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-text-muted text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
