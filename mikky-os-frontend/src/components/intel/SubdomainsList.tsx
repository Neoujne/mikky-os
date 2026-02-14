import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Network } from "lucide-react";

interface Subdomain {
    subdomain: string;
    source: string;
    resolved?: boolean;
    ip?: string;
}

interface SubdomainsListProps {
    subdomains: Subdomain[];
}

export function SubdomainsList({ subdomains }: SubdomainsListProps) {
    const [filter, setFilter] = useState("");

    const filtered = subdomains.filter(s =>
        s.subdomain.toLowerCase().includes(filter.toLowerCase()) ||
        (s.ip && s.ip.includes(filter))
    );

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-cyan-500" />
                    <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                        SUBDOMAINS ({subdomains.length})
                    </h3>
                </div>
                <div className="relative w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
                    <Input
                        className="h-8 pl-8 text-xs bg-zinc-950 border-zinc-800"
                        placeholder="Search..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px] max-h-[400px]">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm font-mono">
                        NO SUBDOMAINS FOUND
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-zinc-900 sticky top-0 z-10">
                            <TableRow className="border-zinc-800">
                                <TableHead className="font-mono text-xs text-zinc-500">DOMAIN</TableHead>
                                <TableHead className="font-mono text-xs text-zinc-500 w-[120px]">IP</TableHead>
                                <TableHead className="font-mono text-xs text-zinc-500 w-[100px] text-right">SOURCE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((sub, idx) => (
                                <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/30">
                                    <TableCell className="font-mono text-xs text-zinc-300">
                                        {sub.subdomain}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-cyan-400">
                                        {sub.ip || <span className="text-zinc-600">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 bg-zinc-900/50">
                                            {sub.source}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
