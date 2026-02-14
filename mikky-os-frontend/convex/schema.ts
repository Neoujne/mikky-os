/**
 * CONVEX SCHEMA FOR MIKKY OS v2
 *
 * Updated with:
 * 1. NEW TABLE: `vulnerabilities` — Real vulnerability records
 * 2. NEW TABLE: `intel_data` — Structured recon/intelligence data
 * 3. NEW TABLE: `user_settings` — Persistent user settings (API keys)
 * 4. UPDATED: `scanRuns.status` — Added 'stopped' status literal
 * 5. UPDATED: `targets` — Added `failedScans` and `lastScanStatus` fields
 * 6. UPDATED: `scanRuns` — Added `agentResults` field for inter-agent data
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// ============================================================================
// SHARED VALUE TYPES
// ============================================================================

// Stage status values
const stageStatusValue = v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('done'),
    v.literal('failed')
);

// Stage status object for the pipeline
const stageStatusObject = v.object({
    info_gathering: stageStatusValue,    // Agent 1: Passive Recon
    live_recon: stageStatusValue,        // Agent 1: Liveness check
    port_inspection: stageStatusValue,   // Agent 2: Nmap standard
    enumeration: stageStatusValue,       // Agent 2: Service enumeration
    protection_headers: stageStatusValue,// Agent 2: Security headers
    paths_files: stageStatusValue,       // Agent 2: Path discovery
    tech_detection: stageStatusValue,    // Agent 2: Technology fingerprinting
    vuln_scanning: stageStatusValue,     // Agent 3: Active vulnerability scanning
    reporting: stageStatusValue,         // Final: AI report generation
});

// Vulnerability severity levels
const severityValue = v.union(
    v.literal('critical'),
    v.literal('high'),
    v.literal('medium'),
    v.literal('low'),
    v.literal('info')
);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export default defineSchema({
    // ========================================================================
    // TARGETS TABLE (UPDATED)
    // ========================================================================
    targets: defineTable({
        domain: v.string(),
        safetyScore: v.optional(v.number()),   // 100 = Safe, 0 = Critical
        riskScore: v.optional(v.number()),     // DEPRECATED: backward compat
        totalVulns: v.number(),
        lastScanDate: v.optional(v.string()),
        status: v.union(
            v.literal('active'),
            v.literal('idle'),
            v.literal('archived')
        ),
        createdAt: v.string(),
        userId: v.optional(v.string()),        // Clerk user ID
        isArchived: v.optional(v.boolean()),   // Soft delete flag

        // NEW: Track failed scan count
        failedScans: v.optional(v.number()),

        // NEW: Last scan status for quick filtering
        lastScanStatus: v.optional(v.union(
            v.literal('completed'),
            v.literal('failed'),
            v.literal('scanning'),
            v.literal('cancelled'),
            v.literal('stopped')
        )),
    })
        .index('by_domain', ['domain'])
        .index('by_user', ['userId']),

    // ========================================================================
    // SCAN RUNS TABLE (UPDATED)
    // ========================================================================
    scanRuns: defineTable({
        targetId: v.id('targets'),
        targetDomain: v.string(),
        status: v.union(
            v.literal('queued'),
            v.literal('scanning'),
            v.literal('completed'),
            v.literal('failed'),
            v.literal('cancelled'),
            v.literal('stopped')               // NEW: User-initiated stop
        ),
        currentStage: v.string(),
        progress: v.number(),                  // 0-100
        stageStatus: stageStatusObject,
        startedAt: v.string(),
        completedAt: v.optional(v.string()),
        userId: v.optional(v.string()),

        // Summary metrics
        totalPorts: v.optional(v.number()),
        hostCount: v.optional(v.number()),
        safetyScore: v.optional(v.number()),
        riskScore: v.optional(v.number()),     // DEPRECATED
        headerScore: v.optional(v.number()),
        vulnCount: v.optional(v.number()),

        // AI-generated reports
        aiSummary: v.optional(v.string()),
        remediationPrompt: v.optional(v.string()),

        // NEW: Inter-agent data passing
        agentResults: v.optional(v.object({
            // Agent 1 results
            subdomains: v.optional(v.array(v.string())),
            dnsRecords: v.optional(v.array(v.string())),
            whoisData: v.optional(v.string()),

            // Agent 2 results
            openPorts: v.optional(v.array(v.number())),
            webServerDetected: v.optional(v.boolean()),
            dbExposed: v.optional(v.boolean()),
            discoveredUrls: v.optional(v.array(v.string())),
            detectedParams: v.optional(v.array(v.string())),

            // Agent 3 flags
            sqlInjectionTested: v.optional(v.boolean()),
            xssTested: v.optional(v.boolean()),
            ssrfTested: v.optional(v.boolean()),
        })),

        // NEW: Error details for failed scans
        failureReason: v.optional(v.string()),
        failureStage: v.optional(v.string()),
    })
        .index('by_target', ['targetId'])
        .index('by_status', ['status'])
        .index('by_user', ['userId']),

    // ========================================================================
    // VULNERABILITIES TABLE (NEW)
    // Real vulnerability records from scanning tools
    // ========================================================================
    vulnerabilities: defineTable({
        // Foreign keys
        scanRunId: v.id('scanRuns'),
        targetId: v.id('targets'),
        targetDomain: v.string(),

        // Vulnerability identification
        title: v.string(),
        description: v.string(),
        severity: severityValue,
        cvss: v.optional(v.number()),
        cve: v.optional(v.string()),

        // Source tracking
        tool: v.string(),
        evidence: v.optional(v.string()),
        url: v.optional(v.string()),
        parameter: v.optional(v.string()),
        method: v.optional(v.string()),

        // Metadata
        discoveredAt: v.string(),
        status: v.union(
            v.literal('open'),
            v.literal('confirmed'),
            v.literal('false_positive'),
            v.literal('remediated'), // Added to match code usage
            v.literal('resolved'),
            v.literal('accepted')
        ),

        // AI analysis
        aiExplanation: v.optional(v.string()),
        aiRemediation: v.optional(v.string()),

        // User interaction
        userId: v.optional(v.string()),
        notes: v.optional(v.string()),
    })
        .index('by_scanRun', ['scanRunId'])
        .index('by_target', ['targetId'])
        .index('by_severity', ['severity'])
        .index('by_status', ['status'])
        .index('by_domain', ['targetDomain']) // Added to support getByDomain query
        .index('by_user', ['userId']),

    // ========================================================================
    // INTEL DATA TABLE (NEW)
    // Structured intelligence/recon data per target
    // ========================================================================
    intel_data: defineTable({
        // Foreign keys
        targetId: v.id('targets'),
        scanRunId: v.id('scanRuns'),
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

        // HTTP Probe Results
        httpProbe: v.optional(v.object({
            statusCode: v.optional(v.number()),
            server: v.optional(v.string()),
            poweredBy: v.optional(v.string()),
            redirectChain: v.optional(v.array(v.string())),
            tlsVersion: v.optional(v.string()),
            tlsCipher: v.optional(v.string()),
        })),

        // Technologies Detected
        technologies: v.optional(v.array(v.object({
            name: v.string(),
            category: v.optional(v.string()),
            version: v.optional(v.string()),
            confidence: v.optional(v.number()),
        }))),

        // Open Ports Summary
        ports: v.optional(v.array(v.object({
            port: v.number(),
            protocol: v.string(),
            state: v.string(),
            service: v.optional(v.string()),
            version: v.optional(v.string()),
        }))),

        // LLM-generated analysis
        aiAnalysis: v.optional(v.string()),

        // Metadata
        collectedAt: v.string(),
        userId: v.optional(v.string()),
    })
        .index('by_target', ['targetId'])
        .index('by_scanRun', ['scanRunId'])
        .index('by_domain', ['targetDomain'])
        .index('by_user', ['userId']),

    // ========================================================================
    // USER SETTINGS TABLE (NEW)
    // Persistent user settings stored in Convex
    // ========================================================================
    user_settings: defineTable({
        userId: v.string(),

        // API Keys
        openrouterApiKey: v.optional(v.string()),
        geminiApiKey: v.optional(v.string()),
        openaiApiKey: v.optional(v.string()),

        // Docker Configuration
        dockerStrictMode: v.optional(v.boolean()),

        // Notification Preferences
        notifyOnScanComplete: v.optional(v.boolean()),
        notifyOnCriticalVuln: v.optional(v.boolean()),

        // Display Preferences
        theme: v.optional(v.union(
            v.literal('dark'),
            v.literal('light'),
            v.literal('system')
        )),
        dashboardLayout: v.optional(v.string()),

        // Metadata
        updatedAt: v.string(),
    })
        .index('by_user', ['userId']),

    // ============================================================================
    // APP SETTINGS TABLE (NEW)
    // Singleton app-level settings document used by the Settings page.
    // ============================================================================
    app_settings: defineTable({
        singletonKey: v.string(), // Always "default"
        theme: v.union(v.literal('cyberpunk'), v.literal('matrix')),
        notifications: v.boolean(),
        concurrency: v.number(),
        workerUrl: v.string(),
        openRouterKey: v.optional(v.string()),
        updatedAt: v.string(),
    }).index('by_singleton', ['singletonKey']),

    // ========================================================================
    // SCAN LOGS TABLE (UNCHANGED)
    // ========================================================================
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

    // ========================================================================
    // TERMINAL SESSIONS TABLE (UNCHANGED)
    // ========================================================================
    terminal_sessions: defineTable({
        sessionId: v.string(),
        name: v.string(),
        type: v.union(
            v.literal('system'),
            v.literal('scan'),
            v.literal('interactive')
        ),
        status: v.union(v.literal('active'), v.literal('closed')),
        userId: v.string(),
        scanId: v.optional(v.id('scanRuns')),
        createdAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_status', ['userId', 'status'])
        .index('by_session_id', ['sessionId', 'userId']),

    // ========================================================================
    // TERMINAL LOGS TABLE (UNCHANGED)
    // ========================================================================
    terminal_logs: defineTable({
        sessionId: v.string(),
        content: v.string(),
        source: v.union(
            v.literal('stdout'),
            v.literal('stderr'),
            v.literal('stdin')
        ),
        timestamp: v.number(),
        userId: v.string(),
    })
        .index('by_session', ['sessionId'])
        .index('by_user_session', ['userId', 'sessionId']),

    // ========================================================================
    // SYSTEM STATUS TABLE (UNCHANGED)
    // ========================================================================
    system_status: defineTable({
        component: v.string(),
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
        lastChecked: v.number(),
        message: v.optional(v.string()),
    }).index('by_component', ['component']),

    // ========================================================================
    // AGENT RUNS TABLE (UNCHANGED)
    // ========================================================================
    agent_runs: defineTable({
        sessionId: v.string(),
        status: v.union(
            v.literal('thinking'),
            v.literal('executing'),
            v.literal('analyzing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        thought: v.optional(v.string()),
        logs: v.array(v.string()),
        finalResponse: v.optional(v.string()),
        currentTool: v.optional(v.string()),
        lastUpdated: v.number(),
        rawLogs: v.optional(v.array(v.string())),
        finalReport: v.optional(v.string()),
        history: v.optional(v.array(v.object({
            role: v.string(),
            content: v.string(),
        }))),
    })
        .index('by_session', ['sessionId']),

    // ========================================================================
    // CODE AUDITS TABLE
    // Static source-code analysis results from the Code Audit engine
    // ========================================================================
    code_audits: defineTable({
        repoUrl: v.string(),
        status: v.union(
            v.literal('pending'),
            v.literal('fetching'),
            v.literal('analyzing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        findings: v.optional(v.array(v.object({
            file: v.string(),
            line: v.number(),
            severity: v.union(
                v.literal('CRITICAL'),
                v.literal('HIGH'),
                v.literal('MEDIUM'),
                v.literal('LOW'),
                v.literal('INFO')
            ),
            title: v.string(),
            bad_code: v.string(),
            fixed_code: v.string(),
            explanation: v.string(),
        }))),
        filesAnalyzed: v.optional(v.array(v.string())),
        error: v.optional(v.string()),
        createdAt: v.string(),
        completedAt: v.optional(v.string()),
        userId: v.optional(v.string()),
    })
        .index('by_user', ['userId'])
        .index('by_status', ['status']),
});

