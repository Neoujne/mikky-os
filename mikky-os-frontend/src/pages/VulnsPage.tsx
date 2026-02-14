/**
 * Vulns Page - Vulnerability Management
 * View and manage discovered vulnerabilities.
 */

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { VulnAnalyticsHeader } from '@/components/vulns/VulnAnalyticsHeader';
import { SeverityChart } from '@/components/vulns/SeverityChart';
import { VulnTimeline } from '@/components/vulns/VulnTimeline';
import { VulnTable, type Vulnerability } from '@/components/vulns/VulnTable';

export function VulnsPage() {
    const [searchTerm, setSearchTerm] = useState('');

    // Data Queries
    const vulns = useQuery(api.vulnerabilities.list) || [];
    const scanRuns = useQuery(api.scans.listAll, { limit: 50 }) || [];
    const updateVulnStatus = useMutation(api.vulnerabilities.updateStatus);

    // AI Explanation State
    const [explainingId, setExplainingId] = useState<string | null>(null);

    // Calculate Metrics
    const metrics = useMemo(() => {
        const counts = { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        vulns.forEach((v) => {
            counts.total++;
            if (v.severity in counts) {
                counts[v.severity as keyof typeof counts]++;
            }
        });
        return counts;
    }, [vulns]);

    // Persist AI analysis to Convex
    const saveAiAnalysis = useMutation(api.vulnerabilities.saveAiAnalysis);

    // Handle AI Explanation
    const handleExplain = async (vuln: Vulnerability) => {
        // Skip if already has an explanation (cached in DB)
        if (vuln.aiExplanation) return;

        try {
            setExplainingId(vuln._id);

            const response = await fetch('http://localhost:5000/api/vuln/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: vuln.title,
                    description: vuln.description,
                    severity: vuln.severity,
                    cvss: vuln.cvss,
                    targetDomain: vuln.targetDomain,
                    tool: vuln.tool,
                    evidence: vuln.evidence,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Backend returned an error');
            }

            const data = await response.json();

            // Persist to Convex so we never pay for the same call twice
            await saveAiAnalysis({
                id: vuln._id as any,
                aiExplanation: data.explanation,
                aiRemediation: data.remediation,
            });

            // Convex reactivity will automatically re-render with the saved data
        } catch (error) {
            console.error('Failed to explain vulnerability:', error);
        } finally {
            setExplainingId(null);
        }
    };

    // Filter Vulnerabilities
    const filteredVulns = useMemo(() => {
        if (!searchTerm) {
            return vulns;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return vulns.filter((v: any) => {
            return (
                (v.title && v.title.toLowerCase().includes(lowercasedFilter)) ||
                (v.targetDomain && v.targetDomain.toLowerCase().includes(lowercasedFilter))
            );
        });
    }, [vulns, searchTerm]);

    if (!vulns) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Metrics */}
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight mb-6">
                    VULNERABILITY INTELLIGENCE
                </h1>
                <VulnAnalyticsHeader metrics={metrics} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
                <div className="lg:col-span-1 h-full">
                    <SeverityChart metrics={metrics} />
                </div>
                <div className="lg:col-span-2 h-full">
                    <VulnTimeline scans={scanRuns} />
                </div>
            </div>

            {/* Main Content: Search + Table as one visual unit */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden mt-16">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search by title or target..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9 bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:ring-cyan-500/20 text-sm"
                        />
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                        {filteredVulns.length} vulnerabilities
                    </div>
                </div>

                {/* Table (no outer border — parent container handles it) */}
                <VulnTable
                    vulnerabilities={filteredVulns as any}
                    onExplain={handleExplain}
                    onUpdateStatus={(id, status) => updateVulnStatus({ id: id as any, status: status as any })}
                    isExplaining={explainingId}
                />
            </div>
        </div>
    );
}
