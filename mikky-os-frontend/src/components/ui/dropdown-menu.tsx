import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextValue {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
    const context = React.useContext(DropdownMenuContext);
    if (!context) {
        throw new Error('DropdownMenu components must be used within a DropdownMenu');
    }
    return context;
}

interface DropdownMenuProps {
    children: React.ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <DropdownMenuContext.Provider value={{ open, onOpenChange: setOpen }}>
            <div className="relative inline-block">{children}</div>
        </DropdownMenuContext.Provider>
    );
}

interface DropdownMenuTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}

function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
    const { open, onOpenChange } = useDropdownMenu();

    const handleClick = () => onOpenChange(!open);

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
            onClick: handleClick,
        });
    }

    return <button onClick={handleClick}>{children}</button>;
}

interface DropdownMenuContentProps {
    children: React.ReactNode;
    align?: 'start' | 'center' | 'end';
    className?: string;
}

function DropdownMenuContent({ children, align = 'end', className }: DropdownMenuContentProps) {
    const { open, onOpenChange } = useDropdownMenu();
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onOpenChange(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onOpenChange]);

    if (!open) return null;

    const alignClasses = {
        start: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        end: 'right-0',
    };

    return (
        <div
            ref={ref}
            className={cn(
                'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-md',
                'animate-in fade-in-0 zoom-in-95',
                alignClasses[align],
                className
            )}
        >
            {children}
        </div>
    );
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

function DropdownMenuItem({ children, className, onClick, ...props }: DropdownMenuItemProps) {
    const { onOpenChange } = useDropdownMenu();

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        onOpenChange(false);
    };

    return (
        <div
            className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100',
                className
            )}
            onClick={handleClick}
            {...props}
        >
            {children}
        </div>
    );
}

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

function DropdownMenuLabel({ children, className, ...props }: DropdownMenuLabelProps) {
    return (
        <div
            className={cn('px-2 py-1.5 text-sm font-semibold text-zinc-300', className)}
            {...props}
        >
            {children}
        </div>
    );
}

interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> { }

function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
    return <div className={cn('-mx-1 my-1 h-px bg-zinc-800', className)} {...props} />;
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
};
