'use client';

import { useState } from 'react';
import { 
  FileText, 
  Clock, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Lightbulb,
  ListChecks,
  Database,
  BarChart3
} from 'lucide-react';
import { IntelligenceBrief } from '@/lib/terrain/types';
import { format } from 'date-fns';
import TerrainMetricCard from './TerrainMetricCard';
import InsightCard from './InsightCard';
import ActionItemCard from './ActionItemCard';
import DataSourceBadge from './DataSourceBadge';

interface BriefViewerProps {
  brief: IntelligenceBrief;
  onBack?: () => void;
}

type TabId = 'summary' | 'insights' | 'actions' | 'data';

export default function BriefViewer({ brief, onBack }: BriefViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  
  const tabs: { id: TabId; label: string; icon: typeof FileText; count?: number }[] = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'insights', label: 'Insights', icon: Lightbulb, count: brief.insights.length },
    { id: 'actions', label: 'Actions', icon: ListChecks, count: brief.actionItems.filter(a => a.status === 'pending').length },
    { id: 'data', label: 'Data Sources', icon: Database, count: brief.dataSourcesUsed.length },
  ];
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-panel mb-6">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-muted" />
              </button>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-text-primary capitalize">
                  {brief.briefType} Intelligence Brief
                </h1>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  brief.status === 'published' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-zinc-500/20 text-zinc-400'
                }`}>
                  {brief.status}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-1">
                {brief.territory} • {format(brief.periodStart, 'MMM d')} - {format(brief.periodEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-text-muted">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{format(brief.generatedAt, 'MMM d, h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-muted">Confidence:</span>
                <span className={`text-sm font-semibold ${
                  brief.confidenceScore >= 80 ? 'text-emerald-400' :
                  brief.confidenceScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {brief.confidenceScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-intel-500/10 text-intel-400 border border-intel-500/30' 
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-intel-500/20' : 'bg-surface-secondary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'summary' && (
          <>
            {/* Executive Summary */}
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-intel-400" />
                Executive Summary
              </h2>
              <p className="text-text-secondary leading-relaxed text-lg">
                {brief.executiveSummary}
              </p>
            </div>
            
            {/* Key Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-intel-400" />
                Key Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {brief.keyMetrics.map((metric) => (
                  <TerrainMetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </div>
            
            {/* Trends */}
            {brief.trendsIdentified.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-intel-400" />
                  Trends Identified
                </h2>
                <div className="space-y-4">
                  {brief.trendsIdentified.map((trend) => (
                    <div key={trend.id} className="bg-surface-secondary rounded-lg p-4 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-text-primary">{trend.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trend.direction === 'improving' ? 'bg-emerald-500/20 text-emerald-400' :
                          trend.direction === 'declining' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {trend.direction}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mb-2">{trend.description}</p>
                      {trend.projection && (
                        <p className="text-xs text-text-muted italic">
                          Projection: {trend.projection}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {brief.insights.length} Insight{brief.insights.length !== 1 ? 's' : ''}
              </h2>
              <div className="flex gap-2">
                {(['critical', 'high', 'medium', 'low'] as const).map((priority) => {
                  const count = brief.insights.filter(i => i.priority === priority).length;
                  if (count === 0) return null;
                  return (
                    <span 
                      key={priority}
                      className={`text-xs px-2 py-1 rounded ${
                        priority === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                        priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        priority === 'medium' ? 'bg-intel-500/20 text-intel-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {count} {priority}
                    </span>
                  );
                })}
              </div>
            </div>
            
            {brief.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
        
        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {brief.actionItems.length} Action Item{brief.actionItems.length !== 1 ? 's' : ''}
              </h2>
            </div>
            
            {brief.actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Data Sources Used */}
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Data Sources Used</h2>
              <div className="space-y-3">
                {brief.dataSourcesUsed.map((source, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between py-3 px-4 bg-surface-secondary rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <DataSourceBadge status={source.sourceStatus} />
                      <div>
                        <p className="font-medium text-text-primary">{source.sourceName}</p>
                        <p className="text-xs text-text-muted">
                          {source.recordsUsed.toLocaleString()} records • 
                          {format(source.dateRange.start, 'MMM d')} - {format(source.dateRange.end, 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        source.reliability >= 80 ? 'text-emerald-400' :
                        source.reliability >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {source.reliability}% reliable
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Data Quality Notes */}
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Data Quality Notes
              </h2>
              <ul className="space-y-2">
                {brief.dataQualityNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-intel-400 mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
