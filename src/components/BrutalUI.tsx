import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const BrutalButton = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className, 
  ...props 
}: BrutalButtonProps) => {
  const variants = {
    primary: 'bg-sp-purple hover:bg-sp-purple-hover text-white shadow-sm hover:shadow-md focus:ring-sp-purple/30',
    secondary: 'bg-sp-purple-light text-sp-purple hover:bg-sp-purple/10 focus:ring-sp-purple/20',
    danger: 'bg-sp-red-bg text-sp-red-text hover:bg-[#FEE2E2]/80 focus:ring-sp-red-text/20',
  };

  return (
    <button
      className={cn(
        'px-6 py-3.5 font-sans font-bold rounded-2xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98] outline-none focus:ring-4',
        variants[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {children}
    </button>
  );
};

export const BrutalInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all placeholder:text-sp-text-subtle font-sans antialiased',
          className
        )}
        {...props}
      />
    );
  }
);

export const BrutalSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full bg-white border border-sp-border focus:border-sp-purple px-4 py-3.5 text-sm text-sp-text-dark rounded-xl focus:outline-none focus:ring-4 focus:ring-sp-purple/10 transition-all appearance-none font-sans cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

export const BrutalLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn('text-xs font-sans font-bold uppercase tracking-wider text-sp-text-sec mb-2 block', className)}>
    {children}
  </label>
);

export const BrutalCard = ({ children, className, highlight }: { children: React.ReactNode; className?: string; highlight?: boolean }) => (
  <div className={cn(
    'p-6 border border-sp-border rounded-3xl transition-all duration-300 h-full flex flex-col relative overflow-hidden shadow-sm hover:shadow-md',
    highlight ? 'bg-sp-purple text-white border-transparent' : 'bg-white text-sp-text-dark',
    className
  )}>
    {children}
  </div>
);

export const Title = ({ children, subtitle, className }: { children: React.ReactNode; subtitle?: string; className?: string }) => (
  <div className="mb-8">
    <div className="flex flex-col">
      <div className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-sp-purple mb-1">
        {subtitle || 'SISTEMA ATIVO'}
      </div>
      <h1 className={cn('text-3xl sm:text-4xl font-sans font-extrabold tracking-tight text-sp-text-dark', className)}>
        {children}
      </h1>
    </div>
  </div>
);
