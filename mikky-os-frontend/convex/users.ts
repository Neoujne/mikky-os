/**
 * User-related Convex queries.
 *
 * Profile data comes from Clerk (no local `users` table needed).
 * This file provides aggregated stats for the profile dashboard.
 */

import { query } from './_generated/server';

/**
 * Get aggregated stats for the user's profile dashboard.
 */
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { completedScans: 0, targetsMonitored: 0, vulnsDiscovered: 0 };

        // 1. Scans Completed
        const completedScans = await ctx.db
            .query('scanRuns')
            .withIndex('by_status', (q) => q.eq('status', 'completed'))
            .collect();

        // 2. Targets Monitored (Active)
        const targets = await ctx.db
            .query('targets')
            .filter((q) => q.eq(q.field('status'), 'active'))
            .collect();

        // 3. Vulnerabilities Discovered
        const vulnsDiscovered = targets.reduce((sum, t) => sum + (t.totalVulns || 0), 0);

        return {
            completedScans: completedScans.length,
            targetsMonitored: targets.length,
            vulnsDiscovered,
        };
    },
});
