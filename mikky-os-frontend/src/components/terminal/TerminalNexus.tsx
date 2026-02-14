/**
 * TerminalNexus - Dynamic Multi-Tab Terminal
 *
 * Pinned SYSTEM tab shows all logs.
 * Dynamic scan tabs appear for each scan from the last 30 minutes.
 * Auto-switches to newest scan when one starts.
 * Old scans auto-disappear as they age out of the 30-min window.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { XtermView } from './XtermView';
import { cn } from '@/lib/utils';
import { Terminal, CircleDot } from 'lucide-react';

// Formatted log entry for XtermView
interface FormattedLog {
    _id: string;
    content: string;
    timestamp: number;
}

const LEVEL_COLORS: Record<string, string> = {
    info: '\x1b[36m',       // cyan
    warning: '\x1b[33m',    // yellow
    error: '\x1b[31m',      // red
    critical: '\x1b[1;31m', // bold red
};

// Status indicator dot colors
const STATUS_COLORS: Record<string, string> = {
    scanning: 'text-cyan-400 animate-pulse',
    queued: 'text-zinc-500 animate-pulse',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
    cancelled: 'text-orange-400',
    stopped: 'text-orange-400',
};

export function TerminalNexus() {
    // ── Data Queries ────────────────────────────────────────────────────
    const recentScans = useQuery(api.scans.listRecent) ?? [];
    const rawLogs = useQuery(api.scanLogs.tail, { limit: 200 });

    // ── Tab State ───────────────────────────────────────────────────────
    // 'system' = pinned SYSTEM tab, otherwise a scanRun _id
    const [activeTabId, setActiveTabId] = useState<string>('system');

    // ── Auto-Switch: Jump to newest scan when one appears ───────────────
    const prevScanIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const currentIds = new Set(recentScans.map(s => s._id));

        // Find new scan IDs that weren't in the previous set
        for (const scan of recentScans) {
            if (!prevScanIds.current.has(scan._id) && scan.status === 'scanning') {
                setActiveTabId(scan._id);
                break;
            }
        }

        prevScanIds.current = currentIds;
    }, [recentScans]);

    // If active tab's scan aged out, fall back to SYSTEM
    useEffect(() => {
        if (activeTabId === 'system') return;
        const stillExists = recentScans.some(s => s._id === activeTabId);
        if (!stillExists) {
            setActiveTabId('system');
        }
    }, [recentScans, activeTabId]);

    // ── Log Formatting ──────────────────────────────────────────────────
    const formatLogs = (logs: typeof rawLogs, scanRunId?: string): FormattedLog[] => {
        if (!logs) return [];

        const filtered = scanRunId
            ? logs.filter(l => l.scanRunId === scanRunId)
            : logs;

        return filtered.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const color = LEVEL_COLORS[log.level] || '\x1b[37m';
            const levelTag = `[${log.level.toUpperCase()}]`;
            const content = `\x1b[90m${time}\x1b[0m ${color}${levelTag}\x1b[0m \x1b[90m[${log.source}]\x1b[0m ${log.message}\r\n`;

            return {
                _id: log._id,
                content,
                timestamp: new Date(log.timestamp).getTime(),
            };
        });
    };

    const activeLogs = useMemo(() => {
        if (activeTabId === 'system') return formatLogs(rawLogs);
        return formatLogs(rawLogs, activeTabId);
    }, [rawLogs, activeTabId]);

    // ── Footer Info ─────────────────────────────────────────────────────
    const activeScan = recentScans.find(s => s._id === activeTabId);
    const footerText = activeTabId === 'system'
        ? `All logs \u00B7 ${recentScans.length} recent scan${recentScans.length !== 1 ? 's' : ''}`
        : `${activeScan?.targetDomain ?? 'Unknown'} \u00B7 ${activeScan?.status ?? ''}`;

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-black overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
                <Terminal className="h-4 w-4 text-emerald-500 shrink-0 mr-2" />

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {/* Pinned SYSTEM tab */}
                    <button
                        onClick={() => setActiveTabId('system')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all whitespace-nowrap',
                            activeTabId === 'system'
                                ? 'bg-zinc-800 text-cyan-400'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        )}
                    >
                        <span>SYSTEM</span>
                        <span className="text-[10px] text-zinc-600">ALL</span>
                    </button>

                    {/* Dynamic scan tabs */}
                    {recentScans.map(scan => (
                        <button
                            key={scan._id}
                            onClick={() => setActiveTabId(scan._id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all whitespace-nowrap',
                                activeTabId === scan._id
                                    ? 'bg-zinc-800 text-cyan-400'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                            )}
                        >
                            <CircleDot className={cn(
                                'h-3 w-3 shrink-0',
                                STATUS_COLORS[scan.status] || 'text-zinc-600'
                            )} />
                            <span className="max-w-[120px] truncate">
                                {scan.targetDomain}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Terminal Canvas */}
            <div className="flex-1 overflow-hidden bg-black px-4 py-1">
                <XtermView
                    key={activeTabId}
                    sessionId={activeTabId}
                    isReadOnly={true}
                    logs={activeLogs}
                />
            </div>

            {/* Footer Status Bar */}
            <div className="px-3 py-1 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[10px] font-mono text-zinc-600 shrink-0">
                <span>{footerText}</span>
                <span className="text-zinc-700">READ-ONLY</span>
            </div>
        </div>
    );
}
