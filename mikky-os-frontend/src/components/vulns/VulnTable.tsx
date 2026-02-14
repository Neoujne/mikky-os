import { Fragment, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Shield, AlertTriangle, Info, Zap, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Vulnerability {
    _id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    cvss?: number;
    targetDomain: string;
    tool: string;
    discoveredAt: string;
    status: 'open' | 'confirmed' | 'false_positive' | 'resolved' | 'accepted' | 'remediated';
    evidence?: string;
    aiExplanation?: string;
    aiRemediation?: string;
    url?: string;
    parameter?: string;
}

interface VulnTableProps {
    vulnerabilities: Vulnerability[];
    onExplain: (vuln: Vulnerability) => void;
    onUpdateStatus: (id: string, status: string) => void;
    isExplaining?: string | null; // ID of vuln currently being explained
}

export function VulnTable({ vulnerabilities, onExplain, onUpdateStatus: _onUpdateStatus, isExplaining }: VulnTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof Vulnerability>('severity');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: keyof Vulnerability) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const severityWeight = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

    const sortedVulns = [...vulnerabilities].sort((a, b) => {
        let valA: string | number = a[sortField] ?? '';
        let valB: string | number = b[sortField] ?? '';

        if (sortField === 'severity') {
            valA = severityWeight[a.severity] || 0;
            valB = severityWeight[b.severity] || 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const severityConfig = {
        critical: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
        medium: { icon: Info, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        low: { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        info: { icon: Info, color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
    };

    const statusColors: Record<string, string> = {
        open: 'text-zinc-400 bg-zinc-800/50 border-zinc-700',
        confirmed: 'text-red-400 bg-red-900/20 border-red-800/50',
        false_positive: 'text-zinc-500 bg-zinc-900 border-zinc-800 line-through',
        resolved: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50',
        accepted: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
        remediated: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50',
    };

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900/80">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/80">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="cursor-pointer text-zinc-400 font-mono text-xs uppercase" onClick={() => handleSort('severity')}>Severity</TableHead>
                        <TableHead className="cursor-pointer text-zinc-400 font-mono text-xs uppercase" onClick={() => handleSort('title')}>Vulnerability</TableHead>
                        <TableHead className="cursor-pointer text-zinc-400 font-mono text-xs uppercase" onClick={() => handleSort('targetDomain')}>Target</TableHead>
                        <TableHead className="cursor-pointer text-zinc-400 font-mono text-xs uppercase" onClick={() => handleSort('cvss')}>CVSS</TableHead>
                        <TableHead className="cursor-pointer text-zinc-400 font-mono text-xs uppercase" onClick={() => handleSort('status')}>Status</TableHead>
                        <TableHead className="text-right text-zinc-400 font-mono text-xs uppercase">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedVulns.map((vuln) => {
                        const config = severityConfig[vuln.severity] || severityConfig.info;
                        const isExpanded = expandedRow === vuln._id;

                        return (
                            <Fragment key={vuln._id}>
                                <TableRow
                                    className="border-zinc-800 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                                    onClick={() => setExpandedRow(isExpanded ? null : vuln._id)}
                                >
                                    <TableCell>
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} uppercase font-mono text-[10px]`}>
                                            {vuln.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-zinc-200">{vuln.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-cyan-400">
                                        {vuln.targetDomain}
                                    </TableCell>
                                    <TableCell>
                                        {vuln.cvss ? (
                                            <span className={`font-mono font-bold ${vuln.cvss >= 9 ? 'text-red-500' : vuln.cvss >= 7 ? 'text-orange-500' : 'text-zinc-400'}`}>
                                                {vuln.cvss}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize ${statusColors[vuln.status] || 'text-zinc-400 border-zinc-700'}`}>
                                            {vuln.status?.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Open menu
                                            }}
                                        >
                                            <span className="sr-only">Open menu</span>
                                            {/* You could add a dropdown here for more actions */}
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {/* Expanded Details Row */}
                                {isExpanded && (
                                    <TableRow className="bg-zinc-950/30 hover:bg-zinc-950/30 border-zinc-800">
                                        <TableCell colSpan={7} className="p-0">
                                            <div className="p-6 space-y-6">
                                                {/* Description */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</h4>
                                                    <p className="text-zinc-300 text-sm leading-relaxed max-w-3xl">{vuln.description}</p>
                                                </div>

                                                {/* Meta Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                                                        <span className="text-xs text-zinc-500 uppercase block mb-1">Tool</span>
                                                        <span className="text-sm text-zinc-200 font-mono">{vuln.tool}</span>
                                                    </div>
                                                    <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                                                        <span className="text-xs text-zinc-500 uppercase block mb-1">Discovered</span>
                                                        <span className="text-sm text-zinc-200 font-mono">{new Date(vuln.discoveredAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                                                        <span className="text-xs text-zinc-500 uppercase block mb-1">Evidence</span>
                                                        <code className="text-xs text-cyan-400 block truncate">{vuln.evidence || 'N/A'}</code>
                                                    </div>
                                                </div>

                                                {/* AI Explanation Section */}
                                                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                                                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                                                        <div className="flex items-center gap-2">
                                                            <BrainCircuit className="h-4 w-4 text-purple-400" />
                                                            <h4 className="text-sm font-bold text-zinc-200">AI Security Analyst</h4>
                                                        </div>
                                                        {!vuln.aiExplanation && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onExplain(vuln);
                                                                }}
                                                                disabled={isExplaining === vuln._id}
                                                            >
                                                                {isExplaining === vuln._id ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <div className="h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                                                        Analyzing...
                                                                    </span>
                                                                ) : (
                                                                    <>Analyze Vulnerability</>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {vuln.aiExplanation ? (
                                                        <div className="p-4 prose prose-invert prose-sm max-w-none font-mono text-zinc-300">
                                                            <ReactMarkdown>{vuln.aiExplanation}</ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 text-center text-zinc-500 text-sm">
                                                            Click "Analyze Vulnerability" to generate an AI explanation and remediation plan.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
