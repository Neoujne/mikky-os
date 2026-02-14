
import { format } from 'date-fns';

interface ScanRun {
    _id: string;
    startedAt: string;
    vulnCount?: number;
}

interface VulnTimelineProps {
    scans: ScanRun[];
}

export function VulnTimeline({ scans }: VulnTimelineProps) {
    if (!scans || scans.length === 0) {
        return (
            <div className="h-64 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center p-6">
                <p className="text-zinc-500 font-mono text-sm">NO SCAN HISTORY AVAILABLE</p>
            </div>
        );
    }

    // Sort scans by date (oldest first) and take last 20
    const sortedScans = [...scans]
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
        .slice(-20);

    const maxVulns = Math.max(...sortedScans.map((s) => s.vulnCount || 0), 10); // Minimum scale of 10

    return (
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
            <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide mb-6">
                VULNERABILITY TREND
            </h3>

            <div className="flex-1 flex items-end gap-2 min-h-[160px] pb-6 border-b border-zinc-800/50 relative">
                {sortedScans.map((scan, index) => {
                    const heightPercent = Math.max(((scan.vulnCount || 0) / maxVulns) * 100, 4); // Min height 4% for visibility
                    const dateLabel = format(new Date(scan.startedAt), 'MMM dd');

                    return (
                        <div key={scan._id} className="flex-1 flex flex-col items-center group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none">
                                <span className="text-zinc-400">{dateLabel}: </span>
                                <span className="text-zinc-100 font-bold">{scan.vulnCount || 0} vulns</span>
                            </div>

                            {/* Bar */}
                            <div
                                className="w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out hover:brightness-110"
                                style={{
                                    height: `${heightPercent}%`,
                                    background: `linear-gradient(to top, rgba(239, 68, 68, 0.4), rgba(249, 115, 22, 0.8))`,
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* X-Axis Labels (simplified) */}
            <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-mono uppercase">
                <span>{format(new Date(sortedScans[0].startedAt), 'MMM dd')}</span>
                <span>{format(new Date(sortedScans[sortedScans.length - 1].startedAt), 'MMM dd')}</span>
            </div>
        </div>
    );
}
