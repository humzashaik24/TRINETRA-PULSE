import * as React from 'react';
import { cn } from '../lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-label text-foreground-secondary uppercase tracking-wider', className)}
      {...props}
    >
      {children}
      {required && <span className="text-danger ml-0.5" aria-label="required">*</span>}
    </label>
  )
);
Label.displayName = 'Label';

export { Label };
