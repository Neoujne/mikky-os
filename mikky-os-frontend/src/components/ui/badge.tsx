import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
                variant === 'default' && 'border-transparent bg-cyan-500 text-zinc-950 hover:bg-cyan-400',
                variant === 'secondary' && 'border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
                variant === 'destructive' && 'border-transparent bg-red-500 text-zinc-50 hover:bg-red-400',
                variant === 'outline' && 'border-zinc-700 text-zinc-300',
                className
            )}
            {...props}
        />
    );
}

export { Badge };
