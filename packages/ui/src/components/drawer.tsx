'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { IconButton } from './icon-button';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

function Drawer({ open, onOpenChange, side = 'right', children }: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50 flex flex-col bg-surface border-border',
          'w-full max-w-md',
          side === 'right' ? 'right-0 border-l animate-slide-left' : 'left-0 border-r animate-slide-right'
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, children, onClose, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between border-b border-border px-4 py-3', className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <IconButton variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </IconButton>
      )}
    </div>
  )
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-y-auto p-4 scrollbar-thin', className)} {...props} />
  )
);
DrawerContent.displayName = 'DrawerContent';

const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-t border-border px-4 py-3', className)} {...props} />
  )
);
DrawerFooter.displayName = 'DrawerFooter';

export { Drawer, DrawerHeader, DrawerContent, DrawerFooter };
