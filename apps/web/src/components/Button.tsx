import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactElement;
}

const variantClasses = {
  primary: 'bg-brand-navy text-white hover:bg-brand-navy-dark',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  gold: 'bg-brand-gold text-brand-navy hover:bg-brand-gold-dark',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || loading}
      {...props}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!loading && icon && (
        <span className="mr-2">
          {React.isValidElement(icon) ? icon : React.createElement(icon as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
        </span>
      )}
      {children}
    </button>
  );
};
