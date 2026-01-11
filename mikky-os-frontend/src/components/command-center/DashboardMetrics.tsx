import { cn } from '@/lib/utils';
import { ShieldAlert, Crosshair, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Metrics } from '@/types/command-center';

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'cyan' | 'emerald' | 'rose';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
    const colorStyles = {
        cyan: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/10',
        emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/10',
        rose: 'text-rose-400 border-rose-500/20 bg-rose-950/10',
    };

    return (
        <Card
            className={cn(
                'bg-zinc-900/50 backdrop-blur border-l-4 transition-all duration-300 hover:bg-zinc-900/80 group',
                color === 'cyan' && 'border-l-cyan-500 border-y-zinc-800 border-r-zinc-800',
                color === 'emerald' && 'border-l-emerald-500 border-y-zinc-800 border-r-zinc-800',
                color === 'rose' && 'border-l-rose-500 border-y-zinc-800 border-r-zinc-800'
            )}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{title}</span>
                    <div className={cn('p-2 rounded-full', colorStyles[color])}>{icon}</div>
                </div>
                <div className="flex items-end gap-2">
                    <span
                        className={cn(
                            'text-4xl font-bold font-heading tracking-tighter',
                            color === 'cyan' && 'text-cyan-50',
                            color === 'emerald' && 'text-emerald-50',
                            color === 'rose' && 'text-rose-50'
                        )}
                    >
                        {value}
                    </span>
                    <span className="text-xs text-zinc-500 mb-1.5 font-mono">+0%</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardMetrics({ metrics }: { metrics: Metrics }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in duration-500">
            <MetricCard
                title="TOTAL TARGETS"
                value={metrics.totalTargets}
                icon={<Crosshair className="h-5 w-5" />}
                color="cyan"
            />
            <MetricCard
                title="ACTIVE OPS"
                value={metrics.activeScans}
                icon={<Activity className="h-5 w-5" />}
                color="emerald"
            />
            <MetricCard
                title="CRITICAL VULNS"
                value={metrics.criticalVulns}
                icon={<ShieldAlert className="h-5 w-5" />}
                color="rose"
            />
        </div>
    );
}
