/**
 * Landing Page - Public Facade
 * High-converting SaaS landing page for Mikky OS
 */

import { SignUpButton } from '@clerk/clerk-react';
import { Brain, Container, Activity, Check, ArrowRight, FileCode2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout';
import { Link } from 'react-router-dom';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Navigation */}
            <Navbar />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-purple-500/10 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none" />

                <div className="container mx-auto px-6 py-24 md:py-32 lg:py-40 max-w-7xl relative z-10">
                    <div className="text-center max-w-4xl mx-auto space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-mono">
                            <Activity className="h-4 w-4 animate-pulse" />
                            <span>AI-Powered Security Intelligence</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tighter leading-tight">
                            The AI-Powered
                            <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Pentesting OS
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            Autonomous reconnaissance, vulnerability discovery, and intelligent threat analysis—powered by DeepSeek AI and orchestrated through Docker.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <SignUpButton mode="modal">
                                <Button
                                    size="lg"
                                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-lg px-8 py-6 shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all group"
                                >
                                    Initialize System
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </SignUpButton>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-zinc-700 hover:border-cyan-500/50 hover:bg-zinc-900 text-zinc-300 font-semibold text-lg px-8 py-6"
                                onClick={() => {
                                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                            >
                                Learn More
                            </Button>
                        </div>

                        {/* Social Proof */}
                        <p className="text-sm text-zinc-600 font-mono pt-8">
                            Trusted by security researchers • No credit card required
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-zinc-950 relative">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
                            Elite-Grade Arsenal
                        </h2>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                            Military-grade tools meet artificial intelligence
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="h-7 w-7 text-zinc-950" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-3 text-zinc-100">
                                DeepSeek Intelligence
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                AI-powered vulnerability analysis and automated threat intelligence. DeepSeek R1 provides context-aware security insights and actionable remediation strategies.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Container className="h-7 w-7 text-zinc-950" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-3 text-zinc-100">
                                Docker Arsenal
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Isolated execution environments for nmap, subfinder, nuclei, and more. Every tool runs in a secured container with zero host contamination.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-pink-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]">
                            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Activity className="h-7 w-7 text-zinc-950" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-3 text-zinc-100">
                                Real-time Recon
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Live console streaming, real-time progress tracking, and instant vulnerability notifications. Watch your scans execute in a slick terminal interface.
                            </p>
                        </div>
                        {/* Feature 4 - New */}
                        <div className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileCode2 className="h-7 w-7 text-zinc-950" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-3 text-zinc-100">
                                🤖 Source Code Analysis
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Automated SAST engine that pulls GitHub repos, parses file trees, and uses LLMs to identify high-risk vulnerabilities in logic, auth, and config.
                            </p>
                        </div>

                        {/* Feature 5 - New */}
                        <div className="group p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare className="h-7 w-7 text-zinc-950" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-3 text-zinc-100">
                                💬 AI Remediation Chat
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Don't just find bugs—fix them. Chat directly with the AI Security Consultant to get tailored remediation steps and code patches for every finding.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
                            Choose Your Tier
                        </h2>
                        <p className="text-xl text-zinc-400">
                            Start free, scale when you're ready
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Hacker Tier */}
                        <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                            <div className="mb-6">
                                <h3 className="text-2xl font-heading font-bold text-zinc-100 mb-2">
                                    Hacker
                                </h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-cyan-400">$0</span>
                                    <span className="text-zinc-500">/month</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>5 targets maximum</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>Basic vulnerability scanning</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>Real-time console access</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>Community support</span>
                                </li>
                            </ul>

                            <SignUpButton mode="modal">
                                <Button
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-6"
                                >
                                    Get Started
                                </Button>
                            </SignUpButton>
                        </div>

                        {/* Elite Tier */}
                        <div className="p-8 rounded-xl border-2 border-cyan-500/50 bg-zinc-950/80 backdrop-blur-sm relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.3)]">
                            {/* Popular Badge */}
                            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-cyan-500 text-zinc-950 text-xs font-bold uppercase tracking-wider">
                                Popular
                            </div>

                            <div className="mb-6">
                                <h3 className="text-2xl font-heading font-bold text-zinc-100 mb-2">
                                    Elite
                                </h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">$49</span>
                                    <span className="text-zinc-500">/month</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span className="font-semibold">Unlimited targets</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span className="font-semibold">Advanced AI-powered analysis</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>Priority scan queue</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>Detailed PDF reports</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>API access</span>
                                </li>
                                <li className="flex items-start gap-3 text-zinc-300">
                                    <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <span>24/7 priority support</span>
                                </li>
                            </ul>

                            <Link to="/pricing">
                                <Button
                                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-zinc-950 font-bold py-6 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                                >
                                    Start Elite Trial
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 py-12">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="font-heading font-bold text-xl tracking-tighter text-cyan-400">
                            MIKKY OS
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
                            <Link to="/blog" className="hover:text-cyan-400 transition-colors">Blog</Link>
                            <Link to="/docs" className="hover:text-cyan-400 transition-colors">Documentation</Link>
                            <Link to="/features" className="hover:text-cyan-400 transition-colors">Features</Link>
                            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
                            <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
                        </div>

                        <div className="text-sm text-zinc-600 font-mono">
                            © 2026 Mikky OS
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
