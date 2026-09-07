import * as React from 'react';
import { cn } from '../lib/utils';
import { Input } from './input';
import { IconButton } from './icon-button';

export interface SearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onClear?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ className, onClear, size = 'md', value, ...props }, ref) => {
    const hasValue = value !== undefined && value !== '';

    const SearchIcon = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );

    const ClearIcon = () => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );

    return (
      <div className={cn('relative', className)}>
        <Input
          ref={ref}
          type="search"
          icon={<SearchIcon />}
          value={value}
          className={cn(
            size === 'sm' && 'h-7 text-xs',
            size === 'lg' && 'h-9',
          )}
          aria-label={props.placeholder || 'Search'}
          {...props}
        />
        {hasValue && onClear && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClear}
              aria-label="Clear search"
              type="button"
            >
              <ClearIcon />
            </IconButton>
          </div>
        )}
      </div>
    );
  }
);
Search.displayName = 'Search';

export { Search };
