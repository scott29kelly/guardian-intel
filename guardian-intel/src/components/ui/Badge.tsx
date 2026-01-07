import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  };
  
  const variants = {
    default: 'bg-guardian-800 text-guardian-300',
    success: 'bg-success/20 text-success border border-success/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    danger: 'bg-danger/20 text-danger border border-danger/30',
    info: 'bg-info/20 text-info border border-info/30',
    outline: 'bg-transparent border border-guardian-600 text-guardian-400',
  };

  return (
    <span className={cn(baseStyles, sizes[size], variants[variant], className)}>
      {children}
    </span>
  );
}
