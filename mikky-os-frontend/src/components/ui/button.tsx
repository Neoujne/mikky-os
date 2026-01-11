import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'ghost' | 'outline' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
        const Comp = asChild ? 'span' : 'button';

        return (
            <Comp
                className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                    'disabled:pointer-events-none disabled:opacity-50',
                    // Variants
                    variant === 'default' && 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400',
                    variant === 'ghost' && 'hover:bg-zinc-800 hover:text-zinc-100',
                    variant === 'outline' && 'border border-zinc-700 bg-transparent hover:bg-zinc-800',
                    variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-500',
                    // Sizes
                    size === 'default' && 'h-10 px-4 py-2',
                    size === 'sm' && 'h-9 rounded-md px-3',
                    size === 'lg' && 'h-11 rounded-md px-8',
                    size === 'icon' && 'h-10 w-10',
                    className
                )}
                ref={ref as React.Ref<HTMLButtonElement>}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
