/**
 * Dashboard Page - Command Center UI (Milestone 2 Redesign)
 *
 * Layout:
 * 1. ENGAGE bar + Metrics
 * 2. Live Operations (queued + scanning)
 * 3. Managed Targets (10 most recent successful)
 * 4. Failed Targets (conditional — only if failures exist)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DashboardMetrics } from '@/components/command-center/DashboardMetrics';
import { LiveOperations } from '@/components/command-center/LiveOperations';
import { ManagedTargets } from '@/components/command-center/ManagedTargets';
import { FailedTargets } from '@/components/command-center/FailedTargets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Server, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import type { ActiveScan, Metrics } from '@/types/command-center';

export function DashboardPage() {
    const [domain, setDomain] = React.useState('');
    const theme = useTheme();
    const isCyber = theme === 'cyberpunk';

    // ── Convex Queries ──────────────────────────────────────────────────────
    const liveOps = useQuery(api.scans.listLiveOperations);
    const succeededTargets = useQuery(api.targets.listSucceeded, { limit: 10 });
    const failedScans = useQuery(api.scans.listFailed, { limit: 10 });
    const metricsData = useQuery(api.scans.getMetrics);

    // ── Convex Mutations ────────────────────────────────────────────────────
    const engageMutation = useMutation(api.targets.engage);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleEngage = async () => {
        const d = domain.trim();
        if (!d) return;
        try {
            const result = await engageMutation({ domain: d, includeSubdomains: true });
            setDomain('');

            if (result?.scanRunId) {
                try {
                    const response = await fetch('http://localhost:5000/api/scan/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            scanRunId: result.scanRunId,
                            domain: d.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(),
                        }),
                    });
                    if (!response.ok) {
                        console.error('Backend API error:', await response.text());
                    } else {
                        console.log('[ENGAGE] Backend scan triggered for', d);
                    }
                } catch (fetchError) {
                    console.error('Failed to trigger backend scan:', fetchError);
                }
            }
        } catch (error) {
            console.error('Failed to engage scan:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleEngage();
    };

    const handleRetry = async (targetDomain: string) => {
        try {
            const result = await engageMutation({ domain: targetDomain, includeSubdomains: true });
            if (result?.scanRunId) {
                await fetch('http://localhost:5000/api/scan/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scanRunId: result.scanRunId,
                        domain: targetDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(),
                    }),
                });
            }
        } catch (error) {
            console.error('Failed to retry scan:', error);
        }
    };

    // ── Loading State ───────────────────────────────────────────────────────
    if (liveOps === undefined || succeededTargets === undefined || metricsData === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm">INITIALIZING SYSTEMS...</p>
                </div>
            </div>
        );
    }

    // ── Transform ───────────────────────────────────────────────────────────
    const transformedScans: ActiveScan[] = liveOps.map((s) => ({
        _id: s._id,
        targetId: s.targetId,
        targetDomain: s.targetDomain,
        startedAt: s.startedAt,
        currentStage: s.currentStage as keyof ActiveScan['stageStatus'],
        progress: s.progress,
        stageStatus: s.stageStatus,
        status: s.status,
        totalPorts: s.totalPorts,
        hostCount: s.hostCount,
        safetyScore: s.safetyScore,
        vulnCount: s.vulnCount,
    }));

    const metrics: Metrics = {
        totalTargets: metricsData.totalTargets,
        activeScans: metricsData.activeScans,
        criticalVulns: metricsData.criticalVulns,
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 pb-20">
            {/* Header + ENGAGE bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-zinc-100 mb-2">MISSION CONTROL</h1>
                    <p className="text-zinc-500 font-mono text-sm">
                        SYSTEM READY // {transformedScans.length > 0 ? `${transformedScans.length} ACTIVE OPS` : 'IDLE'}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
                    <div className="pl-2 pr-1">
                        <Target className="h-4 w-4 text-zinc-500" />
                    </div>
                    <Input
                        placeholder="ENTER TARGET DOMAIN..."
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="border-0 bg-transparent h-8 w-[200px] text-zinc-100 placeholder:text-zinc-600 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                    />
                    <Button
                        size="sm"
                        onClick={handleEngage}
                        className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono h-8 px-4"
                    >
                        ENGAGE
                    </Button>
                </div>
            </div>

            {/* Metrics Row */}
            <DashboardMetrics metrics={metrics} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Operations & Targets */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Live Operations */}
                    <LiveOperations activeScans={transformedScans} onSelectScan={() => { }} />

                    {/* Managed Targets (Succeeded Only — max 10) */}
                    <ManagedTargets targets={succeededTargets as any[]} />

                    {/* Failed Targets (Conditional) */}
                    <FailedTargets failedScans={(failedScans ?? []) as any[]} onRetry={handleRetry} />
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                    {/* System Status Card */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Server className="h-5 w-5 text-zinc-400" />
                            <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">SYSTEM STATUS</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                                <span className="text-sm text-zinc-500 font-mono">WORKER NODE</span>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    ONLINE
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                                <span className="text-sm text-zinc-500 font-mono">QUEUE</span>
                                <span className="text-sm text-zinc-200 font-mono">
                                    {liveOps.length > 0 ? `${liveOps.length} ACTIVE` : 'IDLE'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-zinc-500 font-mono">VERSION</span>
                                <span className="text-sm text-zinc-200 font-mono">v1.0.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Source Code Audit */}
                    <Link to="/code-audit" className={`block bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 flex flex-col items-center text-center space-y-4 group transition-all duration-300 ${isCyber ? 'hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'hover:border-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]'}`}>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${isCyber ? 'bg-cyan-500/10 group-hover:bg-cyan-500/20' : 'bg-green-500/10 group-hover:bg-green-500/20'}`}>
                            <ShieldCheck className={`h-5 w-5 ${isCyber ? 'text-cyan-400' : 'text-green-400'}`} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide mb-1">SOURCE CODE AUDIT</h3>
                            <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">AI-powered static analysis for GitHub repositories.</p>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-mono group-hover:gap-2.5 transition-all ${isCyber ? 'text-cyan-400' : 'text-green-400'}`}>
                            LAUNCH <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
