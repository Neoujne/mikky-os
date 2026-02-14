/**
 * Convex Functions for vulnerabilities table
 * 
 * CRUD operations for storing/retrieving vulnerabilities
 * found by Agent 3 (Vulnerability Scanning).
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a single vulnerability record
 */
export const create = mutation({
    args: {
        targetId: v.id("targets"),
        scanRunId: v.id("scanRuns"),
        targetDomain: v.string(),

        title: v.string(),
        severity: v.union(
            v.literal("info"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("critical")
        ),
        description: v.optional(v.string()),
        source: v.string(),
        templateId: v.optional(v.string()),
        matcher: v.optional(v.string()),

        url: v.optional(v.string()),
        port: v.optional(v.number()),
        protocol: v.optional(v.string()),

        evidence: v.optional(v.string()),
        reference: v.optional(v.array(v.string())),

        cvssScore: v.optional(v.number()),
        cweId: v.optional(v.string()),

        status: v.union(
            v.literal("open"),
            v.literal("confirmed"),
            v.literal("false_positive"),
            v.literal("remediated")
        ),

        tool: v.string(), // Added to match schema
        discoveredAt: v.string(), // Renamed from foundAt to match schema
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("vulnerabilities", {
            ...args,
            description: args.description ?? "",
        });
    },
});

/**
 * Batch create multiple vulnerabilities at once
 */
export const createBatch = mutation({
    args: {
        vulns: v.array(v.object({
            targetId: v.id("targets"),
            scanRunId: v.id("scanRuns"),
            targetDomain: v.string(),
            title: v.string(),
            severity: v.union(
                v.literal("info"),
                v.literal("low"),
                v.literal("medium"),
                v.literal("high"),
                v.literal("critical")
            ),
            description: v.optional(v.string()),
            source: v.string(),
            templateId: v.optional(v.string()),
            matcher: v.optional(v.string()),
            url: v.optional(v.string()),
            port: v.optional(v.number()),
            protocol: v.optional(v.string()),
            evidence: v.optional(v.string()),
            reference: v.optional(v.array(v.string())),
            cvssScore: v.optional(v.number()),
            cweId: v.optional(v.string()),
            status: v.union(
                v.literal("open"),
                v.literal("confirmed"),
                v.literal("false_positive"),
                v.literal("remediated")
            ),
            tool: v.string(), // Added to match schema
            discoveredAt: v.string(), // Renamed from foundAt to match schema
            userId: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const ids = [];
        for (const vuln of args.vulns) {
            const id = await ctx.db.insert("vulnerabilities", {
                ...vuln,
                description: vuln.description ?? "",
            });
            ids.push(id);
        }
        return ids;
    },
});

/**
 * Save AI-generated explanation and remediation to a vulnerability
 */
export const saveAiAnalysis = mutation({
    args: {
        id: v.id("vulnerabilities"),
        aiExplanation: v.string(),
        aiRemediation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            aiExplanation: args.aiExplanation,
            aiRemediation: args.aiRemediation,
        });
    },
});

/**
 * Update vulnerability status (e.g. mark as false positive or remediated)
 */
export const updateStatus = mutation({
    args: {
        id: v.id("vulnerabilities"),
        status: v.union(
            v.literal("open"),
            v.literal("confirmed"),
            v.literal("false_positive"),
            v.literal("remediated")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all vulnerabilities for a scan run
 */
export const getByScan = query({
    args: { scanRunId: v.id("scanRuns") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vulnerabilities")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", args.scanRunId))
            .collect();
    },
});

/**
 * Get all vulnerabilities for a target
 */
export const getByTarget = query({
    args: { targetId: v.id("targets") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vulnerabilities")
            .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
            .collect();
    },
});

/**
 * Get vulnerabilities by severity
 */
export const getBySeverity = query({
    args: {
        severity: v.union(
            v.literal("info"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("critical")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vulnerabilities")
            .withIndex("by_severity", (q) => q.eq("severity", args.severity))
            .collect();
    },
});

/**
 * Get vulnerability summary stats for a scan
 */
export const getScanSummary = query({
    args: { scanRunId: v.id("scanRuns") },
    handler: async (ctx, args) => {
        const vulns = await ctx.db
            .query("vulnerabilities")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", args.scanRunId))
            .collect();

        const counts = { info: 0, low: 0, medium: 0, high: 0, critical: 0, total: vulns.length };
        for (const v of vulns) {
            counts[v.severity]++;
        }
        return counts;
    },
});

/**
 * Get vulnerabilities by domain
 */
export const getByDomain = query({
    args: { targetDomain: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vulnerabilities")
            .withIndex("by_domain", (q) => q.eq("targetDomain", args.targetDomain))
            .collect();
    },
});

/**
 * Get all vulnerabilities (recent 100)
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("vulnerabilities")
            .order("desc") // Newest first
            .take(100);
    },
});
