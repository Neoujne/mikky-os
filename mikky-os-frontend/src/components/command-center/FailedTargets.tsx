/**
 * FailedTargets — Conditionally rendered section showing failed scans
 * Only displayed when there are failed scans in the database.
 * Uses targets:engage for the Retry button to keep scan history linked.
 */

import { AlertTriangle, RotateCcw, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FailedScan {
    _id: string;
    targetDomain: string;
    failureReason?: string;
    failureStage?: string;
    aiSummary?: string;
    startedAt: string;
    completedAt?: string;
}

interface FailedTargetsProps {
    failedScans: FailedScan[];
    onRetry: (domain: string) => void;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getFailureReason(scan: FailedScan): string {
    if (scan.failureReason) return scan.failureReason;
    if (scan.failureStage) return `Failed at ${scan.failureStage}`;
    if (scan.aiSummary && scan.aiSummary.includes('Error')) {
        const errorLine = scan.aiSummary.split('\n').find(l => l.includes('Error'));
        if (errorLine) return errorLine.replace(/[#*]+/g, '').trim().substring(0, 80);
    }
    return 'Unknown failure';
}

export function FailedTargets({ failedScans, onRetry }: FailedTargetsProps) {
    // Don't render if no failed scans
    if (!failedScans || failedScans.length === 0) return null;

    return (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/10">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-zinc-100 font-semibold text-sm">FAILED SCANS</h3>
                        <p className="text-red-400/70 text-xs font-mono">{failedScans.length} FAILED</p>
                    </div>
                </div>
            </div>

            {/* Failed Scan List */}
            <div className="divide-y divide-red-500/10">
                {failedScans.map((scan) => (
                    <div
                        key={scan._id}
                        className="flex items-center justify-between px-6 py-3 hover:bg-red-950/20 transition-colors"
                    >
                        {/* Domain + Failure Reason */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                <span className="text-zinc-200 font-mono text-sm truncate">
                                    {scan.targetDomain}
                                </span>
                            </div>
                            <p className="text-zinc-500 text-xs mt-1 truncate pl-5">
                                {getFailureReason(scan)}
                            </p>
                        </div>

                        {/* Safety Score: N/A in red */}
                        <div className="flex items-center gap-4 shrink-0">
                            <span className="text-red-500 font-bold text-xs font-mono px-2 py-0.5 rounded bg-red-500/10">
                                N/A
                            </span>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 text-zinc-600 text-xs w-32 justify-end hidden md:flex">
                                <Clock className="h-3 w-3" />
                                <span className="font-mono">{formatDate(scan.completedAt || scan.startedAt)}</span>
                            </div>

                            {/* Retry Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs font-mono border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                onClick={() => onRetry(scan.targetDomain)}
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                RETRY
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
