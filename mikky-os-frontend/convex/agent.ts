/**
 * MIKKY OS - Agent Convex API
 * 
 * Mutations and queries for CLI-Backend state synchronization.
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new agent run for a session
 */
export const createRun = mutation({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if run already exists
        const existing = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        if (existing) {
            // Reset existing run
            await ctx.db.patch(existing._id, {
                status: 'thinking',
                thought: 'Initializing agent...',
                logs: [],
                finalResponse: undefined,
                currentTool: undefined,
                lastUpdated: Date.now(),
            });
            return existing._id;
        }

        // Create new run
        const id = await ctx.db.insert('agent_runs', {
            sessionId: args.sessionId,
            status: 'thinking',
            thought: 'Initializing agent...',
            logs: [],
            history: [], // Initialize empty history
            lastUpdated: Date.now(),
        });

        return id;
    },
});

/**
 * Update agent run status (called by Inngest)
 */
export const updateStatus = mutation({
    args: {
        sessionId: v.string(),
        status: v.union(
            v.literal('thinking'),
            v.literal('executing'),
            v.literal('analyzing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        thought: v.optional(v.string()),
        log: v.optional(v.string()),
        currentTool: v.optional(v.string()),
        finalResponse: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        if (!run) {
            // Create if doesn't exist
            await ctx.db.insert('agent_runs', {
                sessionId: args.sessionId,
                status: args.status,
                thought: args.thought || '',
                logs: args.log ? [args.log] : [],
                currentTool: args.currentTool,
                finalResponse: args.finalResponse,
                lastUpdated: Date.now(),
            });
            return;
        }

        // Update existing run
        const updates: Record<string, unknown> = {
            status: args.status,
            lastUpdated: Date.now(),
        };

        if (args.thought !== undefined) {
            updates.thought = args.thought;
        }

        if (args.currentTool !== undefined) {
            updates.currentTool = args.currentTool;
        }

        if (args.finalResponse !== undefined) {
            updates.finalResponse = args.finalResponse;
        }

        // Append log if provided
        if (args.log) {
            updates.logs = [...run.logs, args.log];
        }

        await ctx.db.patch(run._id, updates);
    },
});

/**
 * Append a log entry without changing status
 */
export const appendLog = mutation({
    args: {
        sessionId: v.string(),
        log: v.string(),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        if (!run) return;

        await ctx.db.patch(run._id, {
            logs: [...run.logs, args.log],
            lastUpdated: Date.now(),
        });
    },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get current status for a session (for CLI polling)
 */
export const getRunStatus = query({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        if (!run) {
            return null;
        }

        return {
            status: run.status,
            thought: run.thought,
            logs: run.logs,
            currentTool: run.currentTool,
            finalResponse: run.finalResponse,
            lastUpdated: run.lastUpdated,
        };
    },
});

/**
 * Check if a session exists
 */
export const sessionExists = query({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        return !!run;
    },
});

/**
 * Get chat history for a session
 */
export const getHistory = query({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        return run?.history ?? [];
    },
});

/**
 * Append messages to chat history
 */
export const appendHistory = mutation({
    args: {
        sessionId: v.string(),
        messages: v.array(v.object({
            role: v.string(),
            content: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db
            .query('agent_runs')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
            .first();

        if (!run) return;

        const existingHistory = run.history ?? [];
        await ctx.db.patch(run._id, {
            history: [...existingHistory, ...args.messages],
            lastUpdated: Date.now(),
        });
    },
});
