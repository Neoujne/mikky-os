/**
 * Operations Page - Orchestration Engine
 * Manage and monitor scan operations.
 */

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Clock, Target, Shield, AlertCircle } from 'lucide-react';

export function OperationsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Query all scan runs from Convex
    const scanRuns = useQuery(api.scans.listAll, { limit: 50 });

    // Loading state
    if (scanRuns === undefined) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                        Operations
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Scan run history and orchestration.
                    </p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-zinc-500 font-mono text-sm">LOADING OPERATIONS...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Filter scans
    const filteredScans = scanRuns.filter((scan) => {
        const matchesSearch = scan.targetDomain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Calculate duration
    const calculateDuration = (startedAt: string, completedAt?: string) => {
        const start = new Date(startedAt);
        const end = completedAt ? new Date(completedAt) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        if (diffMins > 0) {
            return `${diffMins}m ${diffSecs}s`;
        }
        return `${diffSecs}s`;
    };

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const config: Record<string, { label: string; className: string }> = {
            completed: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            scanning: { label: 'Scanning', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse' },
            failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
            queued: { label: 'Queued', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
            cancelled: { label: 'Cancelled', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        };

        const { label, className } = config[status] || config.queued;

        return (
            <Badge variant="outline" className={`font-mono text-xs ${className}`}>
                {label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                    Operations
                </h1>
                <p className="text-zinc-400 mt-1">
                    Scan run history and orchestration engine.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-cyan-400" />
                        <div>
                            <p className="text-xs text-zinc-500 font-mono uppercase">Total Runs</p>
                            <p className="text-2xl font-bold text-zinc-100">{scanRuns.length}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-emerald-400" />
                        <div>
                            <p className="text-xs text-zinc-500 font-mono uppercase">Completed</p>
                            <p className="text-2xl font-bold text-zinc-100">
                                {scanRuns.filter(s => s.status === 'completed').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-cyan-400" />
                        <div>
                            <p className="text-xs text-zinc-500 font-mono uppercase">Scanning</p>
                            <p className="text-2xl font-bold text-zinc-100">
                                {scanRuns.filter(s => s.status === 'scanning').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div>
                            <p className="text-xs text-zinc-500 font-mono uppercase">Failed</p>
                            <p className="text-2xl font-bold text-zinc-100">
                                {scanRuns.filter(s => s.status === 'failed').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search by domain..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all'
                            ? 'bg-cyan-500 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'completed'
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setStatusFilter('failed')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'failed'
                            ? 'bg-red-500 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                    >
                        Failed
                    </button>
                </div>
            </div>

            {/* Scan History Table */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/80">
                                <th className="text-left py-3 px-4 text-xs font-mono uppercase text-zinc-500">Domain</th>
                                <th className="text-left py-3 px-4 text-xs font-mono uppercase text-zinc-500">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-mono uppercase text-zinc-500">Started</th>
                                <th className="text-left py-3 px-4 text-xs font-mono uppercase text-zinc-500">Duration</th>
                                <th className="text-left py-3 px-4 text-xs font-mono uppercase text-zinc-500">Stage</th>
                                <th className="text-right py-3 px-4 text-xs font-mono uppercase text-zinc-500">Safety</th>
                                <th className="text-right py-3 px-4 text-xs font-mono uppercase text-zinc-500">Ports</th>
                                <th className="text-right py-3 px-4 text-xs font-mono uppercase text-zinc-500">Vulns</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredScans.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-zinc-500 font-mono text-sm">
                                        No scan runs found
                                    </td>
                                </tr>
                            ) : (
                                filteredScans.map((scan) => (
                                    <tr
                                        key={scan._id}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <span className="font-mono text-cyan-400 text-sm">{scan.targetDomain}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <StatusBadge status={scan.status} />
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-zinc-400 text-sm">
                                                {new Date(scan.startedAt).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-zinc-400 text-sm font-mono">
                                                {calculateDuration(scan.startedAt, scan.completedAt)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-zinc-500 text-xs font-mono">
                                                {scan.currentStage.replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`font-bold text-sm ${(scan.safetyScore ?? 100) >= 80 ? 'text-emerald-400' :
                                                (scan.safetyScore ?? 100) >= 50 ? 'text-amber-400' :
                                                    'text-red-400'
                                                }`}>
                                                {scan.safetyScore ?? 100}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-zinc-400 text-sm">{scan.totalPorts || 0}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-zinc-400 text-sm">{scan.vulnCount || 0}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination hint */}
            {scanRuns.length >= 50 && (
                <p className="text-xs text-zinc-600 text-center font-mono">
                    Showing latest 50 runs • Pagination coming soon
                </p>
            )}
        </div>
    );
}
