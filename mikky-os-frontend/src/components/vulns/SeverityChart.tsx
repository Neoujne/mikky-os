interface VulnMetrics {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

interface SeverityChartProps {
    metrics: VulnMetrics;
}

export function SeverityChart({ metrics }: SeverityChartProps) {
    const { total, critical, high, medium, low } = metrics;
    const chartTotal = critical + high + medium + low || 1; // Avoid division by zero

    // Calculate circumference and dash arrays
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    const criticalPercent = critical / chartTotal;
    const highPercent = high / chartTotal;
    const mediumPercent = medium / chartTotal;
    const lowPercent = low / chartTotal;

    const criticalDash = criticalPercent * circumference;
    const highDash = highPercent * circumference;
    const mediumDash = mediumPercent * circumference;
    const lowDash = lowPercent * circumference;

    // Calculate offsets (start positions)
    // SVG stroke-dasharray works counter-clockwise from 3 o'clock usually, relying on rotate(-90) to start from top
    // Cumulative offsets:
    const criticalOffset = 0; // Starts at top
    const highOffset = -criticalDash;
    const mediumOffset = -(criticalDash + highDash);
    const lowOffset = -(criticalDash + highDash + mediumDash);

    const segments = [
        { value: critical, dash: criticalDash, offset: criticalOffset, color: '#ef4444', label: 'Critical' },
        { value: high, dash: highDash, offset: highOffset, color: '#f97316', label: 'High' },
        { value: medium, dash: mediumDash, offset: mediumOffset, color: '#eab308', label: 'Medium' },
        { value: low, dash: lowDash, offset: lowOffset, color: '#3b82f6', label: 'Low' },
    ];

    return (
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide mb-6 w-full text-left">
                SEVERITY DISTRIBUTION
            </h3>

            <div className="relative h-48 w-48">
                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    <span className="text-3xl font-bold text-zinc-100 font-mono">{metrics.total}</span>
                    <span className="text-xs text-zinc-500 font-mono uppercase">Issues</span>
                </div>

                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#27272a" // zinc-800
                        strokeWidth="12"
                    />

                    {/* Chart Segments */}
                    {segments.map((segment) => (
                        <circle
                            key={segment.label}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth="12"
                            strokeDasharray={`${segment.dash} ${circumference}`}
                            strokeDashoffset={segment.offset}
                            className="transition-all duration-1000 ease-out hover:opacity-80"
                            style={{ transformOrigin: '50% 50%' }}
                        />
                    ))}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 justify-center">
                {segments.map((segment) => (
                    <div key={segment.label} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                        <span className="text-xs text-zinc-400 font-mono">
                            {segment.label} ({segment.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
