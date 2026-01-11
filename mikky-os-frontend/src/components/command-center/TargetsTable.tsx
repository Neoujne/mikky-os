/**
 * TargetsTable - Managed targets list with report access
 */

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Trash2, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { MissionReport } from './MissionReport';
import type { TargetsTableProps, Target } from '@/types/command-center';
import type { Id } from '../../../convex/_generated/dataModel';

function SafetyBadge({ score }: { score: number }) {
    // Safety Score: 0-49 = Critical (Red), 50-79 = Warning (Yellow), 80-100 = Safe (Green)
    if (score >= 80)
        return (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 font-mono">
                SAFE ({score}/100)
            </Badge>
        );
    if (score >= 50)
        return (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 font-mono">
                WARNING ({score}/100)
            </Badge>
        );
    return (
        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30 font-mono">
            CRITICAL ({score}/100)
        </Badge>
    );
}

// Report button that fetches latest scan on demand
function ReportButton({ target }: { target: Target }) {
    const [isOpen, setIsOpen] = useState(false);

    // Only fetch when opening the modal
    const latestScan = useQuery(
        api.scans.getLatestByTarget,
        isOpen ? { targetId: target._id as Id<"targets"> } : "skip"
    );

    const hasReport = latestScan && latestScan.aiSummary && latestScan.status === 'completed';

    if (!target.lastScanDate) {
        return (
            <Button
                variant="ghost"
                size="icon"
                disabled
                className="text-zinc-700 h-8 w-8 cursor-not-allowed"
                title="No scan history"
            >
                <FileText className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="text-zinc-600 hover:text-cyan-400 hover:bg-cyan-950/20 h-8 w-8"
                title="View Mission Report"
            >
                {isOpen && !latestScan ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
            </Button>
            {hasReport && (
                <MissionReport
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    summary={latestScan.aiSummary!}
                    safetyScore={latestScan.safetyScore ?? target.safetyScore ?? 100}
                    targetDomain={target.domain}
                    isComplete={true}
                />
            )}
        </>
    );
}

export function TargetsTable({ targets, onDelete }: TargetsTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Select all/none toggle
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(targets.map(t => t._id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Toggle individual selection
    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    // Bulk actions
    const handleBulkDelete = () => {
        selectedIds.forEach(id => onDelete?.(id));
        setSelectedIds(new Set());
    };

    const selectedCount = selectedIds.size;
    const allSelected = targets.length > 0 && selectedIds.size === targets.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    return (
        <TooltipProvider>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden animate-in fade-in duration-700 relative">
                {/* Bulk Action Bar */}
                {selectedCount > 0 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-zinc-900 border border-cyan-500/30 rounded-lg px-4 py-2 flex items-center gap-4 shadow-lg shadow-cyan-500/20 animate-in slide-in-from-top-2 duration-200">
                        <span className="text-sm text-zinc-300 font-mono">
                            <span className="text-cyan-400 font-bold">{selectedCount}</span> target{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs"
                                onClick={() => {
                                    // TODO: Implement bulk engage - will be wired to onEngageScan
                                    console.log('Bulk engage:', Array.from(selectedIds));
                                }}
                            >
                                ENGAGE SELECTED
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs"
                                onClick={handleBulkDelete}
                            >
                                DELETE SELECTED
                            </Button>
                        </div>
                    </div>
                )}

                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Managed Targets</h3>
                    <span className="text-xs text-zinc-600 font-mono">{targets.length} RECORDS</span>
                </div>
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={allSelected || (someSelected ? "indeterminate" : false)}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="text-zinc-500 font-mono text-xs w-[250px]">DOMAIN</TableHead>
                            <TableHead className="text-zinc-500 font-mono text-xs">SAFETY SCORE</TableHead>
                            <TableHead className="text-zinc-500 font-mono text-xs">VULNS</TableHead>
                            <TableHead className="text-zinc-500 font-mono text-xs">LAST SCAN</TableHead>
                            <TableHead className="text-zinc-500 font-mono text-xs text-right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {targets.map((target) => {
                            const isSelected = selectedIds.has(target._id);
                            const isFailed = target.status === 'failed';

                            return (
                                <TableRow
                                    key={target._id}
                                    className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(target._id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-zinc-200 font-mono">{target.domain}</TableCell>
                                    <TableCell>
                                        <SafetyBadge score={target.safetyScore ?? target.riskScore ?? 0} />
                                    </TableCell>
                                    <TableCell className="text-zinc-300 font-mono font-bold">{target.totalVulns}</TableCell>
                                    <TableCell className="text-zinc-500 font-mono text-xs">
                                        {target.lastScanDate ? (
                                            new Date(target.lastScanDate).toLocaleDateString()
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-zinc-600 cursor-help">N/A</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Target has never been scanned</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                        {isFailed && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="ml-2 inline-flex items-center gap-1 text-rose-400 cursor-help">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        <span className="text-xs font-bold">FAILED</span>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Last scan failed: {target.lastError || 'Unknown error'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <ReportButton target={target} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete?.(target._id)}
                                                className="text-zinc-600 hover:text-rose-400 hover:bg-rose-950/20 h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {targets.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-zinc-500 font-mono">
                                    No targets defined. Engage system to begin.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
