'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Target
} from 'lucide-react';
import { terrainData } from '@/lib/terrain/data-provider';
import { TerrainAlert, IntelligenceBrief, StormActivityIndex, PermitVelocity } from '@/lib/terrain/types';

import TerrainMetricCard from './TerrainMetricCard';
import StormActivityCard from './StormActivityCard';
import PermitVelocityCard from './PermitVelocityCard';
import IntelligenceBriefCard from './IntelligenceBriefCard';
import AlertBanner from './AlertBanner';
import InsightCard from './insight-card';
import BriefViewer from './brief-viewer';

export default function TerrainDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [viewingBrief, setViewingBrief] = useState<IntelligenceBrief | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof terrainData.getDashboardSummary> | null>(null);
  const [stormIndex, setStormIndex] = useState<StormActivityIndex | null>(null);
  const [permitVelocities, setPermitVelocities] = useState<PermitVelocity[]>([]);
  const [permitStats, setPermitStats] = useState<ReturnType<typeof terrainData.getPermitStats> | null>(null);
  const [currentBrief, setCurrentBrief] = useState<IntelligenceBrief | null>(null);
  const [alerts, setAlerts] = useState<TerrainAlert[]>([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = () => {
    setIsLoading(true);
    
    // Initialize terrain data and load all dashboard data
    terrainData.initialize();
    
    setSummary(terrainData.getDashboardSummary());
    setStormIndex(terrainData.getStormActivityIndex());
    setPermitVelocities(terrainData.getPermitVelocities());
    setPermitStats(terrainData.getPermitStats(30));
    setCurrentBrief(terrainData.getCurrentBrief());
    setAlerts(terrainData.getActiveAlerts());
    
    setIsLoading(false);
  };
  
  const handleRefresh = () => {
    terrainData.refresh();
    loadData();
  };
  
  if (viewingBrief) {
    return (
      <div className="p-6">
        <BriefViewer 
          brief={viewingBrief} 
          onBack={() => setViewingBrief(null)} 
        />
      </div>
    );
  }
  
  if (isLoading || !summary) {
    return (
      <div className="p-6 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-surface-secondary rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-secondary rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-surface-secondary rounded-lg" />
      </div>
    );
  }
  
  const topInsights = currentBrief?.insights.slice(0, 3) || [];
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-intel-500/10">
              <Target className="w-6 h-6 text-intel-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Trade Terrain Intelligence</h1>
              <p className="text-sm text-text-muted">
                Guardian Primary Territory • PA, NY, VA, NJ, DE, MD
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border">
            <Activity className="w-4 h-4 text-intel-400" />
            <span className="text-sm text-text-secondary">Last updated: just now</span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
      
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Active Alerts ({alerts.length})
            </h2>
          </div>
          {alerts.filter(a => a.priority === 'high' || a.priority === 'critical').slice(0, 2).map((alert) => (
            <AlertBanner key={alert.id} alert={alert} />
          ))}
        </div>
      )}
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TerrainMetricCard 
          metric={{
            id: 'storm_activity',
            name: 'Storm Activity Index',
            value: summary.stormActivityIndex,
            unit: '/100',
            change: stormIndex?.percentChangeFromPrior || 0,
            changeDirection: (stormIndex?.percentChangeFromPrior || 0) > 0 ? 'up' : (stormIndex?.percentChangeFromPrior || 0) < 0 ? 'down' : 'flat',
            changeIsPositive: (stormIndex?.percentChangeFromPrior || 0) > 0,
            context: `${summary.stormEventCount} events this period`,
          }}
        />
        <TerrainMetricCard 
          metric={{
            id: 'structures_affected',
            name: 'Structures Affected',
            value: summary.structuresAffected,
            unit: '',
            change: 0,
            changeDirection: 'flat',
            changeIsPositive: true,
            context: '30-day rolling estimate',
          }}
        />
        <TerrainMetricCard 
          metric={{
            id: 'permit_count',
            name: 'Roofing Permits',
            value: permitStats?.roofingCount || 0,
            unit: '',
            change: permitStats?.roofingSharePercent || 0,
            changeDirection: 'up',
            changeIsPositive: true,
            context: `${permitStats?.roofingSharePercent}% of all permits`,
          }}
        />
        <TerrainMetricCard 
          metric={{
            id: 'opportunity_score',
            name: 'Opportunity Score',
            value: summary.opportunityScore,
            unit: '/100',
            change: 0,
            changeDirection: 'flat',
            changeIsPositive: true,
            context: 'Composite territory score',
          }}
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Storm & Permits */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stormIndex && <StormActivityCard index={stormIndex} />}
            {permitStats && (
              <PermitVelocityCard 
                velocities={permitVelocities} 
                permitStats={permitStats}
              />
            )}
          </div>
          
          {/* Top Insights */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-intel-400" />
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                  Priority Insights
                </h2>
              </div>
              {currentBrief && currentBrief.insights.length > 3 && (
                <button
                  onClick={() => setViewingBrief(currentBrief)}
                  className="text-xs text-intel-400 hover:text-intel-300 transition-colors"
                >
                  View all {currentBrief.insights.length} →
                </button>
              )}
            </div>
            <div className="space-y-4">
              {topInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column - Intelligence Brief */}
        <div className="space-y-6">
          {currentBrief && (
            <IntelligenceBriefCard 
              brief={currentBrief}
              onViewDetails={() => setViewingBrief(currentBrief)}
            />
          )}
          
          {/* Quick Actions */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
              Quick Navigation
            </h3>
            <div className="space-y-2">
              <a 
                href="/terrain/briefs"
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border transition-colors"
              >
                <span className="text-sm text-text-secondary">Brief Archive</span>
                <span className="text-xs text-text-muted">→</span>
              </a>
              <a 
                href="/terrain/sources"
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border transition-colors"
              >
                <span className="text-sm text-text-secondary">Data Sources</span>
                <span className="text-xs text-text-muted">→</span>
              </a>
              <a 
                href="/terrain/alerts"
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border transition-colors"
              >
                <span className="text-sm text-text-secondary">Alert Configuration</span>
                <span className="text-xs text-text-muted">→</span>
              </a>
              <a 
                href="/terrain/map"
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border transition-colors"
              >
                <span className="text-sm text-text-secondary">Territory Map</span>
                <span className="text-xs text-text-muted">→</span>
              </a>
            </div>
          </div>
          
          {/* Territory Summary */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-intel-400" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                Territory Summary
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Coverage</span>
                <span className="text-text-secondary">6 States, 17 Counties</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Hot Markets</span>
                <span className="text-emerald-400">{summary.hotMarkets}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Competitor Threats</span>
                <span className={summary.activeCompetitorThreats > 0 ? 'text-rose-400' : 'text-text-secondary'}>
                  {summary.activeCompetitorThreats}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Active Alerts</span>
                <span className="text-amber-400">{summary.activeAlertCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
