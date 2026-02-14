import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Terminal, Menu, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { MainNav } from './MainNav';
import { UserMenu } from './UserMenu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TerminalNexus } from '@/components/terminal/TerminalNexus';
import { WorkerStatus } from '@/components/layout/WorkerStatus';

interface AppShellProps {
    children: React.ReactNode;
    onLogout?: () => void;
    onEngage?: () => void;
}

export function AppShell({
    children,
    onLogout,
    onEngage,
}: AppShellProps) {
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        return stored === 'true';
    });

    // Worker status is now handled by the WorkerStatus component
    // which queries real-time data from Convex

    // Persist collapse state
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    // Toggle console with shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                setIsConsoleOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
                <div className="inline-flex items-center gap-2.5 font-heading font-bold text-xl tracking-tighter text-cyan-400">
                    <img
                        src="/mikky-os-logo.png"
                        alt="Mikky OS"
                        className="h-7 w-7 rounded-sm object-contain"
                    />
                    <span>MIKKY OS</span>
                </div>
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-cyan-400">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[80%] bg-zinc-950 border-r-zinc-800 p-0 text-zinc-100">
                        <div className="h-full flex flex-col">
                            <div className="p-6">
                                <div className="inline-flex items-center gap-2.5 font-heading font-bold text-2xl tracking-tighter text-cyan-400 mb-8">
                                    <img
                                        src="/mikky-os-logo.png"
                                        alt="Mikky OS"
                                        className="h-8 w-8 rounded-sm object-contain"
                                    />
                                    <span>MIKKY OS</span>
                                </div>
                                <Button
                                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold mb-6 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all"
                                    onClick={() => {
                                        onEngage?.();
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    ENGAGE SYSTEM
                                </Button>
                                <MainNav onNavigate={() => setIsMobileMenuOpen(false)} />
                            </div>
                            <div className="mt-auto p-6 border-t border-zinc-800">
                                <UserMenu onLogout={onLogout} />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex h-screen overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className={cn(
                    "hidden lg:flex flex-col border-r border-zinc-800/50 bg-zinc-950/90 backdrop-blur-sm fixed inset-y-0 left-0 z-40 transition-all duration-300",
                    isCollapsed ? "w-16" : "w-64"
                )}>
                    <div className={cn(
                        "flex-1 flex flex-col overflow-hidden",
                        isCollapsed ? "p-2" : "p-6"
                    )}>
                        <div className={cn(
                            "font-heading font-bold tracking-tighter text-cyan-400 mb-8 overflow-hidden",
                            isCollapsed ? "text-lg flex justify-center mt-1" : "text-2xl"
                        )}>
                            {isCollapsed ? (
                                <img
                                    src="/mikky-os-logo.png"
                                    alt="Mikky OS"
                                    className="h-9 w-9 rounded-sm object-contain"
                                />
                            ) : (
                                <div className="inline-flex items-center gap-2.5 whitespace-nowrap">
                                    <img
                                        src="/mikky-os-logo.png"
                                        alt="Mikky OS"
                                        className="h-9 w-9 rounded-sm object-contain"
                                    />
                                    <span>MIKKY OS</span>
                                </div>
                            )}
                        </div>
                        <MainNav isCollapsed={isCollapsed} />
                    </div>
                    <div className="mt-auto border-t border-zinc-800/50 bg-zinc-950/50">
                        {/* Worker Status Widget - Real-time Docker health */}
                        <WorkerStatus isCollapsed={isCollapsed} />

                        <div className={cn("p-3", isCollapsed && "flex justify-center")}>
                            <UserMenu onLogout={onLogout} isCollapsed={isCollapsed} />
                        </div>
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full p-3 flex items-center justify-center gap-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900 transition-colors border-t border-zinc-800"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? (
                            <ChevronsRight className="h-4 w-4" />
                        ) : (
                            <>
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="text-xs font-mono uppercase">Collapse</span>
                            </>
                        )}
                    </button>

                </aside>

                {/* Main Content Area */}
                <main
                    className={cn(
                        'flex-1 overflow-auto transition-all duration-300 flex flex-col',
                        isCollapsed ? 'lg:pl-16' : 'lg:pl-64', // Offset for fixed sidebar
                        isConsoleOpen ? 'pb-[300px]' : 'pb-12' // Offset for bottom console
                    )}
                >
                    <div className="container mx-auto p-6 md:p-8 lg:p-10 max-w-7xl animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>

                {/* Quake Console Drawer */}
                <div
                    className={cn(
                        'fixed bottom-0 right-0 z-30 bg-zinc-950 border-t border-zinc-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col font-mono',
                        isCollapsed ? 'lg:left-16' : 'lg:left-64', // Match sidebar offset on desktop
                        'left-0',
                        isConsoleOpen ? 'h-[300px]' : 'h-10'
                    )}
                >
                    {/* Console Header/Handle */}
                    <div
                        className="h-10 flex items-center justify-between px-4 bg-zinc-900/50 hover:bg-zinc-900 cursor-pointer border-b border-zinc-800 select-none"
                        onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    >
                        <div className="flex items-center gap-2 text-zinc-400 text-xs tracking-wider uppercase">
                            <Terminal className="h-4 w-4 text-emerald-500" />
                            <span>System Console</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 hidden sm:inline-block">CTRL+J to toggle</span>
                            {isConsoleOpen ? (
                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                            ) : (
                                <ChevronUp className="h-4 w-4 text-zinc-500" />
                            )}
                        </div>
                    </div>

                    {/* Console Output - Use Real SystemConsole */}
                    {isConsoleOpen && (
                        <div className="flex-1 overflow-hidden">
                            <TerminalNexus />
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
