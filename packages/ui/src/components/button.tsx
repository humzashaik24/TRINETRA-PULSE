import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium tp-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-hover',
        secondary:
          'bg-transparent border border-border text-foreground hover:bg-surface-hover active:bg-surface-active',
        ghost:
          'bg-transparent text-foreground-secondary hover:bg-surface-hover active:bg-surface-active',
        danger:
          'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
        'danger-ghost':
          'bg-transparent text-danger hover:bg-danger-subtle active:bg-danger-subtle',
        link:
          'bg-transparent text-brand underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-7 px-2.5 gap-1.5 rounded-md text-xs',
        md: 'h-8 px-3 gap-2 rounded-md',
        lg: 'h-9 px-4 gap-2 rounded-lg',
        xl: 'h-10 px-5 gap-2.5 rounded-lg text-base',
        icon: 'h-8 w-8 rounded-md',
        'icon-sm': 'h-7 w-7 rounded-md',
        'icon-lg': 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
