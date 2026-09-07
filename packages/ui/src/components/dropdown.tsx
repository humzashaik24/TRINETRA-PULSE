'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface DropdownItem {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect?: (item: DropdownItem) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

function Dropdown({ trigger, items, onSelect, align = 'end', className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)} role="button" tabIndex={0}>
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-surface py-1 shadow-overlay',
            'animate-slide-down',
            align === 'end' && 'right-0',
            align === 'start' && 'left-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className
          )}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={i} className="my-1 h-px bg-border" role="separator" />;
            }
            return (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  onSelect?.(item);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left tp-transition',
                  'focus:outline-none',
                  item.danger
                    ? 'text-danger hover:bg-danger-subtle'
                    : 'text-foreground hover:bg-surface-hover',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="shrink-0 text-foreground-muted">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { Dropdown };
export type { DropdownItem };
