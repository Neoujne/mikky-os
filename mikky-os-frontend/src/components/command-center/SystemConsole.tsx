/**
 * SystemConsole - Real-time log viewer with tabs and resize (Power Console)
 * Displays live scan logs from Convex with auto-scrolling
 * Features: Tabbed interface, draggable resize, maximize
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsoleLog {
    _id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    message: string;
}

interface ConsoleTab {
    id: string;
    label: string;
    domain?: string;
    closeable: boolean;
}

const levelColors: Record<string, string> = {
    info: 'text-cyan-400',
    warning: 'text-amber-400',
    error: 'text-rose-400',
    critical: 'text-rose-500 font-bold',
};

const levelPrefixes: Record<string, string> = {
    info: '[INFO]',
    warning: '[WARN]',
    error: '[ERROR]',
    critical: '[CRITICAL]',
};

// Memoized log entry component to prevent unnecessary re-renders
const LogEntry = React.memo(function LogEntry({ log }: { log: ConsoleLog }) {
    return (
        <div
            className={cn(
                'py-0.5 hover:bg-zinc-900/50 transition-colors',
                levelColors[log.level]
            )}
        >
            <span className="text-zinc-600">
                {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            {' '}
            <span className={cn('font-bold', levelColors[log.level])}>
                {levelPrefixes[log.level]}
            </span>
            {' '}
            <span className="text-zinc-500">[{log.source}]</span>
            {' '}
            <span className="text-zinc-300 whitespace-pre-wrap break-all">
                {log.message}
            </span>
        </div>
    );
});

// Memoized log list component
const LogList = React.memo(function LogList({ logs }: { logs: ConsoleLog[] }) {
    return (
        <>
            {logs.map((log) => (
                <LogEntry key={log._id} log={log} />
            ))}
        </>
    );
});

export function SystemConsole() {
    const consoleEndRef = useRef<HTMLDivElement>(null);
    const lastLogCountRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [consoleHeight, setConsoleHeight] = useState(300);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [tabs, setTabs] = useState<ConsoleTab[]>([
        { id: 'system', label: 'System', closeable: false }
    ]);
    const [activeTab, setActiveTab] = useState('system');

    // Clear logs on mount (component refresh)
    useEffect(() => {
        setDebouncedLogs([]);
        lastLogCountRef.current = 0;
    }, []); // Empty deps = run once on mount

    // Subscribe to real-time logs from Convex
    const rawLogs = useQuery(api.scanLogs.tail, { limit: 50 }) as ConsoleLog[] | undefined;

    // Debounced state to prevent rapid re-renders
    const [debouncedLogs, setDebouncedLogs] = useState<ConsoleLog[]>([]);
    const debounceTimerRef = useRef<number | null>(null);

    // Debounce log updates (100ms)
    useEffect(() => {
        if (!rawLogs) return;

        // Clear any pending timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Schedule update
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedLogs(rawLogs);
        }, 100);

        // Cleanup
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [rawLogs]);

    // Auto-scroll only when new logs arrive
    useEffect(() => {
        if (debouncedLogs.length > lastLogCountRef.current) {
            if (consoleEndRef.current) {
                consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
        lastLogCountRef.current = debouncedLogs.length;
    }, [debouncedLogs.length]);

    // Resize functionality
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newHeight = rect.bottom - e.clientY;
            setConsoleHeight(Math.max(150, Math.min(newHeight, window.innerHeight - 100)));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Double-click to maximize
    const handleDoubleClick = () => {
        setIsMaximized(!isMaximized);
    };

    // Close tab
    const handleCloseTab = (tabId: string) => {
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        if (activeTab === tabId) {
            setActiveTab(newTabs[0]?.id || 'system');
        }
    };

    // TODO: Auto-create tabs when scans start (will be wired to activeScans)
    // For now, this is just the structure

    // Memoize log count display
    const logCount = useMemo(() => debouncedLogs.length, [debouncedLogs.length]);

    const height = isMaximized ? `calc(100vh - 40px)` : `${consoleHeight}px`;

    return (
        <div
            ref={containerRef}
            className="h-full flex flex-col bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden"
            style={{ height }}
        >
            {/* Draggable Resize Handle */}
            <div
                className={cn(
                    "h-2 cursor-row-resize transition-colors relative group z-50",
                    "pointer-events-auto select-none",
                    isDragging ? "bg-cyan-500" : "bg-transparent hover:bg-cyan-500/30"
                )}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-0.5 w-16 bg-cyan-500/50 rounded-full" />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Tabs and Controls */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <Terminal className="h-4 w-4 text-emerald-500 shrink-0" />
                        <TabsList className="bg-transparent p-0 h-auto justify-start border-b-0 w-full overflow-x-auto no-scrollbar">
                            {tabs.map(tab => (
                                <div key={tab.id} className="relative group mr-2">
                                    <TabsTrigger
                                        value={tab.id}
                                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-500 text-xs px-3 py-1 rounded border border-transparent data-[state=active]:border-zinc-700"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                    {tab.closeable && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCloseTab(tab.id);
                                            }}
                                            className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 bg-zinc-800 rounded-full p-0.5 transition-opacity z-10"
                                        >
                                            <X className="h-2 w-2 text-zinc-400 hover:text-white" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </TabsList>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-zinc-600 text-xs font-mono hidden sm:inline-block">
                            {logCount} entries
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-zinc-500 hover:text-rose-400 px-2"
                            onClick={() => setDebouncedLogs([])}
                        >
                            CLEAR
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-cyan-400"
                            onClick={() => setIsMaximized(!isMaximized)}
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            {isMaximized ? (
                                <Minimize2 className="h-3.5 w-3.5" />
                            ) : (
                                <Maximize2 className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Console Output with Tabs */}
                {tabs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed mt-0 data-[state=inactive]:hidden">
                        {logCount === 0 ? (
                            <div className="text-zinc-600 animate-pulse flex items-center gap-2">
                                <span className="text-cyan-500">➜</span>
                                Waiting for system activity...
                            </div>
                        ) : (
                            <>
                                <LogList logs={debouncedLogs} />
                                <div ref={consoleEndRef} />
                            </>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* Footer / Prompt */}
            <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30 shrink-0">
                <div className="flex items-center gap-2 text-zinc-600 text-xs font-mono">
                    <span className="text-cyan-500">❯</span>
                    <span className="animate-pulse">|</span>
                </div>
            </div>
        </div>
    );
}
