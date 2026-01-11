/**
 * Vulns Page - Vulnerability Management
 * View and manage discovered vulnerabilities.
 */

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle, Shield, Info, Zap } from 'lucide-react';

// Mock vulnerability type (until schema is updated)
interface Vulnerability {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    targetDomain: string;
    discoveredAt: string;
    description: string;
    cvss?: number;
}

export function VulnsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [expandedSeverity, setExpandedSeverity] = useState<string | null>('critical');

    // Query scan runs to extract vulnerabilities
    // NOTE: This is a mock implementation. In production, you'd have a separate vulnerabilities table
    const scanRuns = useQuery(api.scans.listAll, { limit: 100 });

    // Loading state
    if (scanRuns === undefined) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                        Vulnerabilities
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Security findings and vulnerability management.
                    </p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-zinc-500 font-mono text-sm">LOADING VULNERABILITIES...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Mock vulnerabilities (in production, this would come from a proper vulns table)
    const mockVulnerabilities: Vulnerability[] = scanRuns
        .filter(scan => scan.vulnCount && scan.vulnCount > 0)
        .flatMap(scan => {
            // Generate mock vulnerabilities based on vulnCount
            const vulns: Vulnerability[] = [];
            const count = scan.vulnCount || 0;

            // Critical vulns (20% of total)
            const criticalCount = Math.floor(count * 0.2);
            for (let i = 0; i < criticalCount; i++) {
                vulns.push({
                    id: `${scan._id}-crit-${i}`,
                    title: 'SQL Injection Vulnerability',
                    severity: 'critical',
                    targetDomain: scan.targetDomain,
                    discoveredAt: scan.startedAt,
                    description: 'Unvalidated user input in database queries could allow arbitrary SQL execution.',
                    cvss: 9.8,
                });
            }

            // High vulns (30% of total)
            const highCount = Math.floor(count * 0.3);
            for (let i = 0; i < highCount; i++) {
                vulns.push({
                    id: `${scan._id}-high-${i}`,
                    title: 'Cross-Site Scripting (XSS)',
                    severity: 'high',
                    targetDomain: scan.targetDomain,
                    discoveredAt: scan.startedAt,
                    description: 'Reflected XSS vulnerability allows execution of malicious scripts in user browsers.',
                    cvss: 7.4,
                });
            }

            // Medium vulns (30% of total)
            const mediumCount = Math.floor(count * 0.3);
            for (let i = 0; i < mediumCount; i++) {
                vulns.push({
                    id: `${scan._id}-med-${i}`,
                    title: 'Missing Security Headers',
                    severity: 'medium',
                    targetDomain: scan.targetDomain,
                    discoveredAt: scan.startedAt,
                    description: 'Critical security headers (CSP, X-Frame-Options) not configured.',
                    cvss: 5.3,
                });
            }

            // Low vulns (remainder)
            const lowCount = count - criticalCount - highCount - mediumCount;
            for (let i = 0; i < lowCount; i++) {
                vulns.push({
                    id: `${scan._id}-low-${i}`,
                    title: 'Information Disclosure',
                    severity: 'low',
                    targetDomain: scan.targetDomain,
                    discoveredAt: scan.startedAt,
                    description: 'Server version information exposed in HTTP headers.',
                    cvss: 3.1,
                });
            }

            return vulns;
        });

    // Filter vulnerabilities
    const filteredVulns = mockVulnerabilities.filter((vuln) => {
        const matchesSearch =
            vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vuln.targetDomain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || vuln.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    // Group by severity
    const groupedVulns = {
        critical: filteredVulns.filter(v => v.severity === 'critical'),
        high: filteredVulns.filter(v => v.severity === 'high'),
        medium: filteredVulns.filter(v => v.severity === 'medium'),
        low: filteredVulns.filter(v => v.severity === 'low'),
    };

    // Severity config
    const severityConfig = {
        critical: {
            icon: Zap,
            label: 'Critical',
            color: 'text-red-500',
            bg: 'bg-red-500/20',
            border: 'border-red-500/30',
        },
        high: {
            icon: AlertTriangle,
            label: 'High',
            color: 'text-orange-500',
            bg: 'bg-orange-500/20',
            border: 'border-orange-500/30',
        },
        medium: {
            icon: Info,
            label: 'Medium',
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/20',
            border: 'border-yellow-500/30',
        },
        low: {
            icon: Shield,
            label: 'Low',
            color: 'text-blue-500',
            bg: 'bg-blue-500/20',
            border: 'border-blue-500/30',
        },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                    Vulnerabilities
                </h1>
                <p className="text-zinc-400 mt-1">
                    Security findings and vulnerability management.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(groupedVulns).map(([severity, vulns]) => {
                    const config = severityConfig[severity as keyof typeof severityConfig];
                    const Icon = config.icon;
                    return (
                        <div
                            key={severity}
                            className={`p-4 rounded-lg border ${config.border} ${config.bg}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${config.color}`} />
                                <div>
                                    <p className="text-xs text-zinc-500 font-mono uppercase">{config.label}</p>
                                    <p className={`text-2xl font-bold ${config.color}`}>{vulns.length}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search vulnerabilities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSeverityFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${severityFilter === 'all'
                                ? 'bg-cyan-500 text-zinc-950'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                    >
                        All
                    </button>
                    {Object.keys(severityConfig).map((severity) => (
                        <button
                            key={severity}
                            onClick={() => setSeverityFilter(severity)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${severityFilter === severity
                                    ? `${severityConfig[severity as keyof typeof severityConfig].bg} ${severityConfig[severity as keyof typeof severityConfig].color} border ${severityConfig[severity as keyof typeof severityConfig].border}`
                                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                }`}
                        >
                            {severity}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vulnerabilities by Severity */}
            <div className="space-y-4">
                {Object.entries(groupedVulns).map(([severity, vulns]) => {
                    if (vulns.length === 0) return null;

                    const config = severityConfig[severity as keyof typeof severityConfig];
                    const Icon = config.icon;
                    const isExpanded = expandedSeverity === severity;

                    return (
                        <div key={severity} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                            {/* Section Header */}
                            <button
                                onClick={() => setExpandedSeverity(isExpanded ? null : severity)}
                                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                    <h3 className={`text-lg font-bold ${config.color} uppercase tracking-wider`}>
                                        {config.label}
                                    </h3>
                                    <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border}`}>
                                        {vulns.length}
                                    </Badge>
                                </div>
                                <span className="text-zinc-500 text-sm">
                                    {isExpanded ? '▼' : '▶'}
                                </span>
                            </button>

                            {/* Vulnerability Cards */}
                            {isExpanded && (
                                <div className="p-4 space-y-3 border-t border-zinc-800">
                                    {vulns.map((vuln) => (
                                        <div
                                            key={vuln.id}
                                            className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-zinc-100 mb-1">{vuln.title}</h4>
                                                    <p className="text-sm text-zinc-500 font-mono">{vuln.targetDomain}</p>
                                                </div>
                                                {vuln.cvss && (
                                                    <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} font-mono`}>
                                                        CVSS {vuln.cvss}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                                                {vuln.description}
                                            </p>
                                            <p className="text-xs text-zinc-600 font-mono">
                                                Discovered: {new Date(vuln.discoveredAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredVulns.length === 0 && (
                    <div className="p-12 text-center rounded-lg border border-zinc-800 bg-zinc-900/50">
                        <Shield className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <p className="text-zinc-400 font-mono">No vulnerabilities found</p>
                        <p className="text-zinc-600 text-sm mt-1">Your targets are secure!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
