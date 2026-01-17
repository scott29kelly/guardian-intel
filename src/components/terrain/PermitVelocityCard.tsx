'use client';

import { FileCheck, TrendingUp, TrendingDown, Minus, Building } from 'lucide-react';
import { PermitVelocity } from '@/lib/terrain/types';

interface PermitVelocityCardProps {
  velocities: PermitVelocity[];
  permitStats: {
    totalCount: number;
    roofingCount: number;
    roofingSharePercent: number;
    totalValue: number;
  };
}

export default function PermitVelocityCard({ velocities, permitStats }: PermitVelocityCardProps) {
  const topAccelerating = velocities
    .filter(v => v.trend === 'accelerating')
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 4);
  
  const getTrendIcon = (trend: PermitVelocity['trend']) => {
    switch (trend) {
      case 'accelerating': return TrendingUp;
      case 'decelerating': return TrendingDown;
      default: return Minus;
    }
  };
  
  const getTrendColor = (trend: PermitVelocity['trend']) => {
    switch (trend) {
      case 'accelerating': return 'text-emerald-400';
      case 'decelerating': return 'text-rose-400';
      default: return 'text-zinc-400';
    }
  };
  
  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-intel-500/20 to-intel-500/5 p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <FileCheck className="w-5 h-5 text-intel-400" />
          <h3 className="font-semibold text-text-primary">Permit Velocity</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">30-Day Total</p>
            <p className="text-2xl font-bold font-mono text-text-primary">{permitStats.totalCount}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Roofing Share</p>
            <p className="text-2xl font-bold font-mono text-intel-400">{permitStats.roofingSharePercent}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">
              {permitStats.roofingCount} roofing permits
            </span>
          </div>
          <div className="text-xs text-text-muted">
            ${(permitStats.totalValue / 1000000).toFixed(1)}M total value
          </div>
        </div>
      </div>
      
      {/* Accelerating Markets */}
      <div className="p-4">
        <h4 className="text-xs text-text-muted uppercase tracking-wider font-medium mb-3">
          Accelerating Markets
        </h4>
        <div className="space-y-2">
          {topAccelerating.map((v, i) => {
            const TrendIcon = getTrendIcon(v.trend);
            const trendColor = getTrendColor(v.trend);
            
            return (
              <div 
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-secondary hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary">
                    {v.county}, {v.state}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {v.roofingSharePercent}% roofing
                  </span>
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      +{v.percentChange}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {topAccelerating.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">
              No accelerating markets this period
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
