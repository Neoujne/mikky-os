import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Target } from 'lucide-react';
import { DashboardMetrics } from './DashboardMetrics';
import { LiveOperations } from './LiveOperations';
import { TargetsTable } from './TargetsTable';
import type { CommandCenterProps } from '@/types/command-center';

export function CommandCenter({
    targets,
    activeScans,
    metrics,
    workerStatus,
    onEngageScan,
    onSelectScan,
    onDeleteTarget,
}: CommandCenterProps) {
    const [domain, setDomain] = React.useState('');

    const handleEngage = () => {
        if (!domain.trim()) return;
        onEngageScan?.(domain.trim(), true);
        setDomain('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEngage();
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-zinc-100 mb-2">MISSION CONTROL</h1>
                    <p className="text-zinc-500 font-mono text-sm">
                        SYSTEM READY // WORKER: {workerStatus.status.toUpperCase()} ({workerStatus.uptime})
                    </p>
                </div>

                {/* Quick Engage Actions */}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column: Live Operations (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                    <LiveOperations activeScans={activeScans} onSelectScan={onSelectScan} />
                    <TargetsTable targets={targets} onDelete={onDeleteTarget} />
                </div>

                {/* Side Column: System/Context (1/3 width) */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6">
                        <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-4">System Status</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500">Worker Node</span>
                                <span className="text-emerald-400 font-mono">
                                    {workerStatus.status === 'online' ? 'ONLINE' : workerStatus.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500">Version</span>
                                <span className="text-zinc-300 font-mono">{workerStatus.version}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500">Uptime</span>
                                <span className="text-zinc-300 font-mono">{workerStatus.uptime}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500">Queue</span>
                                <span className="text-zinc-300 font-mono">
                                    {activeScans.length > 0 ? `${activeScans.length} ACTIVE` : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-zinc-800 p-6 flex flex-col items-center justify-center text-center space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                            <Plus className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div>
                            <p className="text-zinc-300 font-medium">Add New Integration</p>
                            <p className="text-zinc-500 text-xs mt-1">Connect Jira, Slack, or GitHub</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
