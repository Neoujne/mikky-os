/**
 * Code Audit Page — Static source-code analysis with a hacker-terminal UX.
 *
 * Three visual zones:
 *   1. Hero — repo URL input + SCAN button
 *   2. Hacker Terminal — animated typing output during processing
 *   3. Results Dashboard — file list with expandable vulnerability cards
 *
 * Flow: Create Convex record -> POST to backend -> Inngest pipeline runs ->
 *       Poll Convex for status -> Display real findings when complete.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    ShieldCheck,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    FileCode2,
    GitBranch,
    Terminal,
    Loader2,
    Sparkles,
    Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_MIKKY_BACKEND_URL || 'http://localhost:5000';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface Finding {
    id: string;
    file: string;
    line: number;
    severity: Severity;
    title: string;
    description: string;
    badCode: string;
    fixCode: string;
}

/* ------------------------------------------------------------------ */
/*  Terminal animation lines (shown while audit runs)                   */
/* ------------------------------------------------------------------ */

function buildTerminalLines(repoUrl: string) {
    return [
        { text: '> initializing mikky-audit engine v2.4.1 ...', delay: 400 },
        { text: `> fetching critical files from ${repoUrl}`, delay: 800 },
        { text: '  Resolving repository... done.', delay: 600 },
        { text: '> analyzing package.json dependencies ...', delay: 900 },
        { text: '> scanning source files for security anti-patterns ...', delay: 700 },
        { text: '> checking for hardcoded secrets ...', delay: 600 },
        { text: '> detecting injection patterns (SQLi, XSS, SSRF) ...', delay: 500 },
        { text: '> reviewing authentication & authorization ...', delay: 500 },
        { text: '> checking cryptographic primitives ...', delay: 400 },
        { text: '> waiting for AI analysis to complete ...', delay: 1500 },
    ];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_CONFIG: Record<Severity, { bg: string; text: string; border: string; glow: string }> = {
    CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]' },
    HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]' },
    MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.2)]' },
    LOW: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', glow: '' },
    INFO: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-600/30', glow: '' },
};

