import * as React from 'react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-foreground-muted/40">
          {icon}
        </div>
      )}
      <h3 className="text-subheading text-foreground-secondary">{title}</h3>
      {description && (
        <p className="text-body-sm text-foreground-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="relative h-8 w-8 mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-surface-active" />
        <div className="absolute inset-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
      <p className="text-body-sm text-foreground-muted">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

function ErrorState({ title = 'Something went wrong', message, retry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="mb-3 h-8 w-8 rounded-full bg-danger-subtle flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <h3 className="text-subheading text-foreground-secondary">{title}</h3>
      <p className="text-body-sm text-foreground-muted mt-1 max-w-sm">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 text-sm text-brand hover:text-brand-hover tp-transition"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function Skeleton({ className, variant = 'text', width, height, lines = 1, ...props }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'tp-skeleton h-3.5',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'tp-skeleton',
        variant === 'text' && 'h-3.5',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
      {...props}
    />
  );
}

export { EmptyState, LoadingState, ErrorState, Skeleton };
