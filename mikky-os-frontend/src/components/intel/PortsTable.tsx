import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server } from "lucide-react";

interface Port {
    port: number;
    protocol: string;
    state: string;
    service?: string;
    version?: string;
}

interface PortsTableProps {
    ports: Port[];
}

export function PortsTable({ ports }: PortsTableProps) {
    // Sort critical ports first
    const sortedPorts = [...ports].sort((a, b) => a.port - b.port);

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden h-full">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-cyan-500" />
                    <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                        OPEN PORTS ({ports.length})
                    </h3>
                </div>
                {ports.length > 5 && (
                    <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10 text-xs">
                        HIGH EXPOSURE
                    </Badge>
                )}
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {ports.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm font-mono">
                        NO OPEN PORTS FOUND
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-zinc-900 sticky top-0">
                            <TableRow className="border-zinc-800">
                                <TableHead className="w-[80px] font-mono text-xs text-zinc-500">PORT</TableHead>
                                <TableHead className="w-[80px] font-mono text-xs text-zinc-500">STATE</TableHead>
                                <TableHead className="font-mono text-xs text-zinc-500">SERVICE</TableHead>
                                <TableHead className="font-mono text-xs text-zinc-500">VERSION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPorts.map((p) => (
                                <TableRow key={`${p.port}-${p.protocol}`} className="border-zinc-800">
                                    <TableCell className="font-mono font-bold text-zinc-200">
                                        {p.port}
                                        <span className="text-zinc-500 font-normal text-[10px] ml-1">/{p.protocol}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-emerald-400 border-emerald-900 bg-emerald-900/20 text-[10px] uppercase">
                                            {p.state}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-zinc-300 font-mono text-xs">
                                        {p.service || "unknown"}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono text-xs truncate max-w-[150px]" title={p.version}>
                                        {p.version || "-"}
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
