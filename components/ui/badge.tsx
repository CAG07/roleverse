import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = {
  default: 'bg-[var(--crimson-dim)] text-[var(--ivory)] border border-[var(--crimson)]',
  secondary: 'bg-[var(--void-raised)] text-[var(--ivory-muted)] border border-[var(--void-border)]',
  destructive: 'bg-[var(--crimson-bright)] text-[var(--ivory)] border border-[var(--crimson-bright)]',
  outline: 'border border-[var(--crimson-dim)] text-[var(--ivory)] bg-transparent',
  teal: 'bg-[rgba(42,122,74,0.15)] text-[#4a9a5a] border border-[#2a4a32]',
  gold: 'bg-[var(--gold-glow)] text-[var(--gold)] border border-[var(--gold-dim)]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium transition-colors font-[var(--font-heading)] tracking-wide uppercase',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
