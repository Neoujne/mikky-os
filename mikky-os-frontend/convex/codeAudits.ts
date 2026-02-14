/**
 * Convex Functions for code_audits table
 *
 * CRUD operations for the Code Audit engine.
 * Backend creates an audit record, updates status as it progresses,
 * then saves findings when analysis completes.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const findingValidator = v.object({
    file: v.string(),
    line: v.number(),
    severity: v.union(
        v.literal("CRITICAL"),
        v.literal("HIGH"),
        v.literal("MEDIUM"),
        v.literal("LOW"),
        v.literal("INFO")
    ),
    title: v.string(),
    bad_code: v.string(),
    fixed_code: v.string(),
    explanation: v.string(),
});

const statusValidator = v.union(
    v.literal("pending"),
    v.literal("fetching"),
    v.literal("analyzing"),
    v.literal("completed"),
    v.literal("failed")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new audit record (status: pending)
 */
export const create = mutation({
    args: {
        repoUrl: v.string(),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("code_audits", {
            repoUrl: args.repoUrl,
            status: "pending",
            createdAt: new Date().toISOString(),
            userId: args.userId,
        });
    },
});

/**
 * Update the audit status (fetching → analyzing → completed/failed)
 */
export const updateStatus = mutation({
    args: {
        id: v.id("code_audits"),
        status: statusValidator,
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const patch: Record<string, any> = { status: args.status };
        if (args.error) patch.error = args.error;
        if (args.status === "completed" || args.status === "failed") {
            patch.completedAt = new Date().toISOString();
        }
        await ctx.db.patch(args.id, patch);
    },
});

/**
 * Save the final findings and mark as completed
 */
export const saveFindings = mutation({
    args: {
        id: v.id("code_audits"),
        findings: v.array(findingValidator),
        filesAnalyzed: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "completed",
            findings: args.findings,
            filesAnalyzed: args.filesAnalyzed,
            completedAt: new Date().toISOString(),
        });
    },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single audit by ID
 */
export const getById = query({
    args: { id: v.id("code_audits") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * List recent audits (newest first, max 50)
 */
export const listRecent = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("code_audits")
            .order("desc")
            .take(50);
    },
});

/**
 * List audits for a specific user
 */
export const listByUser = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("code_audits")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(50);
    },
});
