import { ChevronDown } from "lucide-react";

interface Target {
    _id: string;
    domain: string;
    lastScanDate?: string;
    totalVulns: number;
}

interface TargetSelectorProps {
    targets: Target[];
    selectedTargetId: string | null;
    onSelect: (targetId: string) => void;
}

export function TargetSelector({ targets, selectedTargetId, onSelect }: TargetSelectorProps) {
    return (
        <div className="w-full max-w-sm relative group">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-cyan-500 transition-colors">
                <ChevronDown className="h-4 w-4" />
            </div>

            <select
                value={selectedTargetId || ""}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:ring-1 focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer transition-colors hover:bg-zinc-800/50 text-sm font-mono"
            >
                <option value="" disabled className="bg-zinc-900 text-zinc-500">Select a target to analyze...</option>
                {targets.map((target) => (
                    <option key={target._id} value={target._id} className="bg-zinc-900 text-zinc-100">
                        {target.domain} {target.totalVulns > 0 ? `(${target.totalVulns} Vulns)` : ''}
                    </option>
                ))}
                {targets.length === 0 && (
                    <option value="" disabled className="bg-zinc-900 text-zinc-500">No targets found</option>
                )}
            </select>

            {/* Optional: Show badge for selected target outside or inside via absolute positioning if needed, 
                but native select options can't hold complex HTML. 
                Just showing the count in the text above. */}
        </div>
    );
}
