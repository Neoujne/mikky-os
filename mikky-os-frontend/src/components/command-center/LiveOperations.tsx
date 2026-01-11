import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, Shield, Wifi, AlertTriangle, FileText } from 'lucide-react';
import type { StageStatus, LiveOperationsProps, ActiveScan } from '@/types/command-center';
import { MissionReport } from './MissionReport';

const STAGES: Array<keyof StageStatus> = [
    'info_gathering',
    'live_recon',
    'port_inspection',
    'enumeration',
    'protection_headers',
    'paths_files',
    'tech_detection',
    'vuln_scanning',
    'reporting',
];

// Short codes for the dense progress bar
const STAGE_LABELS: Record<keyof StageStatus, string> = {
    info_gathering: 'INFO',
    live_recon: 'LIVE',
    port_inspection: 'PORT',
    enumeration: 'ENUM',
    protection_headers: 'HEAD',
    paths_files: 'PATH',
    tech_detection: 'TECH',
    vuln_scanning: 'VULN',
    reporting: 'RPT',
};

function StageIndicator({ status, label, isLast }: { status: string; label: string; isLast: boolean }) {
    const getStatusColor = () => {
        switch (status) {
            case 'done':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'running':
                return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse';
            case 'failed':
                return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            default:
                return 'bg-zinc-900 text-zinc-700 border-zinc-800';
        }
    };

    return (
        <div className="flex items-center">
            <div
                className={cn(
                    'h-6 px-1.5 flex items-center justify-center border text-[9px] font-mono font-bold tracking-wider rounded-sm transition-all duration-300 min-w-[36px]',
                    getStatusColor()
                )}
            >
                {label}
            </div>
            {!isLast && (
                <div className={cn('h-[2px] w-2 mx-0.5', status === 'done' ? 'bg-emerald-500/30' : 'bg-zinc-800')} />
            )}
        </div>
    );
}

// Helper to format safety score color: 0-49 Critical, 50-79 Warning, 80-100 Safe
function getSafetyColor(score?: number): string {
    if (score === undefined) return 'text-zinc-500';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
}

// Report trigger with local modal state
function ReportTrigger({ scan }: { scan: ActiveScan }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!scan.aiSummary) return null;

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="text-xs text-cyan-400 hover:text-cyan-300 gap-1.5"
                onClick={() => setIsOpen(true)}
            >
                <FileText className="h-3.5 w-3.5" />
                VIEW REPORT
            </Button>
            <MissionReport
                open={isOpen}
                onOpenChange={setIsOpen}
                summary={scan.aiSummary}
                safetyScore={scan.safetyScore ?? 100}
                targetDomain={scan.targetDomain}
                isComplete={true}
            />
        </>
    );
}

export function LiveOperations({ activeScans, onSelectScan }: LiveOperationsProps) {
    if (activeScans.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                <p className="text-zinc-500 font-mono text-sm">NO ACTIVE OPERATIONS</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Operations
                </h3>
            </div>

            <div className="space-y-3">
                {activeScans.map((scan) => (
                    <div
                        key={scan._id}
                        className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-cyan-500/30 transition-all duration-300"
                    >
                        {/* Progress Bar Background */}
                        <div
                            className="absolute bottom-0 left-0 h-[2px] bg-cyan-500/50 transition-all duration-1000 ease-out"
                            style={{ width: `${scan.progress}%` }}
                        />

                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-zinc-950 font-mono text-xs border-zinc-700 text-zinc-300">
                                        {scan.targetDomain}
                                    </Badge>
                                    <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(scan.startedAt).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* VIEW REPORT button - only show when completed with aiSummary */}
                                    {scan.status === 'completed' && scan.aiSummary && (
                                        <ReportTrigger scan={scan} />
                                    )}
                                    <div
                                        className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono cursor-pointer"
                                        onClick={() => onSelectScan?.(scan._id)}
                                    >
                                        {scan.status === 'completed' ? (
                                            <span className="text-emerald-400">✓ COMPLETE</span>
                                        ) : (
                                            <>
                                                {scan.progress}% COMPLETE
                                                <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Real-time Metrics Row */}
                            <div className="flex items-center gap-4 mb-4">
                                {/* Ports Found */}
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <Wifi className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-zinc-400">PORTS:</span>
                                    <span className="text-cyan-400 font-bold">
                                        {scan.totalPorts ?? '-'}
                                    </span>
                                </div>

                                {/* Vulns Found */}
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="text-zinc-400">VULNS:</span>
                                    <span className="text-amber-400 font-bold">
                                        {scan.vulnCount ?? '-'}
                                    </span>
                                </div>

                                {/* Safety Score */}
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <Shield className={cn("h-3.5 w-3.5", getSafetyColor(scan.safetyScore))} />
                                    <span className="text-zinc-400">SAFETY:</span>
                                    <span className={cn("font-bold", getSafetyColor(scan.safetyScore))}>
                                        {scan.safetyScore !== undefined ? scan.safetyScore : 'CALC...'}
                                    </span>
                                </div>
                            </div>

                            {/* 9-Stage Progress Indicators */}
                            <div className="flex items-center justify-between overflow-x-auto pb-1">
                                {STAGES.map((stage, idx) => (
                                    <StageIndicator
                                        key={stage}
                                        status={scan.stageStatus[stage]}
                                        label={STAGE_LABELS[stage]}
                                        isLast={idx === STAGES.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
