/**
 * Shared Agent Utilities
 * 
 * Common helpers extracted from the monolithic pipeline for reuse
 * across all agent functions (Agent 1, 2, 3, etc.)
 */

import { convex } from '../../lib/convex.js';
import { workerManager, type ToolExecutionResult } from '../../lib/docker.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const STAGES = [
    'info_gathering',
    'live_recon',
    'port_inspection',
    'enumeration',
    'protection_headers',
    'paths_files',
    'tech_detection',
    'vuln_scanning',
    'reporting',
] as const;

export type StageName = (typeof STAGES)[number];

// ============================================================================
// PROGRESS HELPERS
// ============================================================================

export function calculateProgress(stageIndex: number): number {
    return Math.round(((stageIndex + 1) / STAGES.length) * 100);
}

export function buildStageStatus(
    currentIndex: number,
    currentStatus: 'running' | 'done' | 'failed'
): Record<StageName, string> {
    const status: Record<string, string> = {};
    STAGES.forEach((stage, idx) => {
        if (idx < currentIndex) {
            status[stage] = 'done';
        } else if (idx === currentIndex) {
            status[stage] = currentStatus;
        } else {
            status[stage] = 'pending';
        }
    });
    return status as Record<StageName, string>;
}

// ============================================================================
// CONVEX UPDATE HELPERS
// ============================================================================

/**
 * Update scan status in Convex (progress, stage, status)
 */
export async function updateScanStatus(
    scanRunId: string,
    stageIndex: number,
    stageStatus: 'running' | 'done' | 'failed',
    scanStatus?: 'scanning' | 'completed' | 'failed'
): Promise<void> {
    await convex.mutation('scans:updateStatus' as any, {
        id: scanRunId,
        currentStage: STAGES[stageIndex],
        progress: calculateProgress(stageIndex),
        stageStatus: buildStageStatus(stageIndex, stageStatus),
        ...(scanStatus && { status: scanStatus }),
    });
}

/**
 * Log a message to Convex scanLogs
 */
