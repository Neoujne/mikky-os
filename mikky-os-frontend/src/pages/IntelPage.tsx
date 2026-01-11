/**
 * Intel Page - Intelligence & Reporting
 * View recon data: subdomains, ports, technologies.
 */

import { Link } from 'react-router-dom';
import { Radar, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntelPage() {
    // TODO: Query intelligence data from Convex

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                    Intelligence
                </h1>
                <p className="text-zinc-400 mt-1">
                    Recon data: subdomains, ports, and technology detection.
                </p>
            </div>

            {/* Empty State */}
            <div className="p-12 rounded-lg border border-zinc-800 bg-zinc-900/50 text-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                    <Radar className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-zinc-100 mb-2">
                    No Intelligence Data Yet
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto mb-6">
                    Run your first scan to discover subdomains, open ports, and technologies.
                    All reconnaissance data will appear here.
                </p>
                <Link to="/targets">
                    <Button className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        <Target className="h-4 w-4 mr-2" />
                        Start Scanning
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </Link>
            </div>

            {/* Future Content Placeholder */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="p-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-sm font-mono uppercase text-zinc-500 mb-2">Subdomains</h3>
                    <p className="text-3xl font-bold text-zinc-600">—</p>
                </div>
                <div className="p-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-sm font-mono uppercase text-zinc-500 mb-2">Open Ports</h3>
                    <p className="text-3xl font-bold text-zinc-600">—</p>
                </div>
                <div className="p-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-sm font-mono uppercase text-zinc-500 mb-2">Technologies</h3>
                    <p className="text-3xl font-bold text-zinc-600">—</p>
                </div>
            </div>
        </div>
    );
}
