import { useEffect, useState } from 'react';
import { Shield, Zap, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface VulnMetrics {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

interface VulnAnalyticsHeaderProps {
    metrics: VulnMetrics;
}

function useAnimatedCounter(target: number, duration = 600) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out quart
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            setValue(Math.floor(easeOutQuart * target));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setValue(target);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration]);

    return value;
}

export function VulnAnalyticsHeader({ metrics }: VulnAnalyticsHeaderProps) {
    const animatedTotal = useAnimatedCounter(metrics.total);
    const animatedCritical = useAnimatedCounter(metrics.critical);
    const animatedHigh = useAnimatedCounter(metrics.high);
    const animatedMedium = useAnimatedCounter(metrics.medium);
    const animatedLow = useAnimatedCounter(metrics.low);

    const cards = [
        {
            label: 'TOTAL VULNERABILITIES',
            value: animatedTotal,
            icon: Shield,
            color: 'text-zinc-100',
            bg: 'bg-zinc-900',
            border: 'border-zinc-800',
            shadow: '',
        },
        {
            label: 'CRITICAL',
            value: animatedCritical,
            icon: Zap,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            shadow: 'shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]',
        },
        {
            label: 'HIGH',
            value: animatedHigh,
            icon: AlertTriangle,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
            shadow: 'shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]',
        },
        {
            label: 'MEDIUM',
            value: animatedMedium,
            icon: Info,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            shadow: 'shadow-[0_0_15px_-3px_rgba(234,179,8,0.2)]',
        },
        {
            label: 'LOW',
            value: animatedLow,
            icon: Shield,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            shadow: 'shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
                <Card
                    key={card.label}
                    className={`p-4 ${card.bg} ${card.border} ${card.shadow} transition-all duration-300 hover:scale-[1.02] border`}
                >
                    <div className="flex flex-col justify-between h-full space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-500 tracking-wider font-bold">
                                {card.label}
                            </span>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                        <div className={`text-3xl font-bold font-mono ${card.color}`}>
                            {card.value}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
