/**
 * WorkerStatus - Real-time Docker worker health indicator
 * Displays the current status of the worker node with visual feedback
 */

import { useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkerStatusProps {
    isCollapsed?: boolean;
}

export function WorkerStatus({ isCollapsed = false }: WorkerStatusProps) {
    const status = useQuery(api.system.getWorkerStatus);
    const verifyStatus = useAction(api.system.verifyWorkerStatus);

    // Initial health check on mount
    useEffect(() => {
        // Trigger an immediate check to ensure status is fresh
        verifyStatus().catch((err) => {
            console.error("Failed to verify worker status:", err);
        });
    }, [verifyStatus]);

    // Determine visual state
    const isOperational = status?.status === 'operational';
    const isDegraded = status?.status === 'degraded';

    // Status text and color
    const statusText = isOperational
        ? 'OPERATIONAL'
        : isDegraded
            ? 'DEGRADED'
            : 'OFFLINE';

    const statusColor = isOperational
        ? 'text-emerald-500'
        : isDegraded
            ? 'text-yellow-500'
            : 'text-red-500';

    const dotColor = isOperational
        ? 'bg-emerald-500'
        : isDegraded
            ? 'bg-yellow-500'
            : 'bg-red-500';

    const iconColor = isOperational
        ? 'text-emerald-500'
        : isDegraded
            ? 'text-yellow-500'
            : 'text-zinc-600';

    // Last checked time (relative)
    const lastChecked = status?.lastChecked
        ? formatRelativeTime(status.lastChecked)
        : 'Never';

    // Status icon component
    const StatusIcon = isOperational
        ? CheckCircle
        : isDegraded
            ? AlertTriangle
            : XCircle;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "p-3 border-b border-zinc-800 flex items-center cursor-pointer hover:bg-zinc-800/30 transition-colors",
                        isCollapsed ? "justify-center" : "gap-3"
                    )}>
                        <div className="relative">
                            <Activity
                                className={cn('h-5 w-5', iconColor)}
                            />
                            {(isOperational || isDegraded) && (
                                <span className={cn(
                                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse",
                                    dotColor
                                )} />
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col">
                                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                                    Worker Node
                                </span>
                                <span className={cn('text-sm font-bold', statusColor)}>
                                    {statusText}
                                </span>
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 p-3">
                    <div className="space-y-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                            <StatusIcon className={cn('h-4 w-4', statusColor)} />
                            <span className={cn('font-bold', statusColor)}>{statusText}</span>
                        </div>

                        <div className="border-t border-zinc-800 pt-2 space-y-1">
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Docker:</span>
                                <span className={status?.metrics?.dockerAvailable ? 'text-emerald-400' : 'text-red-400'}>
                                    {status?.metrics?.dockerAvailable ? 'Connected' : 'Unavailable'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Worker Image:</span>
                                <span className={status?.metrics?.imageExists ? 'text-emerald-400' : 'text-red-400'}>
                                    {status?.metrics?.imageExists ? 'Ready' : 'Missing'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-500">Containers:</span>
                                <span className="text-cyan-400">
                                    {status?.metrics?.activeContainers ?? 0}
                                </span>
                            </div>
                            {status?.metrics?.version && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-zinc-500">Version:</span>
                                    <span className="text-zinc-400">{status.metrics.version}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-zinc-800 pt-2 text-zinc-600">
                            Last checked: {lastChecked}
                        </div>

                        {status?.message && (
                            <div className="border-t border-zinc-800 pt-2 text-red-400">
                                Error: {status.message}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Format timestamp as relative time (e.g., "2 min ago")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return new Date(timestamp).toLocaleString();
    }
}
