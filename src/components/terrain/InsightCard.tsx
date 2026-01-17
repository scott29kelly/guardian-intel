'use client';

import { AlertTriangle, TrendingUp, Zap, Search, ChevronRight } from 'lucide-react';
import { Insight } from '@/lib/terrain/types';
import DataSourceBadge from './DataSourceBadge';

interface InsightCardProps {
  insight: Insight;
  onActionClick?: () => void;
  compact?: boolean;
}

const CATEGORY_ICONS = {
  opportunity: TrendingUp,
  threat: AlertTriangle,
  trend: Search,
  anomaly: Zap,
};

const CATEGORY_COLORS = {
  opportunity: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  threat: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  trend: { text: 'text-intel-400', bg: 'bg-intel-500/10', border: 'border-intel-500/30' },
  anomaly: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

const PRIORITY_STYLES = {
  critical: 'border-l-rose-500 bg-rose-500/5',
  high: 'border-l-amber-500 bg-amber-500/5',
  medium: 'border-l-intel-500 bg-intel-500/5',
  low: 'border-l-zinc-500 bg-zinc-500/5',
};

export default function InsightCard({ insight, onActionClick, compact = false }: InsightCardProps) {
  const Icon = CATEGORY_ICONS[insight.category];
  const colors = CATEGORY_COLORS[insight.category];
  const priorityStyle = PRIORITY_STYLES[insight.priority];
  
  if (compact) {
    return (
      <div 
        className={`glass-panel p-3 border-l-2 ${priorityStyle} hover:bg-surface-hover cursor-pointer transition-colors`}
        onClick={onActionClick}
      >
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded ${colors.bg} ${colors.text} shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-semibold uppercase ${colors.text}`}>
                {insight.category}
              </span>
              <span className="text-[10px] text-text-muted capitalize">
                {insight.priority}
              </span>
            </div>
            <h4 className="text-sm font-medium text-text-primary line-clamp-1">{insight.title}</h4>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={`glass-panel border-l-2 ${priorityStyle}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold uppercase ${colors.text}`}>
                {insight.category}
              </span>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-text-muted capitalize">{insight.priority} priority</span>
            </div>
            
            <h3 className="text-text-primary font-medium mb-2">{insight.title}</h3>
            <p className="text-sm text-text-secondary mb-3">{insight.description}</p>
            
            {/* Supporting Data */}
            <div className="flex flex-wrap gap-2 mb-3">
              {insight.supportingData.slice(0, 3).map((dp, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-surface-secondary px-2 py-1 rounded text-xs border border-border">
                  <span className="text-text-muted">{dp.metric}:</span>
                  <span className="text-text-primary font-medium">{dp.value}</span>
                  <DataSourceBadge status={dp.sourceStatus} showLabel={false} size="sm" />
                </div>
              ))}
            </div>
            
            {/* Suggested Action */}
            <div className="bg-surface-secondary rounded-lg p-3 border border-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Suggested Action</p>
              <p className="text-sm text-intel-300">{insight.suggestedAction}</p>
            </div>
            
            {/* Impact & Confidence */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-text-muted">
                Impact: <span className="text-text-secondary capitalize">{insight.estimatedImpact.magnitude}</span>
              </span>
              <span className="text-text-muted">
                Confidence: <span className="text-text-secondary">{insight.confidence}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
