/**
 * Agent 2: Port Enumeration & Directory Discovery
 * 
 * Performs active scanning using Docker-based tools:
 * - nmap: Fast TCP port scan (-sT -Pn -F)
 * - gobuster: Directory brute-forcing (if web ports found)
 * 
 * Chains to Agent 3 if web ports (80, 443, 8080, 8443) are detected.
 * 
 * @trigger agent/info_gathering.completed
 */

import { inngest } from '../client.js';
import { convex } from '../../lib/convex.js';
import { workerManager, TOOL_TIMEOUTS } from '../../lib/docker.js';
import {
    runDockerCommand,
    updateScanStatus,
    logToConvex,
} from './shared.js';

// ============================================================================
// NMAP OUTPUT PARSER
// ============================================================================

interface PortResult {
    port: number;
    protocol: string;
    state: string;
    service: string;
    version?: string;
}

function parseNmapPorts(output: string): {
    hostStatus: 'up' | 'down' | 'unknown';
    ports: PortResult[];
    osGuess?: string;
} {
    const result = {
        hostStatus: 'unknown' as 'up' | 'down' | 'unknown',
        ports: [] as PortResult[],
    };

    const lines = output.split('\n');
    for (const line of lines) {
        // Host status
        if (line.includes('Host is up')) {
            result.hostStatus = 'up';
        }

        // Port lines: e.g. "80/tcp   open  http   Apache/2.4.41"
        const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)(?:\s+(.+))?/);
        if (portMatch) {
            result.ports.push({
                port: parseInt(portMatch[1], 10),
                protocol: portMatch[2],
                state: portMatch[3],
                service: portMatch[4],
                version: portMatch[5]?.trim(),
            });
        }

        // OS guess
        if (line.includes('OS details:') || line.includes('Running:')) {
            (result as any).osGuess = line.split(':').slice(1).join(':').trim();
        }
    }

    return result;
}

// ============================================================================
// GOBUSTER OUTPUT PARSER
// ============================================================================

interface DirectoryResult {
    path: string;
    statusCode: number;
    size?: number;
}

function parseGobusterOutput(output: string): DirectoryResult[] {
    const results: DirectoryResult[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        // Gobuster line format: /path  (Status: 200) [Size: 1234]
        const match = line.match(/^(\/\S+)\s+\(Status:\s*(\d+)\)(?:\s+\[Size:\s*(\d+)\])?/);
        if (match) {
            results.push({
                path: match[1],
                statusCode: parseInt(match[2], 10),
                size: match[3] ? parseInt(match[3], 10) : undefined,
            });
        }

        // Alternative format: /path    [Status=200, Size=1234]
        const altMatch = line.match(/^(\/\S+)\s+\[Status=(\d+)(?:,\s*Size=(\d+))?\]/);
        if (altMatch) {
            results.push({
                path: altMatch[1],
                statusCode: parseInt(altMatch[2], 10),
                size: altMatch[3] ? parseInt(altMatch[3], 10) : undefined,
            });
        }
    }

    return results;
}

// ============================================================================
// WEB PORT DETECTION
// ============================================================================

const WEB_PORTS = [80, 443, 8080, 8443, 3000, 3001, 5000, 8000, 8888, 9090];

function hasWebPorts(ports: PortResult[]): boolean {
    return ports.some(p => p.state === 'open' && WEB_PORTS.includes(p.port));
}

// ============================================================================
// AGENT 2: PORT ENUMERATION
// ============================================================================

