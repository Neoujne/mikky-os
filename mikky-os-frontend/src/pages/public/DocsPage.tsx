/**
 * Docs Page - Documentation Layout
 * Simple documentation page with sidebar and content area
 */

import { Navbar } from '@/components/layout';
import { useState } from 'react';
import { Book, Rocket, Settings, Code, HelpCircle, ChevronRight } from 'lucide-react';

const docsSections = [
    { id: 'getting-started', label: 'Getting Started', icon: Rocket },
    { id: 'installation', label: 'Installation', icon: Settings },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'api-reference', label: 'API Reference', icon: Code },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

const docsContent: Record<string, { title: string; content: React.ReactNode }> = {
    'getting-started': {
        title: 'Getting Started',
        content: (
            <>
                <p className="text-zinc-400 mb-6">
                    Welcome to Mikky OS! This guide will help you get up and running with your first security scan in minutes.
                </p>
                <h3 className="text-xl font-bold text-zinc-100 mt-8 mb-4">Prerequisites</h3>
                <ul className="list-disc list-inside space-y-2 text-zinc-400">
                    <li>A modern web browser (Chrome, Firefox, Safari, Edge)</li>
                    <li>A Mikky OS account (free tier available)</li>
                    <li>A target domain you have permission to scan</li>
                </ul>
                <h3 className="text-xl font-bold text-zinc-100 mt-8 mb-4">Quick Start</h3>
                <ol className="list-decimal list-inside space-y-4 text-zinc-400">
                    <li><span className="text-zinc-300 font-medium">Sign up</span> - Create your free account</li>
                    <li><span className="text-zinc-300 font-medium">Add a target</span> - Enter your domain in the Targets page</li>
                    <li><span className="text-zinc-300 font-medium">Click ENGAGE</span> - Start the 9-stage scanning pipeline</li>
                    <li><span className="text-zinc-300 font-medium">View results</span> - Check Intelligence and Vulnerabilities pages</li>
                </ol>
                <div className="mt-8 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <p className="text-cyan-400 text-sm font-mono">
                        💡 Pro tip: Use keyboard shortcut <code className="bg-zinc-800 px-2 py-0.5 rounded">Ctrl+J</code> to toggle the system console.
                    </p>
                </div>
            </>
        ),
    },
    installation: {
        title: 'Installation',
        content: (
            <>
                <p className="text-zinc-400 mb-6">
                    Mikky OS is a cloud-based platform—no installation required! Simply sign up and start scanning.
                </p>
                <h3 className="text-xl font-bold text-zinc-100 mt-8 mb-4">Self-Hosted Option</h3>
                <p className="text-zinc-400 mb-4">
                    For enterprise customers who require on-premise deployment, we offer a self-hosted version:
                </p>
                <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                    <code className="text-sm text-cyan-400 font-mono">
                        {`# Clone the repository
git clone https://github.com/mikky-os/mikky-os.git

# Install dependencies
cd mikky-os && npm install

# Configure environment
cp .env.example .env.local

# Start the services
docker-compose up -d`}
                    </code>
                </pre>
                <p className="text-zinc-500 text-sm mt-4">
                    Contact sales@mikky-os.io for enterprise licensing and support.
                </p>
            </>
        ),
    },
    configuration: {
        title: 'Configuration',
        content: (
            <>
                <p className="text-zinc-400 mb-6">
                    Configure Mikky OS to match your security workflow.
                </p>
                <h3 className="text-xl font-bold text-zinc-100 mt-8 mb-4">Settings</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-800 text-left">
                            <th className="py-3 text-zinc-400 font-mono">Setting</th>
                            <th className="py-3 text-zinc-400 font-mono">Description</th>
                        </tr>
                    </thead>
                    <tbody className="text-zinc-400">
                        <tr className="border-b border-zinc-800/50">
                            <td className="py-3 font-mono text-cyan-400">OpenRouter API Key</td>
                            <td className="py-3">Required for AI-powered analysis. Get yours at openrouter.ai</td>
                        </tr>
                        <tr className="border-b border-zinc-800/50">
                            <td className="py-3 font-mono text-cyan-400">Docker Strict Mode</td>
                            <td className="py-3">Enable enhanced container security for production</td>
                        </tr>
                    </tbody>
                </table>
            </>
        ),
    },
    'api-reference': {
        title: 'API Reference',
        content: (
            <>
                <p className="text-zinc-400 mb-6">
                    Integrate Mikky OS into your security pipeline with our API.
                </p>
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 mb-6">
                    <p className="text-orange-400 text-sm font-mono">
                        ⚠️ API access is available on the Elite plan only.
                    </p>
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mt-8 mb-4">Endpoints</h3>
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono">GET</span>
                            <code className="text-zinc-300 font-mono">/api/targets</code>
                        </div>
                        <p className="text-zinc-500 text-sm">List all targets for the authenticated user</p>
                    </div>
                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-mono">POST</span>
                            <code className="text-zinc-300 font-mono">/api/scan/start</code>
                        </div>
                        <p className="text-zinc-500 text-sm">Initiate a new scan for a target</p>
                    </div>
                </div>
            </>
        ),
    },
    faq: {
        title: 'Frequently Asked Questions',
        content: (
            <>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-lg font-bold text-zinc-100 mb-2">What domains can I scan?</h4>
                        <p className="text-zinc-400">You must have explicit permission to scan any target domain. Scanning without permission is illegal and against our terms of service.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-zinc-100 mb-2">How long does a scan take?</h4>
                        <p className="text-zinc-400">Scan duration varies based on target complexity. A typical scan completes in 5-15 minutes.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-zinc-100 mb-2">Is my data secure?</h4>
                        <p className="text-zinc-400">Absolutely. All data is encrypted in transit and at rest. Scan results are private and only accessible to you.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-zinc-100 mb-2">Can I use my own OpenRouter API key?</h4>
                        <p className="text-zinc-400">Yes! Configure your own API key in Settings to use your OpenRouter credits for AI analysis.</p>
                    </div>
                </div>
            </>
        ),
    },
};

export function DocsPage() {
    const [activeSection, setActiveSection] = useState('getting-started');
    const content = docsContent[activeSection];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Navbar />

            <div className="pt-20 flex">
                {/* Sidebar */}
                <aside className="hidden md:block w-64 border-r border-zinc-800 min-h-screen sticky top-20">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Book className="h-5 w-5 text-cyan-400" />
                            <span className="font-heading font-bold text-lg">Documentation</span>
                        </div>
                        <nav className="space-y-1">
                            {docsSections.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${isActive
                                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-sm font-medium">{section.label}</span>
                                        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Mobile Section Selector */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 border-t border-zinc-800 p-4 z-40 backdrop-blur-md">
                    <select
                        value={activeSection}
                        onChange={(e) => setActiveSection(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100"
                    >
                        {docsSections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Content */}
                <main className="flex-1 p-6 md:p-12 pb-24 md:pb-12">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl font-heading font-bold mb-8">{content.title}</h1>
                        <div className="prose prose-invert max-w-none">
                            {content.content}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
