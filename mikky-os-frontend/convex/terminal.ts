/**
 * Terminal API - Backend operations for Terminal Nexus
 * Handles session management, command execution via Docker, and log streaming
 * 
 * Architecture: "Fire-and-Push" Bridge
 * - Convex dispatches commands to Express backend via HTTP
 * - Backend executes in Docker and pushes logs back to Convex
 */

import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Dangerous commands blocklist - validated BEFORE sending to backend
const COMMAND_BLOCKLIST = [
    'rm -rf',
    'rm -r /',
    'rm -fr',
    'mkfs',
    ':(){ :|:& };:',  // Fork bomb
    'dd if=',
    '> /dev/sda',
    'chmod -R 777 /',
    'mv /* ',
    'cat /dev/zero',
    '> /dev/null',
    'shutdown',
    'reboot',
    'init 0',
    'init 6',
];

// Maximum active sessions per user
const MAX_SESSIONS_PER_USER = 5;

// Backend URL - defaults to localhost:5000 for local development
const BACKEND_URL = (process.env.MIKKY_BACKEND_URL || "http://localhost:5000");

/**
 * Get all active terminal sessions for the current user
 */
export const getSessions = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_user_status", (q) =>
                q.eq("userId", args.userId).eq("status", "active")
            )
            .collect();

        return sessions;
    },
});

/**
 * Get logs for a specific terminal session
 */
export const getLogs = query({
    args: {
        sessionId: v.string(),
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 200;

        const logs = await ctx.db
            .query("terminal_logs")
            .withIndex("by_user_session", (q) =>
                q.eq("userId", args.userId).eq("sessionId", args.sessionId)
            )
            .order("asc")
            .take(limit);

        return logs;
    },
});

/**
 * Create a new terminal session
 * Enforces max 5 active sessions per user
 */
export const createSession = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
        type: v.union(
            v.literal('system'),
            v.literal('scan'),
            v.literal('interactive')
        ),
        scanId: v.optional(v.id('scanRuns')),
    },
    handler: async (ctx, args) => {
        // Count existing active sessions for this user
        const existingSessions = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_user_status", (q) =>
                q.eq("userId", args.userId).eq("status", "active")
            )
            .collect();

        if (existingSessions.length >= MAX_SESSIONS_PER_USER) {
            throw new Error(`Maximum ${MAX_SESSIONS_PER_USER} active terminals allowed. Close a tab to open a new one.`);
        }

        // Generate unique session ID
        const sessionNumber = existingSessions.filter(s => s.type === 'interactive').length + 1;
        const sessionId = args.type === 'system'
            ? 'system-global'
            : args.type === 'scan'
                ? `scan-${args.scanId}`
                : `shell-${sessionNumber}`;

        // Check if session already exists
        const existing = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_session_id", (q) =>
                q.eq("sessionId", sessionId).eq("userId", args.userId)
            )
            .first();

        if (existing && existing.status === 'active') {
            return existing._id;
        }

        // Create new session
        const sessionDocId = await ctx.db.insert("terminal_sessions", {
            sessionId,
            name: args.name,
            type: args.type,
            status: 'active',
            userId: args.userId,
            scanId: args.scanId,
            createdAt: Date.now(),
        });

        // Add welcome message for interactive sessions
        if (args.type === 'interactive') {
            await ctx.db.insert("terminal_logs", {
                sessionId,
                content: `\x1b[36m╭─────────────────────────────────────────╮\x1b[0m\r\n\x1b[36m│\x1b[0m  \x1b[1;32mMIKKY OS Terminal v2.0\x1b[0m                \x1b[36m│\x1b[0m\r\n\x1b[36m│\x1b[0m  \x1b[33mDocker-Powered Shell\x1b[0m                  \x1b[36m│\x1b[0m\r\n\x1b[36m│\x1b[0m  \x1b[90mType 'help' for available commands\x1b[0m     \x1b[36m│\x1b[0m\r\n\x1b[36m╰─────────────────────────────────────────╯\x1b[0m\r\n`,
                source: 'stdout',
                timestamp: Date.now(),
                userId: args.userId,
            });
        }

        return sessionDocId;
    },
});

