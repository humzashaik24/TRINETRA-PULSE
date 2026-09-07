import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap tp-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-foreground-secondary hover:bg-surface-hover active:bg-surface-active',
        filled: 'bg-surface-elevated text-foreground-secondary hover:bg-surface-hover active:bg-surface-active border border-border',
        ghost: 'bg-transparent text-foreground-secondary hover:bg-surface-hover active:bg-surface-active',
        danger: 'bg-transparent text-danger hover:bg-danger-subtle active:bg-danger-subtle',
        brand: 'bg-transparent text-brand hover:bg-brand-subtle active:bg-brand-subtle',
      },
      size: {
        sm: 'h-6 w-6 rounded-md',
        md: 'h-8 w-8 rounded-md',
        lg: 'h-9 w-9 rounded-lg',
        xl: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
