interface Hop {
    hop: number;
    ip?: string;
    hostname?: string;
    rtt?: string;
}

interface NetworkMapProps {
    traceroute: Hop[];
}

export function NetworkMap({ traceroute }: NetworkMapProps) {
    if (!traceroute || traceroute.length === 0) {
        return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex items-center justify-center h-full min-h-[150px]">
                <div className="text-center text-zinc-500 text-sm font-mono">
                    NO ROUTE DATA AVAILABLE
                </div>
            </div>
        );
    }

    // Sort hops
    const sortedHops = [...traceroute].sort((a, b) => a.hop - b.hop);

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                    NETWORK PATH ({sortedHops.length} HOPS)
                </h3>
            </div>

            <div className="p-6 overflow-x-auto">
                <div className="flex items-center space-x-2 min-w-max">
                    {/* Source Node */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-500 text-xs font-bold">
                            MIKKY
                        </div>
                    </div>

                    {sortedHops.map((hop, idx) => (
                        <div key={hop.hop} className="flex items-center">
                            {/* Connection Line */}
                            <div className="h-[2px] w-8 bg-zinc-700 relative group">
                                {hop.rtt && (
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                        {hop.rtt}
                                    </span>
                                )}
                            </div>

                            {/* Node */}
                            <div className="flex flex-col items-center gap-2 relative group hover:-translate-y-1 transition-transform">
                                <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold z-10 
                                    ${idx === sortedHops.length - 1 ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                                    {hop.hop}
                                </div>
                                <div className="absolute top-10 text-center w-32 -left-12 pointer-events-none group-hover:pointer-events-auto">
                                    <div className="text-[10px] font-mono text-zinc-300 font-bold truncate">{hop.ip}</div>
                                    <div className="text-[9px] text-zinc-600 truncate">{hop.hostname}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