function SeverityBadge({ severity }: { severity: Severity }) {
    const cfg = SEVERITY_CONFIG[severity];
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${cfg.bg} ${cfg.text} border ${cfg.border}`}
        >
            {severity}
        </span>
    );
}

/** Map backend snake_case finding to UI camelCase */
function mapFinding(raw: any, index: number): Finding {
    return {
        id: `f-${index}`,
        file: raw.file || 'unknown',
        line: raw.line ?? 1,
        severity: raw.severity || 'MEDIUM',
        title: raw.title || 'Untitled Finding',
        description: raw.explanation || '',
        badCode: raw.bad_code || '',
        fixCode: raw.fixed_code || '',
    };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function HackerTerminal({ lines, isRunning, isCyber }: { lines: string[]; isRunning: boolean; isCyber: boolean }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [lines.length]);

    return (
        <div className="rounded-xl border border-zinc-800 bg-black overflow-hidden font-mono text-sm">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <span className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-zinc-500 text-xs ml-2 flex items-center gap-1.5">
                    <Terminal className="h-3 w-3" /> mikky-audit
                </span>
                {isRunning && (
                    <Loader2 className={`ml-auto h-3.5 w-3.5 animate-spin ${isCyber ? 'text-cyan-400' : 'text-green-400'}`} />
                )}
            </div>

            {/* Output */}
            <div ref={scrollRef} className="p-4 h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                {lines.length === 0 && !isRunning && (
                    <span className="text-zinc-600">Awaiting scan command...</span>
                )}
                {lines.map((line, i) => (
                    <div key={i} className="leading-6">
                        <span
                            className={
                                line.includes('CRITICAL') || line.includes('error') || line.includes('FAILED')
                                    ? 'text-red-400'
                                    : line.includes('HIGH')
                                        ? 'text-orange-400'
                                        : line.includes('MEDIUM')
                                            ? 'text-yellow-400'
                                            : line.includes('LOW')
                                                ? 'text-blue-400'
                                                : line.includes('done') || line.includes('complete') || line.includes('ready')
                                                    ? (isCyber ? 'text-cyan-400' : 'text-green-400')
                                                    : (isCyber ? 'text-cyan-500/80' : 'text-green-500/80')
                            }
                        >
                            {line}
                        </span>
                    </div>
                ))}
                {isRunning && (
                    <span className={`inline-block w-2 h-4 animate-pulse ml-0.5 ${isCyber ? 'bg-cyan-400' : 'bg-green-400'}`} />
                )}
            </div>
        </div>
    );
}

function FindingCard({ finding }: { finding: Finding }) {
    const [open, setOpen] = useState(false);
    const cfg = SEVERITY_CONFIG[finding.severity];

    return (
        <div
            className={`rounded-lg border ${cfg.border} ${open ? cfg.glow : ''} bg-zinc-900/60 transition-shadow duration-300`}
        >
            {/* Header row */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left group"
            >
                {open ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                )}
                <SeverityBadge severity={finding.severity} />
                <FileCode2 className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span className="text-zinc-300 font-mono text-sm truncate">
                    {finding.file}
                    <span className="text-zinc-600">:{finding.line}</span>
                </span>
                <span className="hidden sm:inline text-zinc-500 text-sm ml-auto truncate">
                    {finding.title}
                </span>
            </button>

            {/* Expanded detail */}
            {open && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-800/60">
                    <p className="text-sm text-zinc-400 leading-relaxed">{finding.description}</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Bad code */}
                        <div className="rounded-lg overflow-hidden border border-red-500/20">
                            <div className="bg-red-500/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-red-400 font-bold flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" /> Vulnerable Code
                            </div>
                            <pre className="p-3 bg-red-950/20 text-red-300/90 text-xs leading-5 overflow-x-auto font-mono whitespace-pre-wrap">
                                {finding.badCode}
                            </pre>
                        </div>

                        {/* Fix code */}
                        <div className="rounded-lg overflow-hidden border border-green-500/20">
                            <div className="bg-green-500/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-green-400 font-bold flex items-center gap-1.5">
                                <ShieldCheck className="h-3 w-3" /> Recommended Fix
                            </div>
                            <pre className="p-3 bg-green-950/20 text-green-300/90 text-xs leading-5 overflow-x-auto font-mono whitespace-pre-wrap">
                                {finding.fixCode}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function CodeAuditPage() {
    const theme = useTheme();
    const isCyber = theme === 'cyberpunk';
    const { toast } = useToast();

    // -- Local UI state --
    const [repoUrl, setRepoUrl] = useState('');
    const [showInput, setShowInput] = useState(true);  // controls hero visibility
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [auditId, setAuditId] = useState<Id<'code_audits'> | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    // Chat with AI state
    const [chatInput, setChatInput] = useState('');
    const [chatReply, setChatReply] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatOutputRef = useRef<HTMLDivElement>(null);
    const toastFiredRef = useRef<string | null>(null); // track which audit we toasted

    const createAudit = useMutation(api.codeAudits.create);

    // -- DB queries --
    // Real-time subscription for the active scan
    const activeAudit = useQuery(
        api.codeAudits.getById,
        auditId ? { id: auditId } : 'skip'
    );
    // Load most recent audit on mount (persists across navigation)
    const recentAudits = useQuery(api.codeAudits.listRecent);
    const latestAudit = recentAudits?.[0] ?? null;

    // Determine which audit record to display
    const displayAudit = activeAudit ?? (showInput ? null : latestAudit);

    // Derive phase from display audit
    const phase: 'idle' | 'scanning' | 'done' | 'error' = (() => {
        if (errorMsg) return 'error';
        if (isSubmitting) return 'scanning';
        if (!displayAudit) return 'idle';
        if (displayAudit.status === 'pending' || displayAudit.status === 'fetching' || displayAudit.status === 'analyzing') return 'scanning';
        if (displayAudit.status === 'completed') return 'done';
        if (displayAudit.status === 'failed') return 'error';
        return 'idle';
    })();

    // Map findings from the display audit
    const findings: Finding[] = (displayAudit?.findings || []).map(mapFinding);

    // On mount: if there's a recent completed/failed audit, show it immediately
    useEffect(() => {
        if (latestAudit && !auditId && showInput) {
            if (latestAudit.status === 'completed' || latestAudit.status === 'failed') {
                setShowInput(false); // Show results view
                if (latestAudit.status === 'failed') {
                    setErrorMsg(latestAudit.error || 'Previous audit failed');
                }
            } else if (latestAudit.status === 'pending' || latestAudit.status === 'fetching' || latestAudit.status === 'analyzing') {
                // Resume watching an in-progress scan
                setAuditId(latestAudit._id);
                setShowInput(false);
                setIsSubmitting(true);
                runTerminalAnimation(latestAudit.repoUrl);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestAudit?._id]);

    // React to status changes on active audit
    useEffect(() => {
        if (!activeAudit || !isSubmitting) return;

        if (activeAudit.status === 'completed') {
            const count = (activeAudit.findings || []).length;
            const fileCount = activeAudit.filesAnalyzed?.length || 0;
            setTerminalLines((prev) => [
                ...prev,
                `> scan complete -- ${count} findings across ${fileCount} files`,
                `> generating remediation report ...`,
                `  done`,
            ]);
            setIsSubmitting(false);
            setShowInput(false);
        }

        if (activeAudit.status === 'failed') {
            setErrorMsg(activeAudit.error || 'Audit failed');
            setTerminalLines((prev) => [
                ...prev,
                `> error: ${activeAudit.error || 'Unknown failure'}`,
                `> audit FAILED`,
            ]);
            setIsSubmitting(false);
        }
    }, [activeAudit?.status, isSubmitting]);

    // Toast on completion (fire once per audit)
    useEffect(() => {
        if (!displayAudit) return;
        const id = displayAudit._id;
        if (displayAudit.status === 'completed' && toastFiredRef.current !== id) {
            toastFiredRef.current = id;
            const count = (displayAudit.findings || []).length;
            toast({
                title: count > 0
                    ? `Audit Complete: ${count} Vulnerabilit${count === 1 ? 'y' : 'ies'} Found`
                    : 'Audit Complete: Code is Clean!',
                description: count > 0
                    ? 'Review the findings below for remediation steps.'
                    : 'No security issues detected in this repository.',
            });
        }
    }, [displayAudit?.status, displayAudit?._id, toast]);

    // Clean up timers on unmount
    useEffect(() => {
        return () => timeoutsRef.current.forEach(clearTimeout);
    }, []);

    // Kick off the terminal animation
    const runTerminalAnimation = useCallback((url: string) => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        setTerminalLines([]);

        const lines = buildTerminalLines(url);
        let cumulativeDelay = 0;

        lines.forEach((item) => {
            cumulativeDelay += item.delay;
            const id = setTimeout(() => {
                setTerminalLines((prev) => [...prev, item.text]);
            }, cumulativeDelay);
            timeoutsRef.current.push(id);
        });
    }, []);

    const startScan = useCallback(async () => {
        const url = repoUrl.trim();
        if (!url) return;

        setIsSubmitting(true);
        setErrorMsg('');
        setAuditId(null);
        setShowInput(false);
        toastFiredRef.current = null;

        runTerminalAnimation(url);

        try {
            const id = await createAudit({ repoUrl: url });
            setAuditId(id);

            const endpoint = `${BACKEND_URL}/api/audit/start`;
            const payload = { auditId: id, repoUrl: url };
            console.log('[CodeAudit] Sending request to:', endpoint, payload);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setErrorMsg(msg);
            setTerminalLines((prev) => [...prev, `> error: ${msg}`, `> audit FAILED`]);
            setIsSubmitting(false);
        }
    }, [repoUrl, createAudit, runTerminalAnimation]);

    const handleNewScan = useCallback(() => {
        setShowInput(true);
        setAuditId(null);
        setErrorMsg('');
        setTerminalLines([]);
        setIsSubmitting(false);
        setRepoUrl('');
        setChatInput('');
        setChatReply('');
        setIsChatting(false);
        toastFiredRef.current = null;
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    }, []);

    const handleAskAI = useCallback(async () => {
        const msg = chatInput.trim();
        if (!msg || isChatting) return;

        const rawFindings = displayAudit?.findings || [];

        setIsChatting(true);
        setChatReply('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/audit/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ findings: rawFindings, userMessage: msg }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(errBody.error || `Request failed with status ${res.status}`);
            }

            const data = await res.json();
            setChatReply(data.reply || 'No response generated.');

            // Auto-scroll to the response
            setTimeout(() => {
                chatOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } catch (err) {
            console.error('[CodeAudit] Chat error:', err);
            setChatReply(`Error: ${err instanceof Error ? err.message : 'Failed to reach AI consultant'}`);
        } finally {
            setIsChatting(false);
        }
    }, [chatInput, isChatting, displayAudit?.findings]);

    // Severity summary counts
    const severityCounts = findings.reduce(
        (acc, f) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1;
            return acc;
        },
        {} as Record<Severity, number>,
    );

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            {/* -- Header with New Scan button -- */}
            <div className="text-center space-y-3 relative">
                <h1 className="text-3xl sm:text-4xl font-heading font-bold text-zinc-100 tracking-tight">
                    CODE <span className={isCyber ? 'text-cyan-400' : 'text-green-400'}>AUDIT</span>
                </h1>

                {/* Show "NEW SCAN" button whenever viewing logs/results/errors */}
                {!showInput && (
                    <Button
                        onClick={handleNewScan}
                        variant="outline"
                        className={`absolute right-0 top-0 border-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs tracking-wider ${isCyber ? 'hover:border-cyan-500/40' : 'hover:border-green-500/40'}`}
                    >
                        + NEW SCAN
                    </Button>
                )}

                <p className="text-zinc-500 text-sm max-w-lg mx-auto">
                    {showInput
                        ? 'Paste a public GitHub repository URL below. Mikky-OS will fetch, scan, and surface vulnerabilities with AI-powered remediation.'
                        : displayAudit?.repoUrl
                            ? `Results for ${displayAudit.repoUrl}`
                            : 'Viewing previous scan results.'
                    }
                </p>
            </div>

            {/* -- Input Section (only when starting a new scan) -- */}
            {showInput && (
                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto animate-in fade-in duration-300">
                    <div className="relative flex-1">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startScan()}
                            placeholder="https://github.com/owner/repo"
                            disabled={isSubmitting}
                            className={`pl-10 h-11 bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 font-mono text-sm ${isCyber ? 'focus:ring-cyan-500/30 focus:border-cyan-500/50' : 'focus:ring-green-500/30 focus:border-green-500/50'}`}
                        />
                    </div>
                    <Button
                        onClick={startScan}
                        disabled={isSubmitting || !repoUrl.trim()}
                        className={`h-11 px-6 text-zinc-950 font-bold tracking-wider text-sm transition-all duration-200 disabled:opacity-50 disabled:shadow-none ${isCyber ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]' : 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                SCANNING...
                            </>
                        ) : (
                            'SCAN SOURCE CODE'
                        )}
                    </Button>
                </div>
            )}

            {/* -- Hacker Terminal (during scanning) -- */}
            {phase === 'scanning' && terminalLines.length > 0 && (
                <HackerTerminal lines={terminalLines} isRunning isCyber={isCyber} />
            )}

            {/* -- Error State -- */}
            {phase === 'error' && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-6 text-center animate-in fade-in duration-300">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-400" />
                    <p className="text-red-400 text-sm font-mono mb-1">AUDIT FAILED</p>
                    <p className="text-zinc-500 text-xs font-mono">{errorMsg}</p>
                    <Button
                        onClick={handleNewScan}
                        variant="outline"
                        className="mt-4 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    >
                        Try Again
                    </Button>
                </div>
            )}

            {/* -- Results Dashboard -- */}
            {phase === 'done' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    {/* Summary bar */}
                    <div className="flex flex-wrap items-center gap-3 px-1">
                        <h2 className="text-lg font-bold text-zinc-100 tracking-tight mr-auto">
                            SCAN RESULTS
                        </h2>
                        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]).map((s) =>
                            severityCounts[s] ? (
                                <div key={s} className="flex items-center gap-1.5">
                                    <SeverityBadge severity={s} />
                                    <span className="text-zinc-500 text-xs font-mono">
                                        x{severityCounts[s]}
                                    </span>
                                </div>
                            ) : null,
                        )}
                    </div>

                    {/* Findings list */}
                    {findings.length > 0 ? (
                        <div className="space-y-2">
                            {findings.map((f) => (
                                <FindingCard key={f.id} finding={f} />
                            ))}
                        </div>
                    ) : (
                        /* Clean scan celebration */
                        <div className="text-center py-12 animate-in zoom-in-50 duration-500">
                            <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full mb-4 ${isCyber ? 'bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.2)]' : 'bg-green-500/10 shadow-[0_0_40px_rgba(34,197,94,0.2)]'}`}>
                                <ShieldCheck className={`h-10 w-10 ${isCyber ? 'text-cyan-400' : 'text-green-400'}`} />
                            </div>
                            <h3 className={`text-xl font-bold tracking-tight mb-1 ${isCyber ? 'text-cyan-400' : 'text-green-400'}`}>
                                ALL CLEAR
                            </h3>
                            <p className="text-zinc-500 text-sm">
                                No vulnerabilities found. The code looks clean.
                            </p>
                        </div>
                    )}

                    {/* -- AI Security Consultant Chat -- */}
                    {findings.length > 0 && (
                        <div className={`mt-8 rounded-xl border bg-zinc-950/60 overflow-hidden ${isCyber ? 'border-cyan-500/20' : 'border-green-500/20'}`}>
                            {/* Header */}
                            <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${isCyber ? 'border-cyan-500/15 bg-cyan-500/5' : 'border-green-500/15 bg-green-500/5'}`}>
                                <Sparkles className={`h-4 w-4 ${isCyber ? 'text-cyan-400' : 'text-green-400'}`} />
                                <h3 className="text-sm font-bold tracking-wider text-zinc-200">AI SECURITY CONSULTANT</h3>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-zinc-500 text-xs">
                                    Ask questions about the findings above — get remediation guidance, code fixes, and impact analysis.
                                </p>

                                {/* Input row */}
                                <div className="flex gap-2">
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAskAI();
                                            }
                                        }}
                                        placeholder="e.g. How do I fix the SQL injection in auth.ts?"
                                        disabled={isChatting}
                                        rows={2}
                                        className={`flex-1 resize-none rounded-lg border bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 font-mono focus:outline-none transition-colors ${isCyber ? 'border-zinc-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20' : 'border-zinc-700 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20'}`}
                                    />
                                    <Button
                                        onClick={handleAskAI}
                                        disabled={isChatting || !chatInput.trim()}
                                        className={`h-auto px-4 text-zinc-950 font-bold text-xs tracking-wider self-end disabled:opacity-40 ${isCyber ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-green-500 hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'}`}
                                    >
                                        {isChatting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <><Send className="h-3.5 w-3.5 mr-1.5" /> ASK AI</>
                                        )}
                                    </Button>
                                </div>

                                {/* Thinking animation */}
                                {isChatting && (
                                    <div className="flex items-center gap-2 py-3">
                                        <div className="flex gap-1">
                                            <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${isCyber ? 'bg-cyan-400' : 'bg-green-400'}`} style={{ animationDelay: '0ms' }} />
                                            <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${isCyber ? 'bg-cyan-400' : 'bg-green-400'}`} style={{ animationDelay: '150ms' }} />
                                            <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${isCyber ? 'bg-cyan-400' : 'bg-green-400'}`} style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-zinc-500 text-xs font-mono">Analyzing findings...</span>
                                    </div>
                                )}

                                {/* AI Response */}
                                {chatReply && (
                                    <div
                                        ref={chatOutputRef}
                                        className={`rounded-lg border p-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 animate-in fade-in duration-300 ${isCyber ? 'border-cyan-500/15 bg-cyan-950/20' : 'border-green-500/15 bg-green-950/20'}`}
                                    >
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono leading-relaxed">{chatReply}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* -- Empty state hint (only when no history at all) -- */}
            {phase === 'idle' && showInput && (
                <div className="text-center pt-8 space-y-3 opacity-60">
                    <FileCode2 className="h-12 w-12 mx-auto text-zinc-700" />
                    <p className="text-zinc-600 text-sm">
                        Enter a repository URL above to begin deep-source analysis.
                    </p>
                </div>
            )}
        </div>
    );
}
