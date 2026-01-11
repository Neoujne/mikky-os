import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Stage status values
const stageStatusValue = v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('done'),
    v.literal('failed')
);

// Stage status object for the 9-stage pipeline
const stageStatusObject = v.object({
    info_gathering: stageStatusValue,
    live_recon: stageStatusValue,
    port_inspection: stageStatusValue,
    enumeration: stageStatusValue,
    protection_headers: stageStatusValue,
    paths_files: stageStatusValue,
    tech_detection: stageStatusValue,
    vuln_scanning: stageStatusValue,
    reporting: stageStatusValue,
});

export default defineSchema({
    // Targets table - root scope/domain being audited
    targets: defineTable({
        domain: v.string(),
        safetyScore: v.optional(v.number()), // NEW: 100 = Safe, 0 = Critical
        riskScore: v.optional(v.number()), // DEPRECATED: Keep for backward compatibility
        totalVulns: v.number(),
        lastScanDate: v.optional(v.string()),
        status: v.union(v.literal('active'), v.literal('idle'), v.literal('archived')),
        createdAt: v.string(),
        userId: v.optional(v.string()), // Clerk user ID
        isArchived: v.optional(v.boolean()), // Soft delete flag
    })
        .index('by_domain', ['domain'])
        .index('by_user', ['userId']),

    // Scan runs table - individual audit sessions
    scanRuns: defineTable({
        targetId: v.id('targets'),
        targetDomain: v.string(),
        status: v.union(
            v.literal('queued'),
            v.literal('scanning'),
            v.literal('completed'),
            v.literal('failed'),
            v.literal('cancelled')
        ),
        currentStage: v.string(),
        progress: v.number(), // 0-100
        stageStatus: stageStatusObject,
        startedAt: v.string(),
        completedAt: v.optional(v.string()),
        userId: v.optional(v.string()),
        // Summary fields for metrics visualization
        totalPorts: v.optional(v.number()),
        hostCount: v.optional(v.number()),
        safetyScore: v.optional(v.number()), // NEW: 100 = Safe, 0 = Critical
        riskScore: v.optional(v.number()), // DEPRECATED: Keep for backward compatibility
        headerScore: v.optional(v.number()),
        vulnCount: v.optional(v.number()),
        // AI-generated reports
        aiSummary: v.optional(v.string()), // Executive summary
        remediationPrompt: v.optional(v.string()), // Copy-paste prompt for coding agents
    })
        .index('by_target', ['targetId'])
        .index('by_status', ['status'])
        .index('by_user', ['userId']),

    // Scan logs table - real-time console output
    scanLogs: defineTable({
        scanRunId: v.id('scanRuns'),
        timestamp: v.string(),
        level: v.union(
            v.literal('info'),
            v.literal('warning'),
            v.literal('error'),
            v.literal('critical')
        ),
        source: v.string(),
        message: v.string(),
    }).index('by_scanRun', ['scanRunId']),

    // Terminal sessions - persistent tab state for Terminal Nexus
    terminal_sessions: defineTable({
        sessionId: v.string(),           // Unique ID (e.g., "system-global", "shell-1")
        name: v.string(),                // Display name (e.g., "SYSTEM", "Shell-1")
        type: v.union(
            v.literal('system'),
            v.literal('scan'),
            v.literal('interactive')
        ),
        status: v.union(v.literal('active'), v.literal('closed')),
        userId: v.string(),              // Clerk user ID (scoped)
        scanId: v.optional(v.id('scanRuns')), // Optional: link to scan for read-only mode
        createdAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_status', ['userId', 'status'])
        .index('by_session_id', ['sessionId', 'userId']),

    // Terminal logs - command/output history for Terminal Nexus
    terminal_logs: defineTable({
        sessionId: v.string(),           // Link to session
        content: v.string(),             // The actual text
        source: v.union(
            v.literal('stdout'),
            v.literal('stderr'),
            v.literal('stdin')
        ),
        timestamp: v.number(),
        userId: v.string(),              // For user-scoped queries
    })
        .index('by_session', ['sessionId'])
        .index('by_user_session', ['userId', 'sessionId']),

    // System status - real-time health monitoring for worker nodes
    system_status: defineTable({
        component: v.string(),           // "worker", "database", etc.
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
        lastChecked: v.number(),         // Timestamp
        message: v.optional(v.string()), // Error message if down
    }).index('by_component', ['component']),

    // Agent runs - CLI session state for polling
    agent_runs: defineTable({
        sessionId: v.string(),           // CLI session identifier
        status: v.union(
            v.literal('thinking'),
            v.literal('executing'),
            v.literal('analyzing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        thought: v.optional(v.string()), // Current LLM reasoning
        logs: v.array(v.string()),       // Tool output history
        finalResponse: v.optional(v.string()), // Final answer
        currentTool: v.optional(v.string()), // Currently executing tool
        lastUpdated: v.number(),         // Timestamp for freshness
        // NEW: Chat history for persistent memory
        history: v.optional(v.array(v.object({
            role: v.string(),
            content: v.string(),
        }))),
    })
        .index('by_session', ['sessionId']),
});

