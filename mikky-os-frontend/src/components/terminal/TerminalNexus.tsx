/**
 * TerminalNexus - Multi-tabbed terminal system
 * Replaces SystemConsole with xterm.js powered terminals
 * Features: SYSTEM tab (read-only logs), Interactive shell tabs
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/clerk-react';
import { api } from '../../../convex/_generated/api';
import { XtermView } from './XtermView';
import { cn } from '@/lib/utils';
import { Terminal, Plus, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TerminalTab {
    _id: string;
    sessionId: string;
    name: string;
    type: 'system' | 'scan' | 'interactive';
    status: 'active' | 'closed';
}

// Formatted log entry for SYSTEM tab (adapts scanLogs to terminal format)
interface SystemLogEntry {
    _id: string;
    content: string;
    timestamp: number;
}

const MAX_TABS = 5;

export function TerminalNexus() {
    const { user } = useUser();
    const userId = user?.id ?? '';

    const [activeTab, setActiveTab] = useState<string>('system-global');
    // Maximize state
    const [isMaximized, setIsMaximized] = useState(false);
    // Use fixed height for normal mode, full viewport for maximized
    const height = isMaximized ? 'calc(100vh - 40px)' : '300px';

    // Debounce state for command sending
    const lastCommandTimeRef = useRef<number>(0);
    const DEBOUNCE_MS = 300;

    // Convex queries and mutations
    const sessions = useQuery(api.terminal.getSessions, userId ? { userId } : 'skip');
    const initSystemSession = useMutation(api.terminal.initSystemSession);
    const createSession = useMutation(api.terminal.createSession);
    const sendCommand = useMutation(api.terminal.sendCommand);
    const closeSession = useMutation(api.terminal.closeSession);

    // Get logs for active session (interactive tabs)
    const terminalLogs = useQuery(
        api.terminal.getLogs,
        userId && activeTab !== 'system-global'
            ? { userId, sessionId: activeTab }
            : 'skip'
    );

    // Get system logs for SYSTEM tab (reuse existing scanLogs.tail)
    const rawSystemLogs = useQuery(api.scanLogs.tail, { limit: 100 });

    // Convert scan logs to terminal format for SYSTEM tab
    const systemLogs: SystemLogEntry[] = useMemo(() => {
        if (!rawSystemLogs) return [];

        const levelColors: Record<string, string> = {
            info: '\x1b[36m',      // cyan
            warning: '\x1b[33m',   // yellow
            error: '\x1b[31m',     // red
            critical: '\x1b[1;31m', // bold red
        };

        return rawSystemLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const color = levelColors[log.level] || '\x1b[37m';
            const levelTag = `[${log.level.toUpperCase()}]`;
            const content = `\x1b[90m${time}\x1b[0m ${color}${levelTag}\x1b[0m \x1b[90m[${log.source}]\x1b[0m ${log.message}\r\n`;

            return {
                _id: log._id,
                content,
                timestamp: new Date(log.timestamp).getTime(),
            };
        });
    }, [rawSystemLogs]);

    // Initialize SYSTEM session on mount
    useEffect(() => {
        if (userId) {
            initSystemSession({ userId }).catch(console.error);
        }
    }, [userId, initSystemSession]);

    // Compute tabs from sessions
    const tabs: TerminalTab[] = useMemo(() => {
        // Always include SYSTEM tab first
        const systemTab: TerminalTab = {
            _id: 'system-tab',
            sessionId: 'system-global',
            name: 'SYSTEM',
            type: 'system',
            status: 'active',
        };

        if (!sessions) return [systemTab];

        // Filter out the system session from DB (we handle it specially)
        const otherSessions = sessions
            .filter((s) => s.type !== 'system')
            .map((s) => ({
                _id: s._id,
                sessionId: s.sessionId,
                name: s.name,
                type: s.type as 'system' | 'scan' | 'interactive',
                status: s.status as 'active' | 'closed',
            }));

        return [systemTab, ...otherSessions];
    }, [sessions]);

    // Handle creating a new interactive tab
    const handleAddTab = useCallback(async () => {
        if (!userId) return;

        // Check tab limit
        if (tabs.length >= MAX_TABS) {
            console.error(`Maximum ${MAX_TABS} tabs allowed`);
            return;
        }

        try {
            // Generate next shell number
            const shellTabs = tabs.filter((t) => t.type === 'interactive');
            const nextNumber = shellTabs.length + 1;
            const name = `Shell-${nextNumber}`;

            await createSession({
                userId,
                name,
                type: 'interactive',
            });
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    }, [userId, tabs, createSession]);

    // Handle closing a tab
    const handleCloseTab = useCallback(
        async (sessionId: string, e: React.MouseEvent) => {
            e.stopPropagation();

            if (!userId) return;

            try {
                await closeSession({ userId, sessionId });

                // Switch to SYSTEM tab if closing active tab
                if (activeTab === sessionId) {
                    setActiveTab('system-global');
                }
            } catch (error) {
                console.error('Failed to close session:', error);
            }
        },
        [userId, activeTab, closeSession]
    );

    // Handle sending a command (with debounce)
    const handleCommand = useCallback(
        async (command: string) => {
            if (!userId) return;

            // Debounce check
            const now = Date.now();
            if (now - lastCommandTimeRef.current < DEBOUNCE_MS) {
                return;
            }
            lastCommandTimeRef.current = now;

            try {
                await sendCommand({
                    userId,
                    sessionId: activeTab,
                    command,
                });
            } catch (error) {
                console.error('Command failed:', error);
            }
        },
        [userId, activeTab, sendCommand]
    );

    // Get logs for active tab
    const activeTabLogs = useMemo(() => {
        if (activeTab === 'system-global') {
            return systemLogs;
        }
        return terminalLogs ?? [];
    }, [activeTab, systemLogs, terminalLogs]);

    // Find active tab config
    const activeTabConfig = tabs.find((t) => t.sessionId === activeTab);
    const isReadOnly = activeTabConfig?.type === 'system' || activeTabConfig?.type === 'scan';

    return (
        <div
            className={cn(
                "flex flex-col bg-black border border-zinc-800 overflow-hidden transition-all duration-300",
                isMaximized ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "h-72 rounded-lg"
            )}
            style={{ height }}
        >
            {/* Header with Tabs */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <Terminal className="h-4 w-4 text-emerald-500 shrink-0" />

                    {/* Tab List */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.sessionId}
                                onClick={() => setActiveTab(tab.sessionId)}
                                className={cn(
                                    'relative group flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all',
                                    'border border-transparent',
                                    activeTab === tab.sessionId
                                        ? 'bg-zinc-800 text-cyan-400 border-zinc-700'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                )}
                            >
                                <span>{tab.name}</span>

                                {/* Close button - only for closeable tabs */}
                                {tab.type === 'interactive' && (
                                    <span
                                        onClick={(e) => handleCloseTab(tab.sessionId, e)}
                                        className={cn(
                                            'ml-1 p-0.5 rounded hover:bg-zinc-700 transition-colors',
                                            'opacity-0 group-hover:opacity-100'
                                        )}
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                )}

                                {/* Locked indicator for SYSTEM */}
                                {tab.type === 'system' && (
                                    <span className="ml-1 text-[10px] text-zinc-600">🔒</span>
                                )}
                            </button>
                        ))}

                        {/* Add Tab Button */}
                        {tabs.length < MAX_TABS && (
                            <button
                                onClick={handleAddTab}
                                className={cn(
                                    'p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50 transition-colors',
                                    'border border-dashed border-zinc-700 hover:border-cyan-500/50'
                                )}
                                title="New Terminal (max 5)"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] text-zinc-600 font-mono hidden sm:block">
                        {tabs.length}/{MAX_TABS}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-500 hover:text-cyan-400"
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? 'Restore' : 'Maximize'}
                    >
                        {isMaximized ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Terminal Canvas Area */}
            <div className="flex-1 overflow-hidden bg-black">
                <XtermView
                    key={activeTab}
                    sessionId={activeTab}
                    isReadOnly={isReadOnly}
                    onCommand={handleCommand}
                    logs={activeTabLogs}
                />
            </div>

            {/* Footer Status Bar */}
            <div className="px-3 py-1 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[10px] font-mono text-zinc-600">
                <span>
                    {activeTabConfig?.type === 'system' && '📡 System Log Stream'}
                    {activeTabConfig?.type === 'interactive' && '⌨️ Interactive Shell'}
                    {activeTabConfig?.type === 'scan' && '🔍 Scan Output'}
                </span>
                <span className="text-zinc-700">
                    {isReadOnly ? 'READ-ONLY' : 'READY'}
                </span>
            </div>
        </div>
    );
}
