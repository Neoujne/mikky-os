import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a log entry (called by backend Docker controller)
export const add = mutation({
    args: {
        scanRunId: v.string(),
        level: v.union(
            v.literal("info"),
            v.literal("warning"),
            v.literal("error"),
            v.literal("critical")
        ),
        source: v.string(),
        message: v.string(),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        // Normalize the scanRunId
        const scanId = ctx.db.normalizeId("scanRuns", args.scanRunId);
        if (!scanId) {
            throw new Error(`Invalid scanRunId: ${args.scanRunId}`);
        }

        await ctx.db.insert("scanLogs", {
            scanRunId: scanId,
            level: args.level,
            source: args.source,
            message: args.message,
            timestamp: args.timestamp,
        });
    },
});

// Get logs for a scan run
export const getByScanRun = query({
    args: {
        scanRunId: v.string(),
    },
    handler: async (ctx, args) => {
        const scanId = ctx.db.normalizeId("scanRuns", args.scanRunId);
        if (!scanId) {
            return [];
        }

        return await ctx.db
            .query("scanLogs")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", scanId))
            .order("desc")
            .take(100);
    },
});

// Get ALL logs for a scan run (for reporting)
export const getAllByScanRun = query({
    args: {
        scanRunId: v.string(),
    },
    handler: async (ctx, args) => {
        const scanId = ctx.db.normalizeId("scanRuns", args.scanRunId);
        if (!scanId) {
            return [];
        }

        return await ctx.db
            .query("scanLogs")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", scanId))
            .collect();
    },
});

// Get recent logs across all active scans (for System Console)
export const tail = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;

        // Get all logs ordered by timestamp descending
        const logs = await ctx.db
            .query("scanLogs")
            .order("desc")
            .take(limit);

        // Return in chronological order (oldest first) so newest appears at bottom
        return logs.reverse();
    },
});
