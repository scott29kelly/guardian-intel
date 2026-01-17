'use client';

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CloudLightning, Users, TrendingUp, FileCheck, Shield, Target, Filter, Settings } from 'lucide-react';
import { terrainData } from '@/lib/terrain/data-provider';
import { TerrainAlert, AlertType } from '@/lib/terrain/types';
import { AlertBanner } from '@/components/terrain';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const ALERT_TYPE_FILTERS: { type: AlertType | 'all'; label: string; icon: typeof AlertTriangle }[] = [
  { type: 'all', label: 'All Alerts', icon: Bell },
  { type: 'storm_event', label: 'Storm Events', icon: CloudLightning },
  { type: 'competitor_activity', label: 'Competitor', icon: Users },
  { type: 'permit_spike', label: 'Permits', icon: FileCheck },
  { type: 'market_shift', label: 'Market', icon: TrendingUp },
  { type: 'opportunity_window', label: 'Opportunities', icon: Target },
  { type: 'insurance_change', label: 'Insurance', icon: Shield },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<TerrainAlert[]>([]);
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [showActive, setShowActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    terrainData.initialize();
    setAlerts(terrainData.getAllAlerts());
    setIsLoading(false);
  }, []);
  
  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== 'all' && alert.alertType !== filterType) return false;
    if (showActive && alert.status !== 'active') return false;
    return true;
  });
  
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const highPriorityCount = alerts.filter(a => a.status === 'active' && (a.priority === 'high' || a.priority === 'critical')).length;
  
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-surface-secondary rounded-lg" />
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
            <span className="text-text-secondary">Alerts</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Alert Center</h1>
          <p className="text-text-muted mt-1">Time-sensitive notifications and action triggers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Configure Alerts</span>
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Active Alerts</p>
              <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
            </div>
            <Bell className="w-8 h-8 text-intel-400 opacity-50" />
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">High Priority</p>
              <p className="text-2xl font-bold text-amber-400">{highPriorityCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-400 opacity-50" />
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total (30 days)</p>
              <p className="text-2xl font-bold text-text-secondary">{alerts.length}</p>
            </div>
            <Target className="w-8 h-8 text-text-muted opacity-50" />
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Filter className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">Filter:</span>
          </div>
          
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {ALERT_TYPE_FILTERS.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-intel-500/10 text-intel-400 border border-intel-500/30'
                    : 'bg-surface-secondary text-text-muted hover:text-text-secondary border border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActive}
                onChange={(e) => setShowActive(e.target.checked)}
                className="w-4 h-4 rounded bg-surface-secondary border-border text-intel-500 focus:ring-intel-500"
              />
              <span className="text-sm text-text-muted">Active only</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <AlertBanner 
            key={alert.id} 
            alert={alert}
            onAction={() => {
              // Handle action
            }}
          />
        ))}
        
        {filteredAlerts.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No alerts match your filters</h3>
            <p className="text-text-muted">
              {showActive ? 'No active alerts at this time.' : 'Try adjusting your filter settings.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Alert Configuration Note */}
      <div className="glass-panel p-4 border-intel-500/30 bg-intel-500/5">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-intel-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-intel-300">Alert Configuration</h3>
            <p className="text-sm text-text-secondary mt-1">
              Configure alert thresholds, notification channels, and escalation rules. 
              Alerts can be sent via email, SMS, push notifications, or integrated with Slack/Teams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
