/**
 * MIKKY OS - Cron Jobs
 * 
 * Background tasks for system maintenance.
 * - TTL Cleanup: Kill stale Docker containers
 */

import { workerManager } from './docker.js';

// Configuration
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Track session last activity
const sessionActivity: Map<string, number> = new Map();

/**
 * Update the last activity time for a session
 */
export function touchSession(sessionId: string): void {
    sessionActivity.set(sessionId, Date.now());
}

/**
 * Remove a session from activity tracking
 */
export function removeSession(sessionId: string): void {
    sessionActivity.delete(sessionId);
}

/**
 * Get stale sessions (no activity for > TTL)
 */
function getStaleSessionIds(): string[] {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [sessionId, lastActivity] of sessionActivity.entries()) {
        if (now - lastActivity > SESSION_TTL_MS) {
            staleIds.push(sessionId);
        }
    }

    return staleIds;
}

/**
 * Clean up stale Docker containers
 */
async function cleanupStaleSessions(): Promise<void> {
    const staleIds = getStaleSessionIds();

    if (staleIds.length === 0) {
        return;
    }

    console.log(`[CRON] Found ${staleIds.length} stale session(s). Cleaning up...`);

    for (const sessionId of staleIds) {
        try {
            console.log(`[CRON] Terminating stale session: ${sessionId}`);
            await workerManager.endSession(sessionId);
            removeSession(sessionId);
        } catch (error) {
            console.error(`[CRON] Failed to terminate session ${sessionId}:`, error);
            // Remove from tracking anyway to prevent infinite retry
            removeSession(sessionId);
        }
    }

    console.log(`[CRON] Cleanup complete.`);
}

/**
 * Start the cron scheduler
 */
export function startCronJobs(): void {
    console.log('[CRON] Starting background cleanup job (every 5 minutes)...');

    // Run cleanup every 5 minutes
    setInterval(cleanupStaleSessions, CLEANUP_INTERVAL_MS);

    // Also run once on startup (delayed by 30 seconds)
    setTimeout(cleanupStaleSessions, 30000);
}
