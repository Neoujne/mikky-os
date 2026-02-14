/**
 * System Status API - Real-time health monitoring for worker nodes
 * Implements the "True Sight" feature for Milestone 30
 */

import { query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Backend URL for health checks
const BACKEND_URL = (process.env.MIKKY_BACKEND_URL || "http://localhost:5000");

/**
 * Get the current worker status
 * Returns the latest health check result
 */
export const getWorkerStatus = query({
    args: {},
    handler: async (ctx) => {
        const status = await ctx.db
            .query("system_status")
            .withIndex("by_component", (q) => q.eq("component", "worker"))
            .first();

        return status;
    },
});

/**
 * Internal action: Check worker health by calling the Express backend
 * Called by the cron job every minute
 */
export const checkWorkerHealth = internalAction({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();

        try {
            const response = await fetch(`${BACKEND_URL}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-mikky-secret': process.env.MIKKY_SECRET_KEY || 'dev-secret-key',
                },
                // 10 second timeout
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status}`);
            }

            const data = await response.json();

            // Update status in database
            await ctx.runMutation(internal.system.updateWorkerStatus, {
                status: data.status === 'healthy' ? 'operational' : 'degraded',
                metrics: {
                    dockerAvailable: data.dockerAvailable ?? false,
                    imageExists: data.imageExists ?? false,
                    activeContainers: data.activeContainers ?? 0,
                    version: data.version,
                },
                message: undefined,
            });

            console.log(`[HEALTH] Worker status: ${data.status} (${Date.now() - startTime}ms)`);

        } catch (error) {
            console.error('[HEALTH] Health check failed:', error);

            // Mark as down on failure
            await ctx.runMutation(internal.system.updateWorkerStatus, {
                status: 'down',
                metrics: {
                    dockerAvailable: false,
                    imageExists: false,
                    activeContainers: 0,
                    version: undefined,
                },
                message: error instanceof Error ? error.message : 'Connection failed',
            });
        }
    },
});

/**
 * Internal mutation: Update worker status in the database
 */
export const updateWorkerStatus = internalMutation({
    args: {
        status: v.union(
            v.literal('operational'),
            v.literal('degraded'),
            v.literal('down')
        ),
        metrics: v.object({
            dockerAvailable: v.boolean(),
            imageExists: v.boolean(),
            activeContainers: v.number(),
            version: v.optional(v.string()),
        }),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Find existing status document
        const existing = await ctx.db
            .query("system_status")
            .withIndex("by_component", (q) => q.eq("component", "worker"))
            .first();

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                status: args.status,
                metrics: args.metrics,
                lastChecked: Date.now(),
                message: args.message,
            });
        } else {
            // Create new
            await ctx.db.insert("system_status", {
                component: "worker",
                status: args.status,
                metrics: args.metrics,
                lastChecked: Date.now(),
                message: args.message,
            });
        }
    },
});

/**
 * Public action: Trigger an immediate worker health check from the frontend
 * Useful for "Force Refresh" or initial load verification
 */
import { action } from "./_generated/server";

export const verifyWorkerStatus = action({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        console.log('[HEALTH] Manual verification requested');

        try {
            const response = await fetch(`${BACKEND_URL}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-mikky-secret': process.env.MIKKY_SECRET_KEY || 'dev-secret-key',
                },
                signal: AbortSignal.timeout(5000), // Shorter timeout for UI feedback
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const data = await response.json();

            // Update status in database via internal mutation
            await ctx.runMutation(internal.system.updateWorkerStatus, {
                status: data.status === 'healthy' ? 'operational' : 'degraded',
                metrics: {
                    dockerAvailable: data.dockerAvailable ?? false,
                    imageExists: data.imageExists ?? false,
                    activeContainers: data.activeContainers ?? 0,
                    version: data.version,
                },
                message: undefined,
            });

            return { success: true, status: data.status };
        } catch (error) {
            console.error('[HEALTH] Manual check failed:', error);

            // Mark as down
            await ctx.runMutation(internal.system.updateWorkerStatus, {
                status: 'down',
                metrics: {
                    dockerAvailable: false,
                    imageExists: false,
                    activeContainers: 0,
                    version: undefined,
                },
                message: error instanceof Error ? error.message : 'Connection failed',
            });

            return { success: false, error: String(error) };
        }
    },
});
