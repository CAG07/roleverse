import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[60px] w-full border border-[var(--crimson-dim)] bg-[var(--void-surface)] px-3 py-2 text-sm text-[var(--ivory)] font-[var(--font-body)] shadow-sm placeholder:text-[var(--ivory-dim)] focus-visible:outline-none focus-visible:border-[var(--crimson)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
