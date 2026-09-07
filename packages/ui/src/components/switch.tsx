import * as React from 'react';
import { cn } from '../lib/utils';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, label, description, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          'flex items-center gap-2.5 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <button
          ref={ref}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            'peer relative inline-flex h-5 w-9 shrink-0 rounded-full tp-transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            checked ? 'bg-brand' : 'bg-surface-active border border-border',
            className
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 tp-transition-slow',
              checked ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-sm text-foreground leading-none">{label}</span>
            )}
            {description && (
              <span className="text-xs text-foreground-muted leading-snug">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
