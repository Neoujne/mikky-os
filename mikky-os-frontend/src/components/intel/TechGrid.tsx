import { Cpu, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Technology {
    name: string;
    category?: string;
    version?: string;
    confidence?: number;
}

interface TechGridProps {
    technologies: Technology[];
}

export function TechGrid({ technologies }: TechGridProps) {
    if (!technologies || technologies.length === 0) {
        return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex items-center justify-center h-full min-h-[150px]">
                <div className="text-center text-zinc-500 text-sm font-mono">
                    <Cpu className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    NO TECHNOLOGIES DETECTED
                </div>
            </div>
        );
    }

    // Group by category
    const grouped = technologies.reduce((acc, tech) => {
        const cat = tech.category || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(tech);
        return acc;
    }, {} as Record<string, Technology[]>);

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden h-full">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                <Layers className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                    TECH STACK ({technologies.length})
                </h3>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {Object.entries(grouped).map(([category, techs]) => (
                    <div key={category} className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                            {techs.map((tech) => (
                                <Badge
                                    key={tech.name}
                                    variant="outline"
                                    className="border-zinc-700 bg-zinc-950/50 text-zinc-300 py-1 pl-2 pr-3 flex items-center gap-2"
                                >
                                    <span className="font-semibold">{tech.name}</span>
                                    {tech.version && (
                                        <span className="text-xs text-cyan-500 font-mono bg-cyan-900/10 px-1 rounded">
                                            v{tech.version}
                                        </span>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
