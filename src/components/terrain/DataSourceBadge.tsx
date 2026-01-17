'use client';

import { DataSourceStatus } from '@/lib/terrain/types';

interface DataSourceBadgeProps {
  status: DataSourceStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  live: { 
    color: 'bg-emerald-500', 
    pulseColor: 'bg-emerald-400',
    label: 'Live', 
    textColor: 'text-emerald-400' 
  },
  mock: { 
    color: 'bg-amber-500', 
    pulseColor: 'bg-amber-400',
    label: 'Beta', 
    textColor: 'text-amber-400' 
  },
  placeholder: { 
    color: 'bg-zinc-500', 
    pulseColor: 'bg-zinc-400',
    label: 'Pending', 
    textColor: 'text-zinc-400' 
  },
};

export default function DataSourceBadge({ 
  status, 
  showLabel = true,
  size = 'md' 
}: DataSourceBadgeProps) {
  const config = STATUS_CONFIG[status];
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div className={`${dotSize} rounded-full ${config.color}`} />
        {status === 'live' && (
          <div className={`absolute inset-0 ${dotSize} rounded-full ${config.pulseColor} animate-ping opacity-75`} />
        )}
      </div>
      {showLabel && (
        <span className={`${textSize} ${config.textColor} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
