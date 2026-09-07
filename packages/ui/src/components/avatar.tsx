import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden font-medium select-none',
  {
    variants: {
      size: {
        xs: 'h-5 w-5 rounded text-[9px]',
        sm: 'h-7 w-7 rounded-md text-[10px]',
        md: 'h-8 w-8 rounded-md text-xs',
        lg: 'h-10 w-10 rounded-lg text-sm',
        xl: 'h-12 w-12 rounded-lg text-base',
      },
      color: {
        brand: 'bg-brand-subtle text-brand',
        entity: 'bg-entity-subtle text-entity',
        network: 'bg-network-subtle text-network',
        evidence: 'bg-evidence-subtle text-evidence',
        ai: 'bg-ai-subtle text-ai',
        anomaly: 'bg-anomaly-subtle text-anomaly',
        muted: 'bg-surface-elevated text-foreground-muted',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'muted',
    },
  }
);

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  initials?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

function Avatar({ className, size, color, src, alt, initials, status, children, ...props }: AvatarProps) {
  const initialsText = initials || (alt ? alt.charAt(0).toUpperCase() : '?');

  return (
    <div className={cn('relative inline-flex', className)} {...props}>
      <div className={cn(avatarVariants({ size, color }))}>
        {src ? (
          <img src={src} alt={alt || ''} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{initialsText}</span>
        )}
        {children}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            status === 'online' && 'bg-success',
            status === 'offline' && 'bg-foreground-muted',
            status === 'away' && 'bg-warning',
            status === 'busy' && 'bg-danger'
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export { Avatar, avatarVariants };
