import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap font-medium tp-transition',
  {
    variants: {
      variant: {
        default: 'bg-brand-subtle text-brand',
        secondary: 'bg-surface-elevated text-foreground-secondary border border-border',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        info: 'bg-info-subtle text-info',
        entity: 'bg-entity-subtle text-entity',
        network: 'bg-network-subtle text-network',
        evidence: 'bg-evidence-subtle text-evidence',
        ai: 'bg-ai-subtle text-ai',
        anomaly: 'bg-anomaly-subtle text-anomaly',
        outline: 'bg-transparent text-foreground-secondary border border-border',
      },
      size: {
        sm: 'h-5 px-1.5 rounded text-[10px]',
        md: 'h-5.5 px-2 rounded-md text-xs',
        lg: 'h-6 px-2.5 rounded-md text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'rounded-full mr-1',
            size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'danger' && 'bg-danger',
            variant === 'info' && 'bg-info',
            variant === 'entity' && 'bg-entity',
            variant === 'network' && 'bg-network',
            variant === 'evidence' && 'bg-evidence',
            variant === 'ai' && 'bg-ai',
            variant === 'anomaly' && 'bg-anomaly',
            variant === 'default' && 'bg-brand',
            (!variant || variant === 'secondary' || variant === 'outline') && 'bg-foreground-muted'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
