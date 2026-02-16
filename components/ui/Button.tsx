import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  disabled, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]";
  
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-[0_12px_24px_rgba(14,116,144,0.35)] hover:brightness-110 hover:shadow-[0_16px_35px_rgba(14,116,144,0.45)]",
    secondary: "bg-slate-800/80 text-slate-100 border border-slate-600/60 hover:bg-slate-700/90 hover:border-slate-500",
    danger: "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_10px_24px_rgba(185,28,28,0.35)] hover:brightness-110",
    ghost: "bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white",
    outline: "border border-slate-600/70 bg-slate-900/40 hover:bg-slate-800/70 text-slate-200"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2.5",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