/**
 * Send a command to a terminal session
 * Validates against blocklist, saves stdin, then dispatches to backend
 */
export const sendCommand = mutation({
    args: {
        sessionId: v.string(),
        userId: v.string(),
        command: v.string(),
    },
    handler: async (ctx, args) => {
        const { sessionId, userId, command } = args;

        // Validate command against blocklist
        const lowerCommand = command.toLowerCase();
        for (const blocked of COMMAND_BLOCKLIST) {
            if (lowerCommand.includes(blocked.toLowerCase())) {
                // Write error to terminal
                await ctx.db.insert("terminal_logs", {
                    sessionId,
                    content: `\x1b[31m🚫 Command blocked: Contains forbidden pattern "${blocked}"\x1b[0m\r\n`,
                    source: 'stderr',
                    timestamp: Date.now(),
                    userId,
                });
                throw new Error(`🚫 Command blocked: Contains forbidden pattern "${blocked}"`);
            }
        }

        // Verify session exists and belongs to user
        const session = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_session_id", (q) =>
                q.eq("sessionId", sessionId).eq("userId", userId)
            )
            .first();

        if (!session || session.status !== 'active') {
            throw new Error("Session not found or inactive");
        }

        if (session.type !== 'interactive') {
            throw new Error("Cannot send commands to read-only sessions");
        }

        const now = Date.now();

        // Save the stdin (user command) - shows immediately in terminal
        await ctx.db.insert("terminal_logs", {
            sessionId,
            content: `\x1b[32m❯\x1b[0m ${command}\r\n`,
            source: 'stdin',
            timestamp: now,
            userId,
        });

        // Handle special client-side commands
        const trimmedCommand = command.trim().toLowerCase();

        if (trimmedCommand === 'clear') {
            await ctx.db.insert("terminal_logs", {
                sessionId,
                content: '\x1b[2J\x1b[H', // ANSI clear screen
                source: 'stdout',
                timestamp: now + 1,
                userId,
            });
            return { success: true, dispatched: false };
        }

        if (trimmedCommand === 'help') {
            await ctx.db.insert("terminal_logs", {
                sessionId,
                content: `\x1b[36mAvailable Commands:\x1b[0m\r\n` +
                    `  \x1b[33mnmap\x1b[0m <target>     - Network scanner\r\n` +
                    `  \x1b[33mwhatweb\x1b[0m <url>     - Web technology fingerprinting\r\n` +
                    `  \x1b[33mwhois\x1b[0m <domain>    - Domain lookup\r\n` +
                    `  \x1b[33mdig\x1b[0m <domain>      - DNS lookup\r\n` +
                    `  \x1b[33mcurl\x1b[0m <url>        - HTTP requests\r\n` +
                    `  \x1b[33mecho\x1b[0m <text>       - Print text\r\n` +
                    `  \x1b[33mcat\x1b[0m <file>        - View file contents\r\n` +
                    `  \x1b[33mls\x1b[0m                - List directory\r\n` +
                    `  \x1b[33mclear\x1b[0m             - Clear terminal\r\n` +
                    `  \x1b[33mhelp\x1b[0m              - Show this help\r\n`,
                source: 'stdout',
                timestamp: now + 1,
                userId,
            });
            return { success: true, dispatched: false };
        }

        if (trimmedCommand === '') {
            return { success: true, dispatched: false };
        }

        // Show "executing" indicator
        await ctx.db.insert("terminal_logs", {
            sessionId,
            content: `\x1b[90m⏳ Dispatching to Docker worker...\x1b[0m\r\n`,
            source: 'stdout',
            timestamp: now + 1,
            userId,
        });

        // Schedule the action to dispatch to backend
        // The action will make an HTTP call to the Express backend
        await ctx.scheduler.runAfter(0, internal.terminal.dispatchCommand, {
            sessionId,
            userId,
            command,
        });

        return { success: true, dispatched: true };
    },
});

/**
 * Internal action: Dispatch command to Express backend for Docker execution
 * Uses "Fire-and-Forget" - backend will push logs back via appendLog mutation
 */
