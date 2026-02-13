import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = {
  default: 'bg-brown text-cream',
  secondary: 'bg-cream-dark text-brown',
  destructive: 'bg-rust text-cream',
  outline: 'border border-gold text-brown bg-transparent',
  teal: 'bg-teal text-cream',
  gold: 'bg-gold text-brown',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
