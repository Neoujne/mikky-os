import { query } from './_generated/server';

/**
 * Worker Status - Used by frontend to display Docker worker health
 * For now this is a mock implementation. In production, this would
 * check a heartbeats table or ping the backend directly.
 */
export const getWorkerStatus = query({
    args: {},
    handler: async (ctx) => {
        // TODO: In production, check a heartbeats table or external health endpoint
        // For now, return a mock "online" status

        // Check if there are any active scans (indicates worker is processing)
        const activeScans = await ctx.db
            .query('scanRuns')
            .withIndex('by_status', (q) => q.eq('status', 'scanning'))
            .take(1);

        const isProcessing = activeScans.length > 0;

        return {
            status: 'online' as const,
            isProcessing,
            lastHeartbeat: Date.now(),
            message: isProcessing ? 'Processing scans...' : 'Ready',
        };
    },
});
