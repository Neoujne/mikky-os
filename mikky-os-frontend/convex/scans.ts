import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Valid status values matching the schema
const VALID_STATUSES = ["queued", "scanning", "completed", "failed", "cancelled"] as const;
type ScanStatus = Doc<"scanRuns">["status"];

// Type guard to validate status
function isValidStatus(status: string): status is ScanStatus {
    return VALID_STATUSES.includes(status as ScanStatus);
}

// Get scan status (Used by Worker for cancellation check)
export const getStatus = query({
    args: {
        id: v.id("scanRuns"),
    },
    handler: async (ctx, args) => {
        const scan = await ctx.db.get(args.id);
        return scan?.status ?? null;
    },
});

// List active scans (Used by Frontend)
export const listActive = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("scanRuns")
            .withIndex("by_status", (q) => q.eq("status", "scanning"))
            .order("desc") // Newest scans first
            .collect();
    },
});

// Get all scans for a specific target
export const listByTarget = query({
    args: {
        targetId: v.id("targets"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("scanRuns")
            .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
            .order("desc")
            .collect();
    },
});

// Get dashboard metrics
export const getMetrics = query({
    handler: async (ctx) => {
        const targets = await ctx.db.query("targets").collect();
        const activeScans = await ctx.db
            .query("scanRuns")
            .withIndex("by_status", (q) => q.eq("status", "scanning"))
            .collect();
        const criticalVulns = targets.reduce((sum, t) => sum + t.totalVulns, 0);

        return {
            totalTargets: targets.length,
            activeScans: activeScans.length,
            criticalVulns,
        };
    },
});

// Get logs for a specific scan
export const getLogs = query({
    args: {
        scanRunId: v.id("scanRuns"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("scanLogs")
            .withIndex("by_scanRun", (q) => q.eq("scanRunId", args.scanRunId))
            .order("desc")
            .take(100);
    },
});

// Get the latest scan for a specific target (for report access)
export const getLatestByTarget = query({
    args: {
        targetId: v.id("targets"),
    },
    handler: async (ctx, args) => {
        const scans = await ctx.db
            .query("scanRuns")
            .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
            .order("desc")
            .take(1);

        return scans[0] ?? null;
    },
});

// List all scans (for Operations page)
export const listAll = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        return await ctx.db
            .query("scanRuns")
            .order("desc")
            .take(limit);
    },
});


// Update Status (Used by Backend Inngest functions)
export const updateStatus = mutation({
    args: {
        id: v.string(), // Accept raw string for flexibility from backend
        status: v.optional(v.string()),
        currentStage: v.optional(v.string()),
        progress: v.optional(v.number()),
        stageStatus: v.optional(v.any()),
        // Summary metrics
        totalPorts: v.optional(v.number()),
        hostCount: v.optional(v.number()),
        safetyScore: v.optional(v.number()),
        riskScore: v.optional(v.number()), // Deprecated, keep for compatibility
        headerScore: v.optional(v.number()),
        vulnCount: v.optional(v.number()),
        // AI-generated reports
        aiSummary: v.optional(v.string()),
        remediationPrompt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, status, ...otherUpdates } = args;

        // 1. Normalize ID to ensure it matches the "scanRuns" table
        const scanId = ctx.db.normalizeId("scanRuns", id);
        if (!scanId) {
            throw new Error(`Invalid ID format for scanRuns: ${id}`);
        }

        // 2. Verify existence
        const existing = await ctx.db.get(scanId);
        if (!existing) {
            console.log(`Failed to find scanRun with ID: ${scanId}`);
            throw new Error(`Scan run not found: ${id}`);
        }

        // 3. Build type-safe updates object
        const updates: Partial<Doc<"scanRuns">> = {};

        // Copy over simple fields
        if (otherUpdates.currentStage !== undefined) {
            updates.currentStage = otherUpdates.currentStage;
        }
        if (otherUpdates.progress !== undefined) {
            updates.progress = otherUpdates.progress;
        }
        if (otherUpdates.stageStatus !== undefined) {
            updates.stageStatus = otherUpdates.stageStatus;
        }

        // Copy over summary metric fields
        if (otherUpdates.totalPorts !== undefined) {
            updates.totalPorts = otherUpdates.totalPorts;
        }
        if (otherUpdates.hostCount !== undefined) {
            updates.hostCount = otherUpdates.hostCount;
        }
        if (otherUpdates.safetyScore !== undefined) {
            updates.safetyScore = otherUpdates.safetyScore;
        }
        if (otherUpdates.riskScore !== undefined) {
            updates.riskScore = otherUpdates.riskScore;
        }
        if (otherUpdates.headerScore !== undefined) {
            updates.headerScore = otherUpdates.headerScore;
        }
        if (otherUpdates.vulnCount !== undefined) {
            updates.vulnCount = otherUpdates.vulnCount;
        }

        // Copy over AI-generated content
        if (otherUpdates.aiSummary !== undefined) {
            updates.aiSummary = otherUpdates.aiSummary;
        }
        if (otherUpdates.remediationPrompt !== undefined) {
            updates.remediationPrompt = otherUpdates.remediationPrompt;
        }

        // Validate and cast status with explicit error
        if (status !== undefined) {
            if (!isValidStatus(status)) {
                throw new Error(
                    `Invalid status value: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`
                );
            }
            updates.status = status;
        }

        // 4. Apply Update
        await ctx.db.patch(scanId, updates);
    },
});

// Stop a single scan
export const stopScan = mutation({
    args: {
        id: v.id("scanRuns"),
    },
    handler: async (ctx, args) => {
        const scan = await ctx.db.get(args.id);
        if (!scan) {
            throw new Error(`Scan not found: ${args.id}`);
        }

        if (scan.status === "scanning" || scan.status === "queued") {
            await ctx.db.patch(args.id, {
                status: "cancelled",
            });
            console.log(`[CONVEX] Scan ${args.id} marked as cancelled`);
        }
    },
});

// Stop multiple scans at once
export const stopBatch = mutation({
    args: {
        ids: v.array(v.id("scanRuns")),
    },
    handler: async (ctx, args) => {
        for (const id of args.ids) {
            const scan = await ctx.db.get(id);
            if (scan && (scan.status === "scanning" || scan.status === "queued")) {
                await ctx.db.patch(id, {
                    status: "cancelled",
                });
            }
        }
        console.log(`[CONVEX] Stopped ${args.ids.length} scans`);
    },
});

// Engage (restart) multiple scans at once
export const engageBatch = mutation({
    args: {
        ids: v.array(v.id("scanRuns")),
    },
    handler: async (ctx, args) => {
        const restarted: string[] = [];

        for (const id of args.ids) {
            const scan = await ctx.db.get(id);
            if (!scan) continue;

            // Only restart failed or cancelled scans
            if (scan.status === "failed" || scan.status === "cancelled") {
                await ctx.db.patch(id, {
                    status: "queued",
                    currentStage: "info_gathering",
                    progress: 0,
                });
                restarted.push(scan.targetDomain);

                // TODO: Emit Inngest event to trigger actual scan
                // This would require importing the Inngest client
            }
        }

        console.log(`[CONVEX] Queued ${restarted.length} scans for restart`);
        return { restarted };
    },
});

