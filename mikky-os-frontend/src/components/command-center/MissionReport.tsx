/**
 * MissionReport - AI-Generated Security Report Modal
 * Displays scan findings in a polished cyberpunk-styled modal with Markdown rendering
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Shield, Copy, Check } from 'lucide-react';

interface MissionReportProps {
    summary: string;
    safetyScore: number; // 0-100 where 100 = Safe, 0 = Critical
    targetDomain: string;
    remediationPrompt?: string; // Optional explicit remediation prompt
    isComplete?: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Safety level indicator: 0-49 Critical, 50-79 Warning, 80-100 Safe
function getSafetyLevel(score: number): { level: string; emoji: string; color: string } {
    if (score >= 80) return { level: 'SAFE', emoji: '🟢', color: 'text-emerald-500' };
    if (score >= 50) return { level: 'WARNING', emoji: '🟡', color: 'text-amber-500' };
    return { level: 'CRITICAL', emoji: '🔴', color: 'text-rose-500' };
}

// Custom Markdown components with cyberpunk styling
const markdownComponents = {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="text-2xl font-bold font-heading text-cyan-400 mb-4 border-b border-cyan-500/30 pb-2" {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="text-lg font-bold font-heading text-cyan-300 mt-6 mb-3 flex items-center gap-2" {...props}>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className="text-md font-semibold text-zinc-200 mt-4 mb-2" {...props}>
            {children}
        </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="text-zinc-300 mb-4 leading-relaxed" {...props}>
            {children}
        </p>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <strong className="text-cyan-400 font-bold" {...props}>
            {children}
        </strong>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-1 ml-2" {...props}>
            {children}
        </ul>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="text-zinc-300 marker:text-cyan-400" {...props}>
            {children}
        </li>
    ),
    hr: () => (
        <hr className="border-zinc-800 my-6" />
    ),
    table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto mb-4">
            <table className="w-full border border-zinc-800 text-sm" {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead className="bg-zinc-900/80 border-b border-zinc-700" {...props}>
            {children}
        </thead>
    ),
    th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <th className="px-4 py-2 text-left text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider" {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <td className="px-4 py-2 text-zinc-300 border-b border-zinc-800" {...props}>
            {children}
        </td>
    ),
    code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <code className="bg-zinc-800 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
        </code>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <em className="text-zinc-500 not-italic text-sm" {...props}>
            {children}
        </em>
    ),
};

export function MissionReport({ summary, safetyScore, targetDomain, remediationPrompt, isComplete = true, open, onOpenChange }: MissionReportProps) {
    const safety = getSafetyLevel(safetyScore);
    const [copied, setCopied] = useState(false);

    if (!isComplete || !summary) {
        return null;
    }

    // Use explicit remediationPrompt if provided, otherwise try to extract from summary
    let vibePrompt = remediationPrompt || null;
    if (!vibePrompt) {
        // Case-insensitive match for markdown code block after "Vibe Coder Prompt" header
        const vibePromptMatch = summary.match(/##\s*Vibe Coder Prompt[\s\S]*?```(?:markdown)?([\s\S]*?)```/i);
        vibePrompt = vibePromptMatch ? vibePromptMatch[1].trim() : null;
    }

    const handleCopyPrompt = async () => {
        if (vibePrompt) {
            await navigator.clipboard.writeText(vibePrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[90vw] max-w-2xl bg-zinc-950 border-l border-zinc-800 p-0">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className={cn("h-6 w-6", safety.color)} />
                            <div>
                                <h2 className="text-lg font-bold font-heading text-zinc-100 tracking-tight">
                                    MISSION DEBRIEF
                                </h2>
                                <p className="text-xs text-zinc-500 font-mono">{targetDomain}</p>
                            </div>
                        </div>
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-sm font-bold",
                            "bg-zinc-900 border",
                            safetyScore >= 80 ? "border-emerald-500/30 text-emerald-400" :
                                safetyScore >= 50 ? "border-amber-500/30 text-amber-400" :
                                    "border-rose-500/30 text-rose-400"
                        )}>
                            {safety.emoji} SAFETY: {safetyScore}
                        </div>
                    </div>
                </div>

                {/* Report Content - Force LTR/text-left */}
                <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-6 text-left" dir="ltr">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                        >
                            {summary}
                        </ReactMarkdown>

                        {/* Vibe Coder Prompt Remediation Box */}
                        {vibePrompt && (
                            <div className="mt-8 rounded-lg border border-cyan-900/50 bg-zinc-900 overflow-hidden shadow-lg shadow-cyan-900/10">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-800/50">
                                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Vibe Coder Prompt</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-zinc-400 hover:text-cyan-400 gap-1.5"
                                        onClick={handleCopyPrompt}
                                    >
                                        {copied ? (
                                            <><Check className="h-3 w-3" /> Copied!</>
                                        ) : (
                                            <><Copy className="h-3 w-3" /> Copy</>)}
                                    </Button>
                                </div>
                                <pre className="p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                                    {vibePrompt}
                                </pre>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

// Export for index barrel
export default MissionReport;
