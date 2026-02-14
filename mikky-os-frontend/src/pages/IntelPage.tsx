/**
 * Intel Page - Reconnaissance Dashboard
 * View detailed intelligence data for a target.
 */

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect } from 'react';
import { TargetSelector } from '@/components/intel/TargetSelector';
import { DnsRecords } from '@/components/intel/DnsRecords';
import { WhoisCard } from '@/components/intel/WhoisCard';
import { SubdomainsList } from '@/components/intel/SubdomainsList';
import { TechGrid } from '@/components/intel/TechGrid';
import { PortsTable } from '@/components/intel/PortsTable';
import { NetworkMap } from '@/components/intel/NetworkMap';
import { BrainCircuit, Search, Radio } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function IntelPage() {
    // 1. Fetch Targets
    const targets = useQuery(api.targets.list) || [];

    // 2. Local State
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // Auto-select first target if none selected
    useEffect(() => {
        if (!selectedTargetId && targets.length > 0) {
            setSelectedTargetId(targets[0]._id);
        }
    }, [targets, selectedTargetId]);

    // 3. Fetch Intel Data
    const intelData = useQuery(api.intel.getByTarget,
        selectedTargetId ? { targetId: selectedTargetId as any } : "skip"
    );

    // Get the most recent intel record
    const latestIntel = intelData?.[0];

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Target Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                        INTELLIGENCE
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Deep reconnaissance data and asset inventory.
                        {intelData && intelData.length > 0 && (
                            <span className="ml-2 text-xs font-mono text-cyan-500">
                                ({intelData.length} record{intelData.length !== 1 ? 's' : ''})
                            </span>
                        )}
                    </p>
                </div>
                <TargetSelector
                    targets={targets}
                    selectedTargetId={selectedTargetId}
                    onSelect={setSelectedTargetId}
                />
            </div>

            {/* Live Status Bar */}
            {selectedTargetId && (
                <div className="flex items-center justify-between px-4 py-2 rounded-md border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Live</span>
                        <Radio className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="text-xs font-mono text-zinc-500">Convex real-time subscription active</span>
                    </div>
                    {latestIntel?.collectedAt && (
                        <span className="text-xs font-mono text-zinc-500">
                            Last collected: {new Date(latestIntel.collectedAt).toLocaleString()}
                        </span>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!selectedTargetId || !latestIntel ? (
                <div className="flex flex-col items-center justify-center h-[60vh] rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <Search className="h-16 w-16 text-zinc-700 mb-4" />
                    <h3 className="text-xl font-bold text-zinc-300 mb-2">No Intelligence Data Found</h3>
                    <p className="text-zinc-500 max-w-md">
                        {selectedTargetId
                            ? "No reconnaissance data has been collected for this target yet. Run a scan to populate this dashboard."
                            : "Select a target to view intelligence data."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {/* Top Row: Whois & Network Map */}
                    <div className="md:col-span-1 h-80">
                        {latestIntel.whois ? (
                            <WhoisCard whois={latestIntel.whois} />
                        ) : (
                            <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-500 text-sm font-mono">
                                NO WHOIS DATA
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2 h-80">
                        {latestIntel.network?.traceroute ? (
                            <NetworkMap traceroute={latestIntel.network.traceroute as any} />
                        ) : (
                            <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-500 text-sm font-mono">
                                NO NETWORK MAP DATA
                            </div>
                        )}
                    </div>

                    {/* Middle Row: DNS & Tech Grid */}
                    <div className="md:col-span-1 min-h-[350px]">
                        {latestIntel.dns ? (
                            <DnsRecords dns={latestIntel.dns} />
                        ) : (
                            <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-500 text-sm font-mono">
                                NO DNS RECORDS
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2 min-h-[350px]">
                        {latestIntel.technologies ? (
                            <TechGrid technologies={latestIntel.technologies} />
                        ) : (
                            <div className="h-full rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-500 text-sm font-mono">
                                NO TECHNOLOGIES DETECTED
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Subdomains & Ports */}
                    <div className="md:col-span-2 h-[400px]">
                        <SubdomainsList subdomains={latestIntel.subdomains || []} />
                    </div>
                    <div className="md:col-span-1 h-[400px]">
                        <PortsTable ports={latestIntel.ports || []} />
                    </div>

                    {/* AI Analysis (Full Width) */}
                    {latestIntel.aiAnalysis && (
                        <div className="md:col-span-3">
                            <div className="rounded-lg border border-purple-500/30 bg-zinc-900/50 overflow-hidden">
                                <div className="p-4 border-b border-purple-500/30 bg-purple-500/5 flex items-center gap-2">
                                    <BrainCircuit className="h-5 w-5 text-purple-400" />
                                    <h3 className="text-sm font-bold text-purple-100 font-heading tracking-wide">
                                        AI RECONNAISSANCE ANALYSIS
                                    </h3>
                                </div>
                                <div className="p-6 prose prose-invert prose-sm max-w-none font-mono text-zinc-300">
                                    <ReactMarkdown>{latestIntel.aiAnalysis}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