export const agent2PortEnum = inngest.createFunction(
    {
        id: 'agent-2-port-enum',
        name: 'Agent 2: Port Enumeration',
        retries: 1,
        onFailure: async ({ event, error }) => {
            const { scanRunId } = event.data as any;
            console.error(`[AGENT2] Failed for ${scanRunId}:`, error);

            if (!scanRunId) return;

            try {
                await convex.mutation('scans:updateStatus' as any, {
                    id: scanRunId,
                    status: 'failed',
                    aiSummary: `### ❌ Port Enumeration Failed\n\n**Error:** ${error?.message || 'Unknown error during port scanning'}`,
                });
            } catch (e) {
                console.error('[AGENT2] Failed to update failure status:', e);
            }

            try {
                await workerManager.killContainer(scanRunId);
            } catch { /* ignore */ }
        },
    },
    { event: 'agent/info_gathering.completed' },
    async ({ event, step }) => {
        const { scanRunId, domain } = event.data;

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT2] Starting Port Enumeration for: ${domain}`);
        console.log(`[AGENT2] Scan Run ID: ${scanRunId}`);
        console.log(`${'═'.repeat(60)}\n`);

        // =====================================================================
        // INIT: Ensure Docker session is alive
        // =====================================================================
        await step.run('agent2-init-session', async () => {
            console.log('[AGENT2] Ensuring Docker session...');
            const started = await workerManager.startSession(scanRunId);
            if (!started) {
                throw new Error('CRITICAL: Docker session unavailable for Agent 2');
            }
            await logToConvex(scanRunId, 'info', 'port_inspection', '🔍 Agent 2: Port Enumeration starting...');
        });

        // Mark Stage 3 (port_inspection) as running
        await step.run('agent2-mark-running', async () => {
            await updateScanStatus(scanRunId, 2, 'running');
        });

        // =====================================================================
        // TOOL 1: Nmap Fast TCP Scan
        // =====================================================================
        const nmapResults = await step.run('agent2-nmap', async () => {
            console.log('[AGENT2] Running Nmap fast scan...');

            const nmapResult = await runDockerCommand({
                command: `nmap -sT -Pn -F --max-retries 1 --host-timeout 120s ${domain} 2>/dev/null`,
                scanRunId,
                stage: 'port_inspection',
                tool: 'nmap',
                timeout: TOOL_TIMEOUTS.nmap,
            });

            const parsed = parseNmapPorts(nmapResult.stdout);
            const openPorts = parsed.ports.filter(p => p.state === 'open');
            console.log(`[AGENT2] Nmap: Host=${parsed.hostStatus}, Open Ports=${openPorts.length}`);

            return parsed;
        });

        // Save port metrics to Convex
        await step.run('agent2-save-port-metrics', async () => {
            const openPorts = nmapResults.ports.filter(p => p.state === 'open');
            await convex.mutation('scans:updateStatus' as any, {
                id: scanRunId,
                totalPorts: openPorts.length,
                hostCount: nmapResults.hostStatus === 'up' ? 1 : 0,
            });

            // Also save ports to intel_data if it exists
            try {
                const target = await convex.query('targets:getByDomain' as any, { domain });
                if (target) {
                    const intelRecord = await convex.query('intel:getByScan' as any, { scanRunId });
                    if (intelRecord) {
                        await convex.mutation('intel:update' as any, {
                            id: intelRecord._id,
                            ports: openPorts.map((p: PortResult) => ({
                                port: p.port,
                                protocol: p.protocol,
                                state: p.state,
                                service: p.service,
                                version: p.version,
                            })),
                        });
                    }
                }
            } catch (e) {
                console.warn('[AGENT2] Could not update intel_data with ports:', e);
            }
        });

        // =====================================================================
        // TOOL 2: Gobuster Directory Scan (only if web ports found)
        // =====================================================================
        const webPortsFound = hasWebPorts(nmapResults.ports);
        let gobusterResults: DirectoryResult[] = [];

        if (webPortsFound) {
            gobusterResults = await step.run('agent2-gobuster', async () => {
                console.log('[AGENT2] Web ports detected, running Gobuster...');

                const gobusterResult = await runDockerCommand({
                    command: `gobuster dir -u https://${domain} -w /usr/share/wordlists/dirb/common.txt -t 20 --timeout 10s -q --no-error 2>/dev/null | head -30`,
                    scanRunId,
                    stage: 'paths_files',
                    tool: 'dirsearch',
                    timeout: 120_000,
                });

                const dirs = parseGobusterOutput(gobusterResult.stdout);
                console.log(`[AGENT2] Gobuster: Found ${dirs.length} directories`);

                return dirs;
            });
        } else {
            await step.run('agent2-skip-gobuster', async () => {
                console.log('[AGENT2] No web ports found, skipping Gobuster');
                await logToConvex(scanRunId, 'info', 'paths_files', '⏭️ No web ports detected — skipping directory scan');
            });
        }

        // =====================================================================
        // CHAIN: Emit event for Agent 3 if web ports found
        // =====================================================================
        await step.run('agent2-chain-agent3', async () => {
            if (webPortsFound) {
                const openPorts = nmapResults.ports.filter(p => p.state === 'open');
                console.log(`[AGENT2] 🔗 Chaining to Agent 3 — ${openPorts.length} open ports, web ports detected`);

                await inngest.send({
                    name: 'agent3.triggered',
                    data: {
                        scanRunId,
                        domain,
                        openPorts: openPorts.map(p => ({
                            port: p.port,
                            protocol: p.protocol,
                            service: p.service,
                        })),
                        directories: gobusterResults,
                    },
                });

                await logToConvex(scanRunId, 'info', 'port_inspection', '🔗 Chaining to Agent 3 (Vulnerability Scanning)...');
            } else {
                console.log('[AGENT2] No web ports — Agent 3 will NOT be triggered');
                await logToConvex(
                    scanRunId,
                    'info',
                    'port_inspection',
                    '⚠️ No web ports found. Vulnerability scanning skipped. The target may only expose non-HTTP services.'
                );
            }
        });

        // =====================================================================
        // COMPLETE: Mark port inspection done
        // =====================================================================
        await step.run('agent2-complete', async () => {
            await updateScanStatus(scanRunId, 2, 'done');

            const openPorts = nmapResults.ports.filter(p => p.state === 'open');
            await logToConvex(
                scanRunId,
                'info',
                'port_inspection',
                `✅ Agent 2 Complete — Open Ports: ${openPorts.length}, ` +
                `Directories: ${gobusterResults.length}, ` +
                `Web Ports: ${webPortsFound ? 'Yes → Agent 3 triggered' : 'No'}`
            );
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT2] ✅ Port Enumeration complete for: ${domain}`);
        console.log(`[AGENT2] Open Ports: ${nmapResults.ports.filter(p => p.state === 'open').length}`);
        console.log(`[AGENT2] Directories: ${gobusterResults.length}`);
        console.log(`[AGENT2] Agent 3 Triggered: ${webPortsFound}`);
        console.log(`${'═'.repeat(60)}\n`);

        return {
            success: true,
            domain,
            scanRunId,
            hostStatus: nmapResults.hostStatus,
            ports: nmapResults.ports,
            directories: gobusterResults,
            agent3Triggered: webPortsFound,
        };
    }
);
