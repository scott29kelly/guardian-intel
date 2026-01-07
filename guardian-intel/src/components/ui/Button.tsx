import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-storm-500 focus:ring-offset-2 focus:ring-offset-guardian-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };
  
  const variants = {
    primary: 'bg-storm-500 text-white hover:bg-storm-400 active:bg-storm-600',
    secondary: 'bg-guardian-800 text-guardian-200 hover:bg-guardian-700 border border-guardian-700',
    ghost: 'bg-transparent text-guardian-300 hover:bg-guardian-800 hover:text-guardian-100',
    danger: 'bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30',
  };

  return (
    <button
      className={cn(baseStyles, sizes[size], variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
