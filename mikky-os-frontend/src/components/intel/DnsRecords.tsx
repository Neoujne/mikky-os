import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface DnsData {
    aRecords?: string[];
    aaaaRecords?: string[];
    mxRecords?: string[];
    nsRecords?: string[];
    txtRecords?: string[];
    cnameRecords?: string[];
    soaRecord?: string;
}

interface DnsRecordsProps {
    dns: DnsData;
}

export function DnsRecords({ dns }: DnsRecordsProps) {
    const recordTypes = [
        { type: "Top-Level Domain", data: dns.soaRecord ? [dns.soaRecord] : [], color: "text-purple-400" }, // Using SOA as proxy concept mostly
        { type: "NS", data: dns.nsRecords, color: "text-blue-400" },
        { type: "MX", data: dns.mxRecords, color: "text-orange-400" },
        { type: "A", data: dns.aRecords, color: "text-emerald-400" },
        { type: "AAAA", data: dns.aaaaRecords, color: "text-emerald-500" },
        { type: "CNAME", data: dns.cnameRecords, color: "text-cyan-400" },
        { type: "TXT", data: dns.txtRecords, color: "text-zinc-400" },
    ];

    const hasData = recordTypes.some(r => r.data && r.data.length > 0);

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden h-full">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                <Globe className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                    DNS RECORDS
                </h3>
            </div>

            {!hasData ? (
                <div className="p-8 text-center text-zinc-500 text-sm font-mono">
                    NO DNS RECORDS FOUND
                </div>
            ) : (
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-zinc-900 sticky top-0">
                            <TableRow className="border-zinc-800">
                                <TableHead className="w-[80px] font-mono text-xs text-zinc-500">TYPE</TableHead>
                                <TableHead className="font-mono text-xs text-zinc-500">VALUE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recordTypes.map((record) => {
                                if (!record.data || record.data.length === 0) return null;
                                return record.data.map((value, idx) => (
                                    <TableRow key={`${record.type}-${idx}`} className="border-zinc-800 hover:bg-zinc-800/30">
                                        <TableCell>
                                            <Badge variant="outline" className={`font-mono text-[10px] w-16 justify-center ${record.color} border-zinc-700 bg-zinc-900`}>
                                                {record.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-300 break-all">
                                            {value}
                                        </TableCell>
                                    </TableRow>
                                ));
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
