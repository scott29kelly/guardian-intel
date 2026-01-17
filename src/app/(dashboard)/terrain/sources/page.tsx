'use client';

import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { terrainData } from '@/lib/terrain/data-provider';
import { DataSource } from '@/lib/terrain/types';
import { SourcesGrid } from '@/components/terrain';
import Link from 'next/link';

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    terrainData.initialize();
    setSources(terrainData.getDataSources());
    setIsLoading(false);
  }, []);
  
  const liveCount = sources.filter(s => s.status === 'live').length;
  const mockCount = sources.filter(s => s.status === 'mock').length;
  const placeholderCount = sources.filter(s => s.status === 'placeholder').length;
  
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-surface-secondary rounded-lg" />
          ))}
        </div>
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
            <span className="text-text-secondary">Data Sources</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Data Sources</h1>
          <p className="text-text-muted mt-1">External data integrations powering Trade Terrain Intelligence</p>
        </div>
      </div>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{liveCount}</p>
              <p className="text-sm text-text-muted">Live Sources</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{mockCount}</p>
              <p className="text-sm text-text-muted">Beta Sources</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-500/10">
              <Clock className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-400">{placeholderCount}</p>
              <p className="text-sm text-text-muted">Integration Pending</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sources Grid */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-intel-400" />
          Available Data Sources
        </h2>
        <SourcesGrid 
          sources={sources}
          onSourceClick={setSelectedSource}
        />
      </div>
      
      {/* Source Detail Modal */}
      {selectedSource && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSource(null)}
        >
          <div 
            className="glass-panel max-w-lg w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selectedSource.name}</h2>
                <p className="text-sm text-text-muted capitalize">{selectedSource.type.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
              >
                ×
              </button>
            </div>
            
            <p className="text-text-secondary">{selectedSource.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted uppercase mb-1">Status</p>
                <p className={`font-medium ${
                  selectedSource.status === 'live' ? 'text-emerald-400' :
                  selectedSource.status === 'mock' ? 'text-amber-400' : 'text-zinc-400'
                }`}>
                  {selectedSource.status === 'live' ? 'Live' :
                   selectedSource.status === 'mock' ? 'Beta' : 'Pending'}
                </p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted uppercase mb-1">Refresh Rate</p>
                <p className="text-text-primary font-medium capitalize">{selectedSource.refreshFrequency}</p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted uppercase mb-1">Records</p>
                <p className="text-text-primary font-medium">
                  {selectedSource.recordCount > 0 ? selectedSource.recordCount.toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted uppercase mb-1">Reliability</p>
                <p className={`font-medium ${
                  selectedSource.reliability >= 90 ? 'text-emerald-400' :
                  selectedSource.reliability >= 75 ? 'text-intel-400' : 'text-amber-400'
                }`}>
                  {selectedSource.reliability}%
                </p>
              </div>
            </div>
            
            <div className="bg-surface-secondary rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">Integration Notes</h4>
              <p className="text-sm text-text-secondary">{selectedSource.integrationNotes}</p>
            </div>
            
            <button
              onClick={() => setSelectedSource(null)}
              className="w-full py-2.5 px-4 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-text-secondary font-medium text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
