'use client';

import { AlertTriangle, CloudLightning, Users, TrendingUp, FileCheck, Shield, Target, X, Clock } from 'lucide-react';
import { TerrainAlert, AlertType } from '@/lib/terrain/types';
import { formatDistanceToNow } from 'date-fns';

interface AlertBannerProps {
  alert: TerrainAlert;
  onDismiss?: () => void;
  onAction?: () => void;
}

const ALERT_TYPE_CONFIG: Record<AlertType, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  storm_event: { icon: CloudLightning, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  competitor_activity: { icon: Users, color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/30' },
  market_shift: { icon: TrendingUp, color: 'text-intel-400', bgColor: 'bg-intel-500/10 border-intel-500/30' },
  permit_spike: { icon: FileCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  insurance_change: { icon: Shield, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30' },
  opportunity_window: { icon: Target, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
};

const PRIORITY_STYLES = {
  critical: 'border-rose-500 animate-pulse',
  high: 'border-amber-500',
  medium: 'border-intel-500',
  low: 'border-zinc-500',
};

export default function AlertBanner({ alert, onDismiss, onAction }: AlertBannerProps) {
  const config = ALERT_TYPE_CONFIG[alert.alertType];
  const Icon = config.icon;
  const priorityStyle = PRIORITY_STYLES[alert.priority];
  
  const timeRemaining = formatDistanceToNow(alert.expiresAt, { addSuffix: false });
  
  return (
    <div className={`glass-panel border-l-4 ${priorityStyle} ${config.bgColor} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-surface-secondary ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase ${config.color}`}>
                  {alert.alertType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-text-muted">•</span>
                <span className="text-xs text-text-muted capitalize">{alert.priority} priority</span>
              </div>
              <h3 className="text-text-primary font-semibold">{alert.title}</h3>
              <p className="text-sm text-text-secondary mt-1">{alert.summary}</p>
              
              {/* Affected Areas */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alert.affectedArea.counties.slice(0, 4).map((county, i) => (
                  <span 
                    key={i}
                    className="text-xs px-2 py-0.5 rounded bg-surface-secondary border border-border text-text-muted"
                  >
                    {county}
                  </span>
                ))}
                {alert.affectedArea.counties.length > 4 && (
                  <span className="text-xs text-text-muted">
                    +{alert.affectedArea.counties.length - 4} more
                  </span>
                )}
              </div>
              
              {/* Recommended Actions */}
              {alert.recommendedActions.length > 0 && (
                <div className="mt-3 space-y-1">
                  {alert.recommendedActions.slice(0, 2).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-intel-400 font-bold">→</span>
                      <span className="text-text-secondary">{action}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Time remaining */}
              <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Window closes in {timeRemaining}</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {onAction && (
              <button
                onClick={onAction}
                className={`px-3 py-1.5 rounded-lg ${config.bgColor} ${config.color} text-sm font-medium hover:opacity-80 transition-opacity`}
              >
                Take Action
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