export async function logToConvex(
    scanRunId: string,
    level: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string
): Promise<void> {
    try {
        await convex.mutation('scanLogs:add' as any, {
            scanRunId,
            level,
            source,
            message,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[AGENT] Log to Convex failed:', error);
    }
}

// ============================================================================
// DOCKER COMMAND WRAPPER
// ============================================================================

export interface RunCommandOptions {
    command: string;
    scanRunId: string;
    stage: string;
    tool: string;
    timeout?: number;
    parser?: (output: string) => any;
}

/**
 * Run a command in the Docker session container with automatic logging to Convex.
 * Wraps workerManager.runToolInSession with structured error handling.
 */
export async function runDockerCommand<T = any>(
    options: RunCommandOptions
): Promise<ToolExecutionResult<T>> {
    const { command, scanRunId, stage, tool, timeout, parser } = options;

    console.log(`[AGENT] Running: ${command}`);
    await logToConvex(scanRunId, 'info', stage, `[${tool.toUpperCase()}] Executing: ${command}`);

    try {
        const result = await workerManager.runToolInSession<T>({
            command,
            scanRunId,
            stage,
            tool,
            ...(timeout && { timeout }),
            ...(parser && { parser }),
        });

        if (result.success) {
            await logToConvex(
                scanRunId,
                'info',
                stage,
                `[${tool.toUpperCase()}] Completed in ${result.duration}ms (${result.stdout.split('\n').length} lines)`
            );
        } else if (result.timedOut) {
            await logToConvex(
                scanRunId,
                'warning',
                stage,
                `[${tool.toUpperCase()}] Timed out after ${result.duration}ms`
            );
        } else {
            await logToConvex(
                scanRunId,
                'error',
                stage,
                `[${tool.toUpperCase()}] Failed (exit: ${result.exitCode})`
            );
        }

        return result;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[AGENT] Command failed: ${errorMsg}`);
        await logToConvex(scanRunId, 'critical', stage, `[${tool.toUpperCase()}] CRITICAL: ${errorMsg}`);
        throw error;
    }
}

// ============================================================================
// OUTPUT PARSERS FOR AGENT 1 (Recon)
// ============================================================================

/**
 * Parse `dig` output into structured DNS records
 */
export function parseDig(output: string): {
    aRecords: string[];
    aaaaRecords: string[];
    cnameRecords: string[];
    mxRecords: string[];
    nsRecords: string[];
    txtRecords: string[];
} {
    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    const result = {
        aRecords: [] as string[],
        aaaaRecords: [] as string[],
        cnameRecords: [] as string[],
        mxRecords: [] as string[],
        nsRecords: [] as string[],
        txtRecords: [] as string[],
    };

    for (const line of lines) {
        // Skip comments and headers
        if (line.startsWith(';') || line.startsWith(';;')) continue;

        // IPv4 address
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(line)) {
            result.aRecords.push(line);
        }
        // IPv6 address
        else if (line.includes(':') && /^[0-9a-fA-F:]+$/.test(line)) {
            result.aaaaRecords.push(line);
        }
        // CNAME (ends with a dot typically)
        else if (line.endsWith('.') && !line.includes(' ')) {
            result.cnameRecords.push(line.replace(/\.$/, ''));
        }
        // MX record (starts with priority number)
        else if (/^\d+\s+/.test(line)) {
            result.mxRecords.push(line);
        }
        // NS record
        else if (line.includes('ns') || line.includes('dns')) {
            result.nsRecords.push(line.replace(/\.$/, ''));
        }
        // TXT record
        else if (line.startsWith('"') || line.startsWith('v=')) {
            result.txtRecords.push(line.replace(/^"|"$/g, ''));
        }
    }

    return result;
}

/**
 * Parse `whois` output into structured registration data
 */
export function parseWhois(output: string): {
    registrar?: string;
    registrantOrg?: string;
    creationDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    nameServers: string[];
    status: string[];
    dnssec?: string;
} {
    const result = {
        nameServers: [] as string[],
        status: [] as string[],
    } as any;

    const lines = output.split('\n');
    for (const line of lines) {
        const lower = line.toLowerCase().trim();

        if (lower.startsWith('registrar:') || lower.startsWith('registrar name:')) {
            result.registrar = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('registrant organization:') || lower.startsWith('registrant org:')) {
            result.registrantOrg = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('creation date:') || lower.startsWith('created:')) {
            result.creationDate = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('registry expiry date:') || lower.startsWith('expiry date:') || lower.startsWith('expires:')) {
            result.expirationDate = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('updated date:') || lower.startsWith('last updated:')) {
            result.updatedDate = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('name server:') || lower.startsWith('nserver:')) {
            const ns = line.split(':').slice(1).join(':').trim().toLowerCase();
            if (ns && !result.nameServers.includes(ns)) {
                result.nameServers.push(ns);
            }
        }
        if (lower.startsWith('domain status:') || lower.startsWith('status:')) {
            const status = line.split(':').slice(1).join(':').trim();
            if (status) result.status.push(status.split(' ')[0]);
        }
        if (lower.startsWith('dnssec:')) {
            result.dnssec = line.split(':').slice(1).join(':').trim();
        }
    }

    return result;
}

/**
 * Parse `subfinder` output into subdomain list
 */
export function parseSubdomains(output: string): Array<{ subdomain: string; source: string }> {
    return output
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('[') && l.includes('.'))
        .map(subdomain => ({ subdomain, source: 'subfinder' }));
}

/**
 * Parse `curl -I` (HTTP headers) output into structured data
 */
export function parseHttpHeaders(output: string): {
    statusCode?: number;
    server?: string;
    poweredBy?: string;
    redirectChain: string[];
    tlsVersion?: string;
} {
    const result = {
        redirectChain: [] as string[],
    } as any;

    const lines = output.split('\n');
    for (const line of lines) {
        const lower = line.toLowerCase().trim();

        // HTTP status line
        if (lower.startsWith('http/')) {
            const parts = line.trim().split(/\s+/);
            const code = parseInt(parts[1], 10);
            if (!isNaN(code)) result.statusCode = code;
        }
        if (lower.startsWith('server:')) {
            result.server = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('x-powered-by:')) {
            result.poweredBy = line.split(':').slice(1).join(':').trim();
        }
        if (lower.startsWith('location:')) {
            result.redirectChain.push(line.split(':').slice(1).join(':').trim());
        }
    }

    return result;
}
