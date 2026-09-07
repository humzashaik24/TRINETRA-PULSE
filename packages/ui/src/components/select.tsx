import * as React from 'react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, size = 'md', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex w-full appearance-none rounded-md border bg-transparent px-3 py-1.5 pr-8 text-sm text-foreground',
          'tp-transition',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-danger focus:ring-danger'
            : 'border-border hover:border-border-strong',
          size === 'sm' && 'h-7 text-xs',
          size === 'lg' && 'h-9',
          className
        )}
        aria-invalid={error || undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
