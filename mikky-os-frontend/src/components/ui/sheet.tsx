import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetContextValue {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
    const context = React.useContext(SheetContext);
    if (!context) {
        throw new Error('Sheet components must be used within a Sheet');
    }
    return context;
}

interface SheetProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

function Sheet({ children, open = false, onOpenChange }: SheetProps) {
    const [internalOpen, setInternalOpen] = React.useState(open);

    const isControlled = onOpenChange !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;

    return (
        <SheetContext.Provider value={{ open: isOpen, onOpenChange: setOpen }}>
            {children}
        </SheetContext.Provider>
    );
}

interface SheetTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}

function SheetTrigger({ children, asChild }: SheetTriggerProps) {
    const { onOpenChange } = useSheet();

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
            onClick: () => onOpenChange(true),
        });
    }

    return (
        <button onClick={() => onOpenChange(true)}>
            {children}
        </button>
    );
}

interface SheetContentProps {
    children: React.ReactNode;
    side?: 'left' | 'right' | 'top' | 'bottom';
    className?: string;
}

function SheetContent({ children, side = 'right', className }: SheetContentProps) {
    const { open, onOpenChange } = useSheet();

    if (!open) return null;

    const sideClasses = {
        left: 'inset-y-0 left-0 h-full',
        right: 'inset-y-0 right-0 h-full',
        top: 'inset-x-0 top-0 w-full',
        bottom: 'inset-x-0 bottom-0 w-full',
    };

    const slideClasses = {
        left: 'animate-in slide-in-from-left',
        right: 'animate-in slide-in-from-right',
        top: 'animate-in slide-in-from-top',
        bottom: 'animate-in slide-in-from-bottom',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/80"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div
                className={cn(
                    'fixed z-50 gap-4 bg-zinc-950 p-6 shadow-lg transition ease-in-out',
                    sideClasses[side],
                    slideClasses[side],
                    className
                )}
            >
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-zinc-950 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4 text-zinc-400" />
                    <span className="sr-only">Close</span>
                </button>
                {children}
            </div>
        </>
    );
}

export { Sheet, SheetTrigger, SheetContent };
