import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full border border-[var(--crimson-dim)] bg-[var(--void-surface)] px-3 py-1 text-sm text-[var(--ivory)] font-[var(--font-body)] shadow-sm transition-colors placeholder:text-[var(--ivory-dim)] focus-visible:outline-none focus-visible:border-[var(--crimson)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
