import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// List all non-archived targets for the current user
export const list = query({
    args: {},
    handler: async (ctx) => {
        const targets = await ctx.db.query('targets').order('desc').collect();
        // Filter out archived targets
        return targets.filter((t) => !t.isArchived);
    },
});

// Get a target by domain
export const getByDomain = query({
    args: {
        domain: v.string(),
    },
    handler: async (ctx, args) => {
        const domain = args.domain
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .toLowerCase();

        return await ctx.db
            .query('targets')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();
    },
});

// Create a new target
export const create = mutation({
    args: {
        domain: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if target already exists
        const existing = await ctx.db
            .query('targets')
            .withIndex('by_domain', (q) => q.eq('domain', args.domain))
            .first();

        if (existing) {
            // If archived, unarchive it
            if (existing.isArchived) {
                await ctx.db.patch(existing._id, { isArchived: false, status: 'idle' });
            }
            return existing._id;
        }

        // Create new target
        const targetId = await ctx.db.insert('targets', {
            domain: args.domain,
            riskScore: 0,
            totalVulns: 0,
            status: 'idle',
            createdAt: new Date().toISOString(),
            isArchived: false,
        });

        return targetId;
    },
});

// Soft delete a target (archive instead of destroy)
export const remove = mutation({
    args: {
        id: v.id('targets'),
    },
    handler: async (ctx, args) => {
        const target = await ctx.db.get(args.id);
        if (!target) {
            throw new Error('Target not found');
        }

        // Soft delete: mark as archived
        await ctx.db.patch(args.id, {
            isArchived: true,
            status: 'archived' as const,
        });
    },
});

// Update target stats after a scan completes (Parent Sync)
export const updateStats = mutation({
    args: {
        id: v.id('targets'),
        safetyScore: v.optional(v.number()),
        riskScore: v.optional(v.number()), // Deprecated
        totalVulns: v.number(),
        lastScanDate: v.string(),
    },
    handler: async (ctx, args) => {
        const target = await ctx.db.get(args.id);
        if (!target) {
            throw new Error(`Target not found: ${args.id}`);
        }

        const updates: any = {
            totalVulns: args.totalVulns,
            lastScanDate: args.lastScanDate,
            status: 'idle', // Reset to idle after scan completes
        };

        // Use safetyScore if provided, otherwise fallback to riskScore
        if (args.safetyScore !== undefined) {
            updates.safetyScore = args.safetyScore;
        }
        if (args.riskScore !== undefined) {
            updates.riskScore = args.riskScore;
        }

        await ctx.db.patch(args.id, updates);
    },
});

// Engage a scan - upsert target and create scan run
export const engage = mutation({
    args: {
        domain: v.string(),
        includeSubdomains: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Normalize domain (remove protocol, trailing slashes)
        const domain = args.domain
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .toLowerCase();

        // Check if target already exists
        let target = await ctx.db
            .query('targets')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();

        const now = new Date().toISOString();

        if (target) {
            // Update existing target (unarchive if needed)
            await ctx.db.patch(target._id, {
                status: 'active',
                lastScanDate: now,
                isArchived: false, // Unarchive on re-engage
            });
        } else {
            // Create new target
            const targetId = await ctx.db.insert('targets', {
                domain,
                riskScore: 0,
                totalVulns: 0,
                status: 'active',
                createdAt: now,
                lastScanDate: now,
                isArchived: false,
            });
            target = await ctx.db.get(targetId);
        }

        if (!target) {
            throw new Error('Failed to create or find target');
        }

        // Create a new scan run
        const initialStageStatus = {
            info_gathering: 'running' as const,
            live_recon: 'pending' as const,
            port_inspection: 'pending' as const,
            enumeration: 'pending' as const,
            protection_headers: 'pending' as const,
            paths_files: 'pending' as const,
            tech_detection: 'pending' as const,
            vuln_scanning: 'pending' as const,
            reporting: 'pending' as const,
        };

        const scanRunId = await ctx.db.insert('scanRuns', {
            targetId: target._id,
            targetDomain: domain,
            status: 'scanning',
            currentStage: 'info_gathering',
            progress: 0,
            stageStatus: initialStageStatus,
            startedAt: now,
        });

        // Add initial log entry
        await ctx.db.insert('scanLogs', {
            scanRunId,
            timestamp: now,
            level: 'info',
            source: 'system',
            message: `[MIKKY OS] Scan initiated for ${domain}`,
        });

        return { targetId: target._id, scanRunId };
    },
});
