import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'score';
}

export function Progress({ 
  value, 
  max = 100, 
  className, 
  indicatorClassName,
  showLabel = false,
  size = 'md',
  variant = 'default'
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const getIndicatorColor = () => {
    if (variant === 'score') {
      if (percentage >= 70) return 'bg-success';
      if (percentage >= 40) return 'bg-warning';
      return 'bg-danger';
    }
    if (variant === 'gradient') {
      return 'bg-gradient-to-r from-storm-500 to-storm-300';
    }
    return 'bg-storm-500';
  };

  return (
    <div className="flex items-center gap-3">
      <ProgressPrimitive.Root
        className={cn(
          'relative overflow-hidden rounded-full bg-guardian-800',
          sizes[size],
          'flex-1',
          className
        )}
        value={percentage}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            getIndicatorColor(),
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </ProgressPrimitive.Root>
      {showLabel && (
        <span className="text-xs font-medium text-guardian-400 tabular-nums min-w-[3ch]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({ 
  value, 
  max = 100, 
  size = 80, 
  strokeWidth = 6,
  className 
}: ScoreRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return '#22c55e'; // success
    if (percentage >= 40) return '#f59e0b'; // warning
    return '#ef4444'; // danger
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-guardian-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-guardian-100">{Math.round(value)}</span>
      </div>
    </div>
  );
}
