'use client';

import { FileText, Clock, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { IntelligenceBrief } from '@/lib/terrain/types';
import DataSourceBadge from './DataSourceBadge';
import { format, formatDistanceToNow } from 'date-fns';

interface IntelligenceBriefCardProps {
  brief: IntelligenceBrief;
  onViewDetails?: () => void;
  compact?: boolean;
}

export default function IntelligenceBriefCard({ 
  brief, 
  onViewDetails,
  compact = false 
}: IntelligenceBriefCardProps) {
  const actionableCount = brief.actionItems.filter(a => a.status === 'pending').length;
  const highPriorityInsights = brief.insights.filter(i => i.priority === 'critical' || i.priority === 'high').length;
  
  if (compact) {
    return (
      <div 
        className="glass-panel p-4 cursor-pointer hover:border-intel-500/30 transition-all"
        onClick={onViewDetails}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-intel-500/10">
              <FileText className="w-4 h-4 text-intel-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary capitalize">
                {brief.briefType} Brief
              </p>
              <p className="text-xs text-text-muted">
                {formatDistanceToNow(brief.generatedAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-intel-500/15 to-transparent p-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-intel-500/10">
              <FileText className="w-5 h-5 text-intel-400" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary capitalize">
                {brief.briefType} Intelligence Brief
              </h3>
              <p className="text-xs text-text-muted">{brief.territory}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">
              {format(brief.generatedAt, 'MMM d, h:mm a')}
            </span>
          </div>
        </div>
        
        {/* Data sources used */}
        <div className="flex flex-wrap gap-2 mt-3">
          {brief.dataSourcesUsed.map((source, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-surface-secondary px-2 py-1 rounded-full border border-border">
              <span className="text-text-muted">{source.sourceName}</span>
              <DataSourceBadge status={source.sourceStatus} showLabel={false} size="sm" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Executive Summary */}
      <div className="p-4">
        <h4 className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">
          Executive Summary
        </h4>
        <p className="text-sm text-text-secondary leading-relaxed">
          {brief.executiveSummary}
        </p>
      </div>
      
      {/* Quick Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-secondary rounded-lg p-3 text-center border border-border">
            <p className="text-xl font-bold font-mono text-intel-400">{brief.insights.length}</p>
            <p className="text-[10px] text-text-muted uppercase">Insights</p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-3 text-center border border-border">
            <p className="text-xl font-bold font-mono text-amber-400">{actionableCount}</p>
            <p className="text-[10px] text-text-muted uppercase">Actions</p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-3 text-center border border-border">
            <p className="text-xl font-bold font-mono text-emerald-400">{brief.confidenceScore}%</p>
            <p className="text-[10px] text-text-muted uppercase">Confidence</p>
          </div>
        </div>
      </div>
      
      {/* Priority indicators */}
      {highPriorityInsights > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">
              {highPriorityInsights} high-priority insight{highPriorityInsights !== 1 ? 's' : ''} require attention
            </span>
          </div>
        </div>
      )}
      
      {/* View Details Button */}
      {onViewDetails && (
        <div className="p-4 pt-0">
          <button
            onClick={onViewDetails}
            className="w-full py-2.5 px-4 rounded-lg bg-intel-500/10 hover:bg-intel-500/20 border border-intel-500/30 text-intel-400 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            View Full Brief
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Data Quality Notes */}
      {brief.dataQualityNotes.length > 0 && (
        <div className="px-4 pb-4">
          <details className="group">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
              Data quality notes ({brief.dataQualityNotes.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {brief.dataQualityNotes.map((note, i) => (
                <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                  <span className="text-intel-400">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
