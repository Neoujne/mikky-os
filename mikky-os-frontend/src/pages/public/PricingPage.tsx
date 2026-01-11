/**
 * Pricing Page - Clerk Billing Integration
 * Dedicated pricing page with Clerk PricingTable
 */

import { Navbar } from '@/components/layout';
import { Link } from 'react-router-dom';
import { PricingTable, useAuth, SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function PricingPage() {
    const { isSignedIn } = useAuth();

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-purple-500/10 pointer-events-none" />
                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter mb-4">
                            Choose Your
                            <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                Plan
                            </span>
                        </h1>
                        <p className="text-xl text-zinc-400">
                            Start free, upgrade when you're ready for unlimited power.
                        </p>
                    </div>
                </div>
            </section>

            {/* Clerk PricingTable */}
            <section className="pb-24">
                <div className="container mx-auto px-6 max-w-4xl">
                    {isSignedIn ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
                            <PricingTable />
                        </div>
                    ) : (
                        <div className="text-center p-12 rounded-xl border border-zinc-800 bg-zinc-900/50">
                            <p className="text-zinc-400 mb-6">
                                Sign in to view pricing and manage your subscription
                            </p>
                            <SignUpButton mode="modal">
                                <Button className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                    Get Started
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </SignUpButton>
                        </div>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-zinc-900/30">
                <div className="container mx-auto px-6 max-w-3xl">
                    <h2 className="text-3xl font-heading font-bold text-center mb-12">
                        Pricing FAQ
                    </h2>
                    <div className="space-y-6">
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
                            <h3 className="text-lg font-bold text-zinc-100 mb-2">
                                Can I try before I buy?
                            </h3>
                            <p className="text-zinc-400">
                                Absolutely! The Hacker plan is completely free and includes 5 targets.
                                No credit card required to get started.
                            </p>
                        </div>
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
                            <h3 className="text-lg font-bold text-zinc-100 mb-2">
                                What happens when I upgrade?
                            </h3>
                            <p className="text-zinc-400">
                                Upgrades take effect immediately. You'll get access to unlimited targets,
                                advanced AI analysis, and priority support right away.
                            </p>
                        </div>
                        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
                            <h3 className="text-lg font-bold text-zinc-100 mb-2">
                                Can I cancel anytime?
                            </h3>
                            <p className="text-zinc-400">
                                Yes, you can cancel your subscription at any time.
                                You'll retain access to Elite features until the end of your billing period.
                            </p>
                        </div>
                    </div>
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
