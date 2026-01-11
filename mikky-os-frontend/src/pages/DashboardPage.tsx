/**
 * Dashboard Page - Command Center UI
 * Main overview and system status dashboard with real-time Convex data.
 */

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CommandCenter } from '@/components/command-center';
import type { Target, ActiveScan, Metrics, WorkerStatus } from '@/types/command-center';

export function DashboardPage() {
    // Convex queries for real-time data
    const targets = useQuery(api.targets.list);
    const activeScans = useQuery(api.scans.listActive);
    const metricsData = useQuery(api.scans.getMetrics);

    // Convex mutations
    const engageMutation = useMutation(api.targets.engage);
    const deleteMutation = useMutation(api.targets.remove);

    // Handle ENGAGE action
    const handleEngageScan = async (domain: string, includeSubdomains: boolean) => {
        try {
            // 1. Create the target and scan run in Convex
            const result = await engageMutation({ domain, includeSubdomains });
            
            // 2. Trigger the backend Inngest workflow
            if (result?.scanRunId) {
                try {
                    const response = await fetch('http://localhost:3000/api/scan/start', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            scanRunId: result.scanRunId,
                            domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(),
                        }),
                    });
                    
                    if (!response.ok) {
                        console.error('Backend API error:', await response.text());
                    } else {
                        console.log('[ENGAGE] Backend scan triggered for', domain);
                    }
                } catch (fetchError) {
                    // Log but don't throw - let the UI continue
                    console.error('Failed to trigger backend scan:', fetchError);
                }
            }
        } catch (error) {
            console.error('Failed to engage scan:', error);
        }
    };

    // Handle target deletion
    const handleDeleteTarget = async (targetId: string) => {
        try {
            await deleteMutation({ id: targetId as any });
        } catch (error) {
            console.error('Failed to delete target:', error);
        }
    };

    // Handle scan selection (for log filtering)
    const handleSelectScan = (scanId: string) => {
        console.log('Selected scan:', scanId);
        // TODO: Filter console logs by scan
    };

    // Loading state
    if (targets === undefined || activeScans === undefined || metricsData === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm">INITIALIZING SYSTEMS...</p>
                </div>
            </div>
        );
    }

    // Transform Convex data to component props
    const transformedTargets: Target[] = targets.map((t) => ({
        _id: t._id,
        domain: t.domain,
        riskScore: t.riskScore,
        totalVulns: t.totalVulns,
        lastScanDate: t.lastScanDate,
        status: t.status,
        createdAt: t.createdAt,
    }));

    const transformedScans: ActiveScan[] = activeScans.map((s) => ({
        _id: s._id,
        targetId: s.targetId,
        targetDomain: s.targetDomain,
        startedAt: s.startedAt,
        currentStage: s.currentStage as keyof ActiveScan['stageStatus'],
        progress: s.progress,
        stageStatus: s.stageStatus,
        status: s.status,
    }));

    const metrics: Metrics = {
        totalTargets: metricsData.totalTargets,
        activeScans: metricsData.activeScans,
        criticalVulns: metricsData.criticalVulns,
    };

    const workerStatus: WorkerStatus = {
        status: 'online',
        version: 'v1.0.0',
        uptime: 'Real-time',
    };

    return (
        <CommandCenter
            targets={transformedTargets}
            activeScans={transformedScans}
            metrics={metrics}
            workerStatus={workerStatus}
            onEngageScan={handleEngageScan}
            onSelectScan={handleSelectScan}
            onDeleteTarget={handleDeleteTarget}
        />
    );
}
