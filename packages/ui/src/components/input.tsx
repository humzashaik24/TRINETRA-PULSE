import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-8 w-full rounded-md border bg-transparent px-3 py-1.5 text-sm text-foreground',
            'placeholder:text-foreground-muted',
            'tp-transition',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            icon && 'pl-9',
            error
              ? 'border-danger focus:ring-danger'
              : 'border-border hover:border-border-strong',
            className
          )}
          ref={ref}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
