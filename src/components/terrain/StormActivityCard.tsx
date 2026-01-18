'use client';

import { CloudLightning, TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import { StormActivityIndex } from '@/lib/terrain/types';
import { SEVERITY_CONFIG } from '@/lib/terrain/constants';

interface StormActivityCardProps {
  index: StormActivityIndex;
}

export default function StormActivityCard({ index }: StormActivityCardProps) {
  const TrendIcon = index.trend === 'increasing' ? TrendingUp 
    : index.trend === 'decreasing' ? TrendingDown : Minus;
  
  const trendColor = index.trend === 'increasing' 
    ? 'text-emerald-400' 
    : index.trend === 'decreasing' 
      ? 'text-rose-400' 
      : 'text-zinc-400';
  
  // Determine activity level color
  const getIndexColor = (value: number) => {
    if (value >= 70) return 'text-rose-400';
    if (value >= 50) return 'text-amber-400';
    if (value >= 30) return 'text-intel-400';
    return 'text-emerald-400';
  };
  
  const getIndexBg = (value: number) => {
    if (value >= 70) return 'from-rose-500/20 to-rose-500/5';
    if (value >= 50) return 'from-amber-500/20 to-amber-500/5';
    if (value >= 30) return 'from-intel-500/20 to-intel-500/5';
    return 'from-emerald-500/20 to-emerald-500/5';
  };
  
  return (
    <div className="glass-panel overflow-hidden">
      {/* Header with gradient background */}
      <div className={`bg-gradient-to-r ${getIndexBg(index.indexValue)} p-4 border-b border-border`}>
        <div className="flex items-center gap-2 mb-3">
          <CloudLightning className="w-5 h-5 text-intel-400" />
          <h3 className="font-semibold text-text-primary">Storm Activity Index</h3>
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-bold font-mono tracking-tight ${getIndexColor(index.indexValue)}`}>
                {index.indexValue}
              </span>
              <span className="text-lg text-text-muted">/100</span>
            </div>
            <p className="text-sm text-text-muted mt-1">
              {index.eventCount} events this {index.period}
            </p>
          </div>
          
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {index.percentChangeFromPrior > 0 ? '+' : ''}{index.percentChangeFromPrior}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Top Counties */}
      <div className="p-4">
        <h4 className="text-xs text-text-muted uppercase tracking-wider font-medium mb-3">
          Top Affected Counties
        </h4>
        <div className="space-y-2">
          {index.topCounties.slice(0, 4).map((county, i) => {
            const severityConfig = SEVERITY_CONFIG[county.severity] || SEVERITY_CONFIG.minor;
            return (
              <div 
                key={i} 
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-secondary hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-sm text-text-primary">
                    {county.county}, {county.state}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {county.eventCount} event{county.eventCount !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${severityConfig.bgColor} ${severityConfig.color}`}>
                    {severityConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {index.topCounties.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">
            No significant storm activity this period
          </p>
        )}
      </div>
    </div>
  );
}
