import * as React from 'react';
import { cn } from '../lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, header, footer, noPadding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface flex flex-col',
        className
      )}
      {...props}
    >
      {header && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {header}
        </div>
      )}
      <div className={cn('flex-1', !noPadding && 'p-4')}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-border px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  )
);
Panel.displayName = 'Panel';

export { Panel };
