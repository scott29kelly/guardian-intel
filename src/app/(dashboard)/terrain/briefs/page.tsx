'use client';

import { useState, useEffect } from 'react';
import { FileText, Calendar, ChevronRight, Search, Filter } from 'lucide-react';
import { terrainData } from '@/lib/terrain/data-provider';
import { IntelligenceBrief } from '@/lib/terrain/types';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import DataSourceBadge from '@/components/terrain/DataSourceBadge';

export default function BriefsArchivePage() {
  const [briefs, setBriefs] = useState<IntelligenceBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    terrainData.initialize();
    setBriefs(terrainData.getBriefArchive());
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-secondary rounded-lg" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link href="/terrain" className="hover:text-text-secondary transition-colors">
              Trade Terrain
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Brief Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Intelligence Brief Archive</h1>
          <p className="text-text-muted mt-1">Historical briefs and analysis reports</p>
        </div>
      </div>
      
      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search briefs..."
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-intel-500/50"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>
      
      {/* Briefs List */}
      <div className="space-y-4">
        {briefs.map((brief) => (
          <Link 
            key={brief.id}
            href={`/terrain/briefs/${brief.id}`}
            className="block glass-panel p-4 hover:border-intel-500/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-intel-500/10">
                  <FileText className="w-5 h-5 text-intel-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary capitalize">
                      {brief.briefType} Intelligence Brief
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      brief.status === 'published' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {brief.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mb-2">
                    {brief.territory} • {format(brief.periodStart, 'MMM d')} - {format(brief.periodEnd, 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {brief.executiveSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-xs text-text-muted">
                        Generated {formatDistanceToNow(brief.generatedAt, { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {brief.insights.length} insights • {brief.actionItems.length} actions
                    </span>
                    <div className="flex gap-1">
                      {brief.dataSourcesUsed.slice(0, 3).map((source, i) => (
                        <DataSourceBadge key={i} status={source.sourceStatus} showLabel={false} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-intel-400 transition-colors" />
            </div>
          </Link>
        ))}
        
        {briefs.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No briefs yet</h3>
            <p className="text-text-muted">Intelligence briefs will appear here once generated.</p>
          </div>
        )}
      </div>
    </div>
  );
}
