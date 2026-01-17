'use client';

import { 
  CloudLightning, 
  FileCheck, 
  Home, 
  Newspaper, 
  Search, 
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { DataSource } from '@/lib/terrain/types';
import DataSourceBadge from './DataSourceBadge';
import { format, formatDistanceToNow } from 'date-fns';

interface SourcesGridProps {
  sources: DataSource[];
  onSourceClick?: (source: DataSource) => void;
}

const ICON_MAP: Record<string, typeof CloudLightning> = {
  CloudLightning,
  FileCheck,
  Home,
  Newspaper,
  Search,
  Shield,
};

export default function SourcesGrid({ sources, onSourceClick }: SourcesGridProps) {
  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 90) return 'text-emerald-400';
    if (reliability >= 75) return 'text-intel-400';
    if (reliability >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };
  
  const getReliabilityBg = (reliability: number) => {
    if (reliability >= 90) return 'bg-emerald-500/20';
    if (reliability >= 75) return 'bg-intel-500/20';
    if (reliability >= 50) return 'bg-amber-500/20';
    return 'bg-rose-500/20';
  };
  
  const getStatusDescription = (status: DataSource['status']) => {
    switch (status) {
      case 'live': return 'Real-time production data';
      case 'mock': return 'Pre-release data';
      case 'placeholder': return 'Integration pending';
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sources.map((source) => {
        const Icon = ICON_MAP[source.iconName] || Info;
        
        return (
          <div 
            key={source.id}
            className="glass-panel p-4 hover:border-intel-500/30 transition-all cursor-pointer group"
            onClick={() => onSourceClick?.(source)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  source.status === 'live' ? 'bg-emerald-500/10 text-emerald-400' :
                  source.status === 'mock' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-zinc-500/10 text-zinc-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary text-sm">{source.name}</h3>
                  <p className="text-xs text-text-muted capitalize">{source.type.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <DataSourceBadge status={source.status} />
            </div>
            
            <p className="text-xs text-text-secondary mb-3 line-clamp-2">
              {source.description}
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-surface-secondary rounded p-2">
                <p className="text-[10px] text-text-muted uppercase mb-0.5">Records</p>
                <p className="text-sm font-mono text-text-primary">
                  {source.recordCount > 0 ? source.recordCount.toLocaleString() : '—'}
                </p>
              </div>
              <div className="bg-surface-secondary rounded p-2">
                <p className="text-[10px] text-text-muted uppercase mb-0.5">Reliability</p>
                <p className={`text-sm font-mono ${getReliabilityColor(source.reliability)}`}>
                  {source.reliability}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="capitalize">{source.refreshFrequency}</span>
              </div>
              <span>
                Updated {formatDistanceToNow(source.lastUpdated, { addSuffix: true })}
              </span>
            </div>
            
            {/* Integration notes for placeholder sources */}
            {source.status === 'placeholder' && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-text-muted">
                    {source.integrationNotes}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
