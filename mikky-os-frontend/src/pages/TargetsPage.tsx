/**
 * Targets Page - Target Management
 * Manage pentest targets and scope definitions with Convex data.
 */

import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TargetsTable } from '@/components/command-center';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Plus } from 'lucide-react';
import type { Target as TargetType } from '@/types/command-center';

export function TargetsPage() {
    const [domain, setDomain] = React.useState('');

    // Convex queries
    const targets = useQuery(api.targets.list);

    // Convex mutations
    const createMutation = useMutation(api.targets.create);
    const deleteMutation = useMutation(api.targets.remove);

    // Handle add target
    const handleAddTarget = async () => {
        if (!domain.trim()) return;
        try {
            await createMutation({ domain: domain.trim() });
            setDomain('');
        } catch (error) {
            console.error('Failed to create target:', error);
        }
    };

    // Handle delete target
    const handleDeleteTarget = async (targetId: string) => {
        try {
            await deleteMutation({ id: targetId as any });
        } catch (error) {
            console.error('Failed to delete target:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddTarget();
        }
    };

    // Loading state
    if (targets === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm">LOADING TARGETS...</p>
                </div>
            </div>
        );
    }

    // Transform data
    const transformedTargets: TargetType[] = targets.map((t) => ({
        _id: t._id,
        domain: t.domain,
        riskScore: t.riskScore,
        totalVulns: t.totalVulns,
        lastScanDate: t.lastScanDate,
        status: t.status,
        createdAt: t.createdAt,
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">Targets</h1>
                    <p className="text-zinc-400 mt-1">Manage your pentest targets and scope definitions.</p>
                </div>

                {/* Add Target Form */}
                <div className="flex items-center gap-2 w-full md:w-auto bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
                    <div className="pl-2 pr-1">
                        <Target className="h-4 w-4 text-zinc-500" />
                    </div>
                    <Input
                        placeholder="Enter domain (e.g., example.com)"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="border-0 bg-transparent h-8 w-[250px] text-zinc-100 placeholder:text-zinc-600 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                    />
                    <Button
                        size="sm"
                        onClick={handleAddTarget}
                        className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono h-8 px-4 gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        ADD
                    </Button>
                </div>
            </div>

            <TargetsTable targets={transformedTargets} onDelete={handleDeleteTarget} />
        </div>
    );
}
