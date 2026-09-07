import * as React from 'react';
import { cn } from '../lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-start gap-2.5 cursor-pointer select-none',
          props.disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className="relative mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="peer sr-only"
            aria-invalid={error || undefined}
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border tp-transition',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
              'peer-checked:bg-brand peer-checked:border-brand peer-checked:text-white',
              error ? 'border-danger' : 'border-border-strong',
              'flex items-center justify-center'
            )}
            aria-hidden="true"
          >
            <svg
              className="h-3 w-3 opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6l3 3 5-5" className="peer-checked:opacity-100" />
            </svg>
          </div>
        </div>
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
Checkbox.displayName = 'Checkbox';

export { Checkbox };
