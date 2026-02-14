/**
 * Docs Page - Documentation Layout
 * High-fidelity Cyberpunk documentation interface
 */

import { Navbar } from '@/components/layout';
import { useState } from 'react';
import {
    Book, Rocket, Settings, Code, HelpCircle, ChevronRight,
    Shield, Zap, Cpu, Network, Bot, Container, Terminal,
    Layers, Activity, FileCode2, MessageSquare, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const docsSections = [
    { id: 'intro', label: 'Introduction', icon: Shield },
    { id: 'quickstart', label: 'Quick Start', icon: Zap },
    { id: 'features', label: 'Features', icon: Cpu },
    { id: 'architecture', label: 'Architecture', icon: Network },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'docker', label: 'Docker Armory', icon: Container },
];

const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => (
    <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-xs md:text-sm my-4 group">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <span className="text-zinc-500">{language}</span>
        </div>
        <div className="p-4 overflow-x-auto">
            <pre className="text-zinc-300">
                <code>{code}</code>
            </pre>
        </div>
    </div>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-cyan-500/30 transition-all hover:bg-zinc-900/60 group">
        <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="h-5 w-5 text-cyan-400" />
        </div>
        <h4 className="text-lg font-bold text-zinc-100 mb-2">{title}</h4>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
);

const docsContent: Record<string, { title: string; content: React.ReactNode }> = {
    intro: {
        title: 'Introduction',
        content: (
            <div className="space-y-6">
                <p className="text-xl text-zinc-300 leading-relaxed font-light">
                    Welcome to <span className="text-cyan-400 font-bold">MIKKY OS</span>, the autonomous offensive security operations center.
                </p>
                <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-950/30 to-purple-950/30 border border-cyan-500/20 backdrop-blur-sm">
                    <p className="text-lg text-zinc-200 italic border-l-4 border-cyan-500 pl-4">
                        "The Matrix has you... unless you hack it first."
                    </p>
                </div>
                <p className="text-zinc-400">
                    Mikky OS combines agentic AI workflows with a secure Docker execution environment to automate reconnaissance, vulnerability scanning, and source code analysis.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <Shield className="h-5 w-5 text-green-400" />
                        <span className="text-zinc-300">Offensive Security Operations</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <Brain className="h-5 w-5 text-purple-400" />
                        <span className="text-zinc-300">DeepSeek R1 Intelligence</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <Container className="h-5 w-5 text-blue-400" />
                        <span className="text-zinc-300">Docker Content Isolation</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <Activity className="h-5 w-5 text-cyan-400" />
                        <span className="text-zinc-300">Real-time Reconnaissance</span>
                    </div>
                </div>
            </div>
        ),
    },
    quickstart: {
        title: 'Quick Start',
        content: (
            <div className="space-y-8">
                <p className="text-zinc-400">
                    Get Mikky OS up and running in minutes. Follow these commands to initialize the system.
                </p>

                <div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-cyan-400" />
                        1. Clone & Install
                    </h3>
                    <CodeBlock code={`git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
npm install`} />
                </div>

                <div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-400" />
                        2. Configure Environment
                    </h3>
                    <p className="text-zinc-400 text-sm mb-2">Copy the example config and add your API keys.</p>
                    <CodeBlock code={`cp .env.example .env`} />
                    <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-500/80">
                        <strong>Required Keys:</strong> OPENROUTER_API_KEY, CONVEX_URL, CLERK_PUBLISHABLE_KEY.
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-green-400" />
                        3. Launch System
                    </h3>
                    <CodeBlock code={`npm run dev:all`} />
                </div>
            </div>
        ),
    },
    features: {
        title: 'System Capabilities',
        content: (
            <div className="space-y-8">
                <p className="text-zinc-400">
                    Mikky OS provides a comprehensive suite of offensive security tools powered by AI.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FeatureCard
                        icon={Network}
                        title="Network Recon"
                        description="Active monitoring engine utilizing Nmap, Masscan, and Subfinder to map attack surfaces in real-time."
                    />
                    <FeatureCard
                        icon={Activity}
                        title="Vulnerability Lab"
                        description="Integrated Nuclei engine for detecting CVEs, misconfigurations, and exposed administrative panels."
                    />
                    <FeatureCard
                        icon={FileCode2}
                        title="Source Code Audit"
                        description="AI-driven SAST that pulls GitHub repos, identifies high-risk files, and detects logic vulnerabilities."
                    />
                    <FeatureCard
                        icon={MessageSquare}
                        title="AI Consultant"
                        description="Interactive remediation chat. Ask the AI how to fix specific findings and get code patches."
                    />
                </div>
            </div>
        ),
    },
    architecture: {
        title: 'System Architecture',
        content: (
            <div className="space-y-6">
                <p className="text-zinc-400">
                    Event-Driven Architecture powered by <strong className="text-zinc-200">Inngest</strong> for reliable orchestration and <strong className="text-zinc-200">Convex</strong> for real-time state sync.
                </p>

                <div className="p-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-8 w-full max-w-lg">
                        <div className="flex items-center justify-between w-full">
                            <div className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm font-mono">Frontend UI</div>
                            <div className="h-px bg-zinc-700 flex-1 mx-4 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs bg-zinc-900 px-2 text-zinc-500">Stream</div>
                            </div>
                            <div className="px-4 py-2 rounded bg-cyan-950/50 border border-cyan-500/50 text-cyan-400 text-sm font-mono font-bold">Convex DB</div>
                        </div>

                        <div className="h-8 w-px bg-zinc-700"></div>

                        <div className="px-4 py-2 rounded bg-purple-950/50 border border-purple-500/50 text-purple-400 text-sm font-mono font-bold">Inngest Engine</div>

                        <div className="flex w-full justify-between relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-px bg-zinc-700"></div>
                            <div className="absolute top-4 left-1/4 right-1/4 h-px bg-zinc-700"></div>
                            <div className="absolute top-4 left-1/4 h-4 w-px bg-zinc-700"></div>
                            <div className="absolute top-4 right-1/4 h-4 w-px bg-zinc-700"></div>
                        </div>

                        <div className="flex w-full justify-between pt-4">
                            <div className="flex flex-col items-center">
                                <div className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm font-mono mb-2">Agent 1: Recon</div>
                                <div className="text-xs text-zinc-500">Docker / Nmap</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm font-mono mb-2">Agent 4: Audit</div>
                                <div className="text-xs text-zinc-500">LLM / Analysis</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-zinc-500">
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Convex</strong> acts as the central nervous system, pushing real-time updates to the UI.</li>
                        <li><strong>Inngest</strong> manages long-running workflows and retries.</li>
                        <li><strong>Agents</strong> execute independently using Tools (Docker, LLMs).</li>
                    </ul>
                </div>
            </div>
        ),
    },
    agents: {
        title: 'AI Agents',
        content: (
            <div className="space-y-6">
                <p className="text-zinc-400">
                    Mikky OS employs specialized autonomous agents for different stages of the kill chain.
                </p>

                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <span className="font-mono font-bold text-orange-400">01</span>
                            </div>
                            <h3 className="font-bold text-zinc-200">Reconnaissance Agent</h3>
                        </div>
                        <p className="text-sm text-zinc-400 ml-11">
                            Responsible for mapping the attack surface. Uses <code>subfinder</code> and <code>nmap</code> to discover subdomains, open ports, and services.
                        </p>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                <span className="font-mono font-bold text-cyan-400">04</span>
                            </div>
                            <h3 className="font-bold text-zinc-200">Code Audit Agent</h3>
                        </div>
                        <p className="text-sm text-zinc-400 ml-11">
                            Performs Static Application Security Testing (SAST). Fetches file trees from GitHub, identifies high-risk components, and prompts LLMs for code analysis.
                        </p>
                    </div>
                </div>
            </div>
        ),
    },
    docker: {
        title: 'Docker Armory',
        content: (
            <div className="space-y-6">
                <p className="text-zinc-400">
                    Security tools run in ephemeral, isolated containers to ensure host safety and environment consistency.
                </p>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <h3 className="font-bold text-zinc-200 mb-4">Worker Capabilities</h3>
                    <ul className="grid grid-cols-2 gap-3">
                        {['Nmap & Masscan', 'Nuclei Engine', 'Python Runtime', 'Node.js Runtime', 'Netadmin Privileges', 'Raw Socket Access'].map((item) => (
                            <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                    <p className="text-blue-400 text-sm font-mono">
                        ℹ️ Containers are spawned on-demand and destroyed immediately after task completion.
                    </p>
                </div>
            </div>
        ),
    }
};

export function DocsPage() {
    const [activeSection, setActiveSection] = useState('intro');
    const content = docsContent[activeSection];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
            <Navbar />

            <div className="pt-20 flex max-w-7xl mx-auto">
                {/* Sidebar */}
                <aside className="hidden md:block w-72 border-r border-zinc-800/50 min-h-[calc(100vh-5rem)] sticky top-20">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="h-8 w-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <Book className="h-4 w-4 text-cyan-400" />
                            </div>
                            <span className="font-heading font-bold text-xl tracking-tight">Docs</span>
                        </div>
                        <nav className="space-y-1">
                            {docsSections.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group relative overflow-hidden ${isActive
                                            ? 'bg-zinc-900 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)] border-l-2 border-cyan-500'
                                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
                                            }`}
                                    >
                                        <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                        <span className="text-sm font-medium relative z-10">{section.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-indicator"
                                                className="absolute inset-0 bg-cyan-500/5"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Mobile Section Selector */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 border-t border-zinc-800 p-4 z-40 backdrop-blur-md pb-8">
                    <select
                        value={activeSection}
                        onChange={(e) => setActiveSection(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 text-lg outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                    >
                        {docsSections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Content */}
                <main className="flex-1 p-6 md:p-12 pb-24 md:pb-12 min-w-0">
                    <div className="max-w-4xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center gap-3 mb-8">
                                    <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
                                        {content.title}
                                    </h1>
                                </div>

                                <div className="prose prose-invert prose-zinc max-w-none">
                                    {content.content}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
