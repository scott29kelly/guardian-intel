'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KeyMetric } from '@/lib/terrain/types';

interface TerrainMetricCardProps {
  metric: KeyMetric;
}

export default function TerrainMetricCard({ metric }: TerrainMetricCardProps) {
  const TrendIcon = metric.changeDirection === 'up' ? TrendingUp 
    : metric.changeDirection === 'down' ? TrendingDown : Minus;
  
  const trendColor = metric.changeIsPositive 
    ? 'text-emerald-400' 
    : metric.changeDirection === 'flat' 
      ? 'text-zinc-400' 
      : 'text-rose-400';
  
  const trendBgColor = metric.changeIsPositive 
    ? 'bg-emerald-500/10' 
    : metric.changeDirection === 'flat' 
      ? 'bg-zinc-500/10' 
      : 'bg-rose-500/10';
  
  return (
    <div className="glass-panel p-4 hover:border-intel-500/30 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium">
            {metric.name}
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1 font-mono tracking-tight">
            {typeof metric.value === 'number' 
              ? metric.value.toLocaleString() 
              : metric.value}
            <span className="text-lg text-text-secondary">{metric.unit}</span>
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBgColor} ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </span>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-2 line-clamp-1">{metric.context}</p>
    </div>
  );
}
