/**
 * Features Page - Detailed Feature Breakdown
 * Public page showcasing Mikky OS capabilities
 */

import { Navbar } from '@/components/layout';
import { Link } from 'react-router-dom';
import { SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import {
    Brain,
    Container,
    Activity,
    Shield,
    Zap,
    Code,
    Search,
    FileText,
    Lock,
    Server,
    GitBranch,
    ArrowRight,
} from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: 'DeepSeek R1 Intelligence',
        description: 'State-of-the-art reasoning AI that analyzes vulnerabilities, understands context, and provides actionable remediation strategies.',
        color: 'cyan',
        details: [
            'Context-aware vulnerability analysis',
            'Automated threat intelligence',
            'Natural language security reports',
            'Safety scoring with AI reasoning',
        ],
    },
    {
        icon: Container,
        title: 'Docker Arsenal',
        description: 'Every tool runs in an isolated container. Zero host contamination, perfect repeatability, and enhanced security.',
        color: 'purple',
        details: [
            'Nmap, Subfinder, Nuclei pre-installed',
            'Ephemeral containers per scan',
            'No persistent storage risks',
            'Custom tool integration support',
        ],
    },
    {
        icon: Activity,
        title: 'Real-time Console',
        description: 'Watch your scans execute live. Streaming logs, progress tracking, and instant vulnerability notifications.',
        color: 'pink',
        details: [
            'Live console streaming',
            'Multi-tab log management',
            'Progress visualization',
            'Keyboard shortcuts (Ctrl+J)',
        ],
    },
    {
        icon: Search,
        title: '9-Stage Pipeline',
        description: 'Comprehensive reconnaissance covering every angle—from DNS to vulnerabilities to security headers.',
        color: 'emerald',
        details: [
            'Info Gathering & Live Recon',
            'Port Inspection & Enumeration',
            'Protection Headers Analysis',
            'Tech Detection & Vuln Scanning',
        ],
    },
    {
        icon: Shield,
        title: 'Security Headers Analysis',
        description: 'Automated detection of missing security headers with severity scoring and remediation guidance.',
        color: 'orange',
        details: [
            'CSP, HSTS, X-Frame-Options',
            'Severity-based scoring',
            'Remediation recommendations',
            'Header configuration samples',
        ],
    },
    {
        icon: FileText,
        title: 'AI-Generated Reports',
        description: 'Executive summaries and technical reports written by AI, ready for stakeholders and developers.',
        color: 'blue',
        details: [
            'Executive summary generation',
            'Technical deep-dives',
            'PDF export (coming soon)',
            'Custom report templates',
        ],
    },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    cyan: { bg: 'from-cyan-500 to-cyan-600', border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.2)' },
    purple: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'rgba(168,85,247,0.2)' },
    pink: { bg: 'from-pink-500 to-pink-600', border: 'border-pink-500/50', text: 'text-pink-400', glow: 'rgba(236,72,153,0.2)' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.2)' },
    orange: { bg: 'from-orange-500 to-orange-600', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'rgba(249,115,22,0.2)' },
    blue: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'rgba(59,130,246,0.2)' },
};

export function FeaturesPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-purple-500/10 pointer-events-none" />
                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter mb-6">
                            Complete Security
                            <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                Arsenal
                            </span>
                        </h1>
                        <p className="text-xl text-zinc-400 leading-relaxed">
                            Everything you need to identify, analyze, and remediate security vulnerabilities—powered by AI and orchestrated through Docker.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature) => {
                            const colors = colorMap[feature.color];
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className={`group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:${colors.border} transition-all duration-300`}
                                    style={{ '--glow-color': colors.glow } as React.CSSProperties}
                                >
                                    <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                        <Icon className="h-7 w-7 text-zinc-950" />
                                    </div>
                                    <h3 className={`text-2xl font-heading font-bold mb-3 ${colors.text}`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-zinc-400 leading-relaxed mb-4">
                                        {feature.description}
                                    </p>
                                    <ul className="space-y-2">
                                        {feature.details.map((detail, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-zinc-500">
                                                <Zap className={`h-4 w-4 ${colors.text} mt-0.5 flex-shrink-0`} />
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Technical Specs */}
            <section className="py-20 bg-zinc-900/50">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-heading font-bold mb-4">Technical Specifications</h2>
                        <p className="text-zinc-400 text-lg">Built for security professionals</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50 text-center">
                            <Server className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-zinc-100 mb-1">Docker</div>
                            <div className="text-sm text-zinc-500">Container Runtime</div>
                        </div>
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50 text-center">
                            <Code className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-zinc-100 mb-1">TypeScript</div>
                            <div className="text-sm text-zinc-500">Type-safe Codebase</div>
                        </div>
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50 text-center">
                            <GitBranch className="h-8 w-8 text-pink-400 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-zinc-100 mb-1">Inngest</div>
                            <div className="text-sm text-zinc-500">Event-driven Pipelines</div>
                        </div>
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50 text-center">
                            <Lock className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-zinc-100 mb-1">Convex</div>
                            <div className="text-sm text-zinc-500">Real-time Database</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20">
                <div className="container mx-auto px-6 max-w-7xl text-center">
                    <h2 className="text-4xl font-heading font-bold mb-4">Ready to Secure Your Assets?</h2>
                    <p className="text-xl text-zinc-400 mb-8">Start scanning for free. No credit card required.</p>
                    <SignUpButton mode="modal">
                        <Button
                            size="lg"
                            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-lg px-8 py-6 shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                        >
                            Get Started Free
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </SignUpButton>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
                <div className="container mx-auto px-6 max-w-7xl text-center text-sm text-zinc-600">
                    <Link to="/" className="text-cyan-400 hover:text-cyan-300">MIKKY OS</Link> © 2026
                </div>
            </footer>
        </div>
    );
}
