/**
 * Safety Score Rendering Helper
 *
 * Single source of truth for how safety scores are displayed across
 * Dashboard, Operations, and Targets pages.
 */

export interface SafetyScoreResult {
    text: string;
    className: string;
}

export function renderSafetyScore(
    status: string,
    score?: number | null
): SafetyScoreResult {
    // Failed scan -> N/A in red
    if (status === 'failed') {
        return { text: 'N/A', className: 'text-red-500 font-bold' };
    }

    // Cancelled/stopped scan -> placeholder in gray
    if (status === 'cancelled' || status === 'stopped') {
        return { text: '--', className: 'text-zinc-500' };
    }

    // Queued/scanning -> pending indicator
    if (status === 'queued' || status === 'scanning') {
        return { text: '...', className: 'text-zinc-500 animate-pulse' };
    }

    // Completed/idle -> trust backend safetyScore directly
    if (score == null) {
        return { text: '--', className: 'text-zinc-500' };
    }

    const s = Math.max(0, Math.min(100, Math.round(score)));

    // 90-100: Secure (Green), 70-89: Medium Risk (Yellow), <70: Critical (Red)
    if (s >= 90) {
        return { text: `${s}`, className: 'text-emerald-400 font-bold' };
    }
    if (s >= 70) {
        return { text: `${s}`, className: 'text-amber-400 font-bold' };
    }
    return { text: `${s}`, className: 'text-red-400 font-bold' };
}

/**
 * Get the safety badge color for score pills/badges.
 */
export function getSafetyBadgeColor(score?: number | null): string {
    if (score == null) return 'bg-zinc-700 text-zinc-400';
    if (score >= 90) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (score >= 70) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
}