export const dispatchCommand = internalAction({
    args: {
        sessionId: v.string(),
        userId: v.string(),
        command: v.string(),
    },
    handler: async (ctx, args) => {
        const { sessionId, userId, command } = args;

        try {
            const response = await fetch(`${BACKEND_URL}/api/terminal/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mikky-Secret': process.env.MIKKY_SECRET_KEY || 'dev-secret-key',
                },
                body: JSON.stringify({
                    sessionId,
                    userId,
                    command,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DISPATCH] Backend error:', errorText);

                // Write error to terminal logs
                await ctx.runMutation(internal.terminal.appendLog, {
                    sessionId,
                    userId,
                    content: `\x1b[31m✗ Backend error: ${response.status} - ${errorText}\x1b[0m\r\n`,
                    source: 'stderr',
                });
            }
        } catch (error) {
            console.error('[DISPATCH] Network error:', error);

            // Write connection error to terminal
            await ctx.runMutation(internal.terminal.appendLog, {
                sessionId,
                userId,
                content: `\x1b[31m✗ Connection error: Backend unavailable at ${BACKEND_URL}\x1b[0m\r\n\x1b[90mMake sure mikky-os-backend is running: npm run dev\x1b[0m\r\n`,
                source: 'stderr',
            });
        }
    },
});

/**
 * Internal mutation: Append log entry to terminal_logs
 * Called by the Express backend to push Docker output
 */
export const appendLog = internalMutation({
    args: {
        sessionId: v.string(),
        userId: v.string(),
        content: v.string(),
        source: v.union(v.literal('stdout'), v.literal('stderr'), v.literal('stdin')),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("terminal_logs", {
            sessionId: args.sessionId,
            content: args.content,
            source: args.source,
            timestamp: Date.now(),
            userId: args.userId,
        });
    },
});

/**
 * Public mutation for backend to append logs (with secret key validation in backend)
 * This is the endpoint the Express server calls
 */
export const appendLogPublic = mutation({
    args: {
        sessionId: v.string(),
        userId: v.string(),
        content: v.string(),
        source: v.union(v.literal('stdout'), v.literal('stderr'), v.literal('stdin')),
    },
    handler: async (ctx, args) => {
        // Verify the session exists and belongs to user
        const session = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_session_id", (q) =>
                q.eq("sessionId", args.sessionId).eq("userId", args.userId)
            )
            .first();

        if (!session) {
            throw new Error("Session not found");
        }

        await ctx.db.insert("terminal_logs", {
            sessionId: args.sessionId,
            content: args.content,
            source: args.source,
            timestamp: Date.now(),
            userId: args.userId,
        });

        return { success: true };
    },
});

/**
 * Close a terminal session
 */
export const closeSession = mutation({
    args: {
        sessionId: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_session_id", (q) =>
                q.eq("sessionId", args.sessionId).eq("userId", args.userId)
            )
            .first();

        if (!session) {
            throw new Error("Session not found");
        }

        // Prevent closing the SYSTEM tab
        if (session.type === 'system') {
            throw new Error("Cannot close the SYSTEM terminal");
        }

        await ctx.db.patch(session._id, {
            status: 'closed',
        });

        return { success: true };
    },
});

/**
 * Initialize the default SYSTEM session for a user
 * Called when TerminalNexus mounts
 */
export const initSystemSession = mutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if SYSTEM session already exists
        const existing = await ctx.db
            .query("terminal_sessions")
            .withIndex("by_session_id", (q) =>
                q.eq("sessionId", "system-global").eq("userId", args.userId)
            )
            .first();

        if (existing) {
            // Reactivate if closed
            if (existing.status === 'closed') {
                await ctx.db.patch(existing._id, { status: 'active' });
            }
            return existing._id;
        }

        // Create the SYSTEM session
        const sessionDocId = await ctx.db.insert("terminal_sessions", {
            sessionId: 'system-global',
            name: 'SYSTEM',
            type: 'system',
            status: 'active',
            userId: args.userId,
            createdAt: Date.now(),
        });

        return sessionDocId;
    },
});
