/**
 * ManagedTargets — Shows the 10 most recent successfully-scanned targets
 * Displayed on the Dashboard below Live Operations.
 */

import { Link } from 'react-router-dom';
import { Shield, ExternalLink, ChevronRight, Bug } from 'lucide-react';
import { renderSafetyScore, getSafetyBadgeColor } from '@/lib/safetyScore';

interface ManagedTarget {
    _id: string;
    domain: string;
    safetyScore?: number | null;
    totalVulns: number;
    lastScanDate?: string;
    lastScanStatus?: string;
}

interface ManagedTargetsProps {
    targets: ManagedTarget[];
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ManagedTargets({ targets }: ManagedTargetsProps) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-zinc-100 font-semibold text-sm">MANAGED TARGETS</h3>
                        <p className="text-zinc-500 text-xs font-mono">{targets.length} SUCCEEDED</p>
                    </div>
                </div>
            </div>

            {/* Target List */}
            {targets.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <Shield className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No successful scans yet.</p>
                    <p className="text-zinc-600 text-xs mt-1">Engage a target to start scanning.</p>
                </div>
            ) : (
                <div className="divide-y divide-zinc-800/50">
                    {targets.map((target) => {
                        const score = renderSafetyScore(
                            target.lastScanStatus || 'completed',
                            target.safetyScore
                        );

                        return (
                            <div
                                key={target._id}
                                className="flex items-center justify-between px-6 py-3 hover:bg-zinc-800/30 transition-colors group"
                            >
                                {/* Domain */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                    <span className="text-zinc-200 font-mono text-sm truncate">
                                        {target.domain}
                                    </span>
                                    <ExternalLink className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>

                                {/* Safety Score */}
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${getSafetyBadgeColor(target.safetyScore)}`}>
                                        {score.text}
                                    </span>

                                    {/* Vuln Count */}
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 w-16 justify-end">
                                        <Bug className="h-3 w-3" />
                                        <span className="font-mono">{target.totalVulns}</span>
                                    </div>

                                    {/* Last Scan Date */}
                                    <span className="text-zinc-600 text-xs font-mono w-32 text-right hidden md:block">
                                        {formatDate(target.lastScanDate)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* See More */}
            {targets.length > 0 && (
                <div className="border-t border-zinc-800/50 px-6 py-3">
                    <Link
                        to="/targets"
                        className="flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-colors group"
                    >
                        SEE ALL TARGETS
                        <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            )}
        </div>
    );
}
