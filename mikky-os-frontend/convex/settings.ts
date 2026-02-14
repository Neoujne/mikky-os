import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const SETTINGS_SINGLETON_KEY = 'default';

export const getSettings = query({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query('app_settings')
            .withIndex('by_singleton', (q) => q.eq('singletonKey', SETTINGS_SINGLETON_KEY))
            .first();

        if (existing) {
            return existing;
        }

        return {
            _id: null,
            singletonKey: SETTINGS_SINGLETON_KEY,
            theme: 'cyberpunk' as const,
            notifications: true,
            concurrency: 3,
            workerUrl: 'http://localhost:5000',
            openRouterKey: '',
            updatedAt: new Date().toISOString(),
        };
    },
});

export const saveSettings = mutation({
    args: {
        theme: v.union(v.literal('cyberpunk'), v.literal('matrix')),
        notifications: v.boolean(),
        concurrency: v.number(),
        workerUrl: v.string(),
        openRouterKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('app_settings')
            .withIndex('by_singleton', (q) => q.eq('singletonKey', SETTINGS_SINGLETON_KEY))
            .first();

        const payload = {
            singletonKey: SETTINGS_SINGLETON_KEY,
            theme: args.theme,
            notifications: args.notifications,
            concurrency: Math.max(1, Math.min(5, Math.round(args.concurrency))),
            workerUrl: args.workerUrl.trim(),
            openRouterKey: args.openRouterKey?.trim() ?? '',
            updatedAt: new Date().toISOString(),
        };

        if (existing) {
            await ctx.db.patch(existing._id, payload);
            return existing._id;
        }

        return await ctx.db.insert('app_settings', payload);
    },
});
