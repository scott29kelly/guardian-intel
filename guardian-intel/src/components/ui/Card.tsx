import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'interactive';
}

export function Card({ children, className, onClick, variant = 'default' }: CardProps) {
  const baseStyles = 'rounded-xl bg-guardian-900 border border-guardian-800';
  
  const variants = {
    default: '',
    elevated: 'shadow-elevated',
    interactive: 'cursor-pointer transition-all duration-200 hover:border-guardian-700 hover:bg-guardian-800/50 active:scale-[0.99]',
  };

  return (
    <div 
      className={cn(baseStyles, variants[variant], className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-guardian-800', className)}>
      <div className="flex items-center gap-2">
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function CardTitle({ children, className, icon }: CardTitleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon && <span className="text-storm-400">{icon}</span>}
      <h3 className="text-sm font-semibold text-guardian-100 tracking-tight">{children}</h3>
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-4 py-3 border-t border-guardian-800 bg-guardian-900/50', className)}>
      {children}
    </div>
  );
}
