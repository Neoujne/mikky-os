/**
 * Convex Functions for intel_data table
 * 
 * Queries and mutations for storing/retrieving structured
 * intelligence data collected by Agent 1 (Passive Recon).
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new intel_data record
 * Called by Agent 1 after completing passive recon
 */
export const create = mutation({
    args: {
        targetId: v.id("targets"),
        scanRunId: v.id("scanRuns"),
        targetDomain: v.string(),

        // DNS Records
        dns: v.optional(v.object({
            aRecords: v.optional(v.array(v.string())),
            aaaaRecords: v.optional(v.array(v.string())),
            mxRecords: v.optional(v.array(v.string())),
            nsRecords: v.optional(v.array(v.string())),
            txtRecords: v.optional(v.array(v.string())),
            cnameRecords: v.optional(v.array(v.string())),
            soaRecord: v.optional(v.string()),
        })),

        // Whois Data
        whois: v.optional(v.object({
            registrar: v.optional(v.string()),
            registrantOrg: v.optional(v.string()),
            creationDate: v.optional(v.string()),
            expirationDate: v.optional(v.string()),
            updatedDate: v.optional(v.string()),
            nameServers: v.optional(v.array(v.string())),
            status: v.optional(v.array(v.string())),
            dnssec: v.optional(v.string()),
        })),

        // Subdomains
        subdomains: v.optional(v.array(v.object({
            subdomain: v.string(),
            source: v.string(),
            resolved: v.optional(v.boolean()),
            ip: v.optional(v.string()),
        }))),

        // Network
        network: v.optional(v.object({
            traceroute: v.optional(v.array(v.object({
                hop: v.number(),
                ip: v.optional(v.string()),
                hostname: v.optional(v.string()),
                rtt: v.optional(v.string()),
            }))),
            pingStats: v.optional(v.object({
                transmitted: v.number(),
                received: v.number(),
                lossPercent: v.number(),
                avgRttMs: v.optional(v.number()),
            })),
        })),

        // HTTP Probe
        httpProbe: v.optional(v.object({
            statusCode: v.optional(v.number()),
            server: v.optional(v.string()),
            poweredBy: v.optional(v.string()),
            redirectChain: v.optional(v.array(v.string())),
            tlsVersion: v.optional(v.string()),
            tlsCipher: v.optional(v.string()),
        })),

        // Technologies
        technologies: v.optional(v.array(v.object({
            name: v.string(),
            category: v.optional(v.string()),
            version: v.optional(v.string()),
            confidence: v.optional(v.number()),
        }))),

        // Ports
        ports: v.optional(v.array(v.object({
            port: v.number(),
            protocol: v.string(),
            state: v.string(),
            service: v.optional(v.string()),
            version: v.optional(v.string()),
        }))),

        // AI Analysis
        aiAnalysis: v.optional(v.string()),

        // Metadata
        collectedAt: v.string(),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("intel_data", args);
    },
});

/**
 * Update an existing intel_data record
 */
export const update = mutation({
    args: {
        id: v.id("intel_data"),
        technologies: v.optional(v.array(v.object({
            name: v.string(),
            category: v.optional(v.string()),
            version: v.optional(v.string()),
            confidence: v.optional(v.number()),
        }))),
        ports: v.optional(v.array(v.object({
            port: v.number(),
            protocol: v.string(),
            state: v.string(),
            service: v.optional(v.string()),
            version: v.optional(v.string()),
        }))),
        aiAnalysis: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

/**
 * Save AI analysis to an existing intel record
 */
export const saveAiAnalysis = mutation({
    args: {
        id: v.id("intel_data"),
        aiAnalysis: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { aiAnalysis: args.aiAnalysis });
    },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get intel data by target
 */
export const getByTarget = query({
    args: {
        targetId: v.id("targets"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("intel_data")
            .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
            .order("desc")
            .collect();
    },
});

/**
 * Get intel data by scan run
 */
export const getByScan = query({
    args: {
        scanRunId: v.id("scanRuns"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("intel_data")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", args.scanRunId))
            .first();
    },
});

/**
 * Get intel data by domain
 */
export const getByDomain = query({
    args: {
        targetDomain: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("intel_data")
            .withIndex("by_domain", (q) => q.eq("targetDomain", args.targetDomain))
            .order("desc")
            .first();
    },
});

/**
 * List all intel records
 */
export const list = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("intel_data")
            .order("desc")
            .take(args.limit ?? 50);
    },
});

/**
 * Get subdomains for a specific target
 */
export const getSubdomains = query({
    args: {
        targetId: v.id("targets"),
    },
    handler: async (ctx, args) => {
        const intelRecords = await ctx.db
            .query("intel_data")
            .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
            .order("desc")
            .take(1);

        if (intelRecords.length === 0) return [];
        return intelRecords[0].subdomains ?? [];
    },
});
