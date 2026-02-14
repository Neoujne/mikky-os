/**
 * Agent 3: Vulnerability Scanning
 * 
 * Performs vulnerability scanning using Docker-based tools:
 * - nuclei: Template-based vulnerability detection
 * - nikto: Web server misconfiguration scanner
 * 
 * Saves findings to the `vulnerabilities` table in Convex.
 * 
 * @trigger agent3.triggered (chained from Agent 2 when web ports found)
 */

import { inngest } from '../client.js';
import { convex } from '../../lib/convex.js';
import { workerManager, TOOL_TIMEOUTS, type ToolExecutionResult } from '../../lib/docker.js';
import {
    runDockerCommand,
    updateScanStatus,
    logToConvex,
    type RunCommandOptions,
} from './shared.js';

// ============================================================================
// NUCLEI OUTPUT PARSER
// ============================================================================

type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

interface NucleiVuln {
    templateId: string;
    title: string;
    severity: Severity;
    url: string;
    matcher?: string;
    description?: string;
    reference?: string[];
}

function parseNucleiOutput(output: string): NucleiVuln[] {
    const vulns: NucleiVuln[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        if (!line.trim() || line.startsWith('[INF]') || line.startsWith('[WRN]')) continue;

        // Nuclei output format: [template-id] [severity] [protocol] URL [matched-at]
        // Example: [tech-detect:nginx] [info] [http] https://example.com [matched: nginx]
        const match = line.match(/\[([^\]]+)\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(\S+)(?:\s+\[(.+)\])?/);
        if (match) {
            const severity = match[2].toLowerCase() as Severity;
            if (['info', 'low', 'medium', 'high', 'critical'].includes(severity)) {
                vulns.push({
                    templateId: match[1],
                    title: match[1].replace(/[:-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    severity,
                    url: match[4],
                    matcher: match[5],
                });
            }
        }

        // Alternative JSON format: nuclei -jsonl output
        try {
            if (line.startsWith('{')) {
                const json = JSON.parse(line);
                if (json.info && json['template-id']) {
                    vulns.push({
                        templateId: json['template-id'],
                        title: json.info.name || json['template-id'],
                        severity: (json.info.severity || 'info').toLowerCase() as Severity,
                        url: json.host || json.matched || '',
                        matcher: json['matcher-name'],
                        description: json.info.description,
                        reference: json.info.reference,
                    });
                }
            }
        } catch {
            // Not JSON, ignore
        }
    }

    return vulns;
}

// ============================================================================
// NIKTO OUTPUT PARSER
// ============================================================================

interface NiktoVuln {
    title: string;
    url: string;
    method?: string;
    description: string;
    reference?: string[];
}

function parseNiktoOutput(output: string): NiktoVuln[] {
    const vulns: NiktoVuln[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        // Nikto output: + /path: Description text
        // Example: + /admin/: Directory indexing found.
        const match = line.match(/^\+\s+(\S+):\s+(.+)/);
        if (match) {
            // Skip informational lines
            const desc = match[2].trim();
            if (desc.toLowerCase().includes('server:') || desc.toLowerCase().includes('retrieved')) continue;
            if (desc.length < 10) continue;

            vulns.push({
                title: desc.substring(0, 100),
                url: match[1],
                description: desc,
            });
        }

        // Alternative: OSVDB format
        const osvdbMatch = line.match(/^\+\s+OSVDB-(\d+):\s+(\S+):\s+(.+)/);
        if (osvdbMatch) {
            vulns.push({
                title: osvdbMatch[3].substring(0, 100),
                url: osvdbMatch[2],
                description: osvdbMatch[3],
                reference: [`OSVDB-${osvdbMatch[1]}`],
            });
        }
    }

    return vulns;
}

// ============================================================================
// SESSION RECOVERY: Retry wrapper for container 404s
// ============================================================================

/**
 * Run a Docker command with automatic session recovery.
 * If the command fails with HTTP 404 (container gone), spins up a fresh
 * container via ensureSessionAlive and retries once.
 */
async function runWithRecovery<T = any>(
    options: RunCommandOptions
): Promise<ToolExecutionResult<T>> {
    try {
        return await runDockerCommand<T>(options);
    } catch (error: any) {
        const is404 = error.statusCode === 404
            || error.message?.includes('No such container')
            || error.message?.includes('404');

        if (!is404) throw error;

        // Container is gone — recover
        console.warn(`[AGENT3] ⚠️ Container missing (404). Starting fresh session...`);
        await logToConvex(
            options.scanRunId,
            'warning',
            options.stage,
            '⚠️ Container missing. Starting fresh session for Agent 3.'
        );

        const recovered = await workerManager.ensureSessionAlive(options.scanRunId);
        if (!recovered) {
            throw new Error('CRITICAL: Session recovery failed — could not start fresh container');
        }

        await logToConvex(
            options.scanRunId,
            'info',
            options.stage,
            '✅ Session recovered. Retrying command...'
        );

        // Retry once with the fresh session
        return await runDockerCommand<T>(options);
    }
}

// ============================================================================
// AGENT 3: VULNERABILITY SCANNING
// ============================================================================

export const agent3VulnScan = inngest.createFunction(
    {
        id: 'agent-3-vuln-scan',
        name: 'Agent 3: Vulnerability Scanning',
        retries: 1,
        onFailure: async ({ event, error }) => {
            const { scanRunId } = event.data as any;
            console.error(`[AGENT3] Failed for ${scanRunId}:`, error);

            if (!scanRunId) return;

            try {
                await convex.mutation('scans:updateStatus' as any, {
                    id: scanRunId,
                    status: 'failed',
                    aiSummary: `### ❌ Vulnerability Scan Failed\n\n**Error:** ${error?.message || 'Unknown error during vulnerability scanning'}`,
                });
            } catch (e) {
                console.error('[AGENT3] Failed to update failure status:', e);
            }

            try {
                await workerManager.killContainer(scanRunId);
            } catch { /* ignore */ }
        },
    },
    { event: 'agent3.triggered' },
    async ({ event, step }) => {
        const { scanRunId, domain, openPorts, directories } = event.data;

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT3] Starting Vulnerability Scanning for: ${domain}`);
        console.log(`[AGENT3] Scan Run ID: ${scanRunId}`);
        console.log(`[AGENT3] Open Ports: ${openPorts?.length || 0}`);
        console.log(`${'═'.repeat(60)}\n`);

        // =====================================================================
        // INIT: Verify Docker session is alive (recover if container gone)
        // =====================================================================
        await step.run('agent3-init-session', async () => {
            console.log('[AGENT3] Verifying Docker session is alive...');
            const alive = await workerManager.ensureSessionAlive(scanRunId);
            if (!alive) {
                throw new Error('CRITICAL: Docker session unavailable for Agent 3 — recovery failed');
            }
            await logToConvex(scanRunId, 'info', 'vuln_scanning', '🛡️ Agent 3: Vulnerability Scanning starting (session verified)');
        });

        // Mark Stage 8 (vuln_scanning) as running
        await step.run('agent3-mark-running', async () => {
            await updateScanStatus(scanRunId, 7, 'running');
        });

        // =====================================================================
        // RESOLVE: Get targetId for saving vulns
        // =====================================================================
        const targetId = await step.run('agent3-resolve-target', async () => {
            try {
                const target = await convex.query('targets:getByDomain' as any, { domain });
                return target?._id || null;
            } catch (e) {
                console.warn('[AGENT3] Could not resolve targetId:', e);
                return null;
            }
        });

        // =====================================================================
        // TOOL 1: Nuclei Vulnerability Scan
        // =====================================================================
        const nucleiResults = await step.run('agent3-nuclei', async () => {
            console.log('[AGENT3] Running Nuclei vulnerability scan...');

            const nucleiResult = await runWithRecovery({
                command: `nuclei -u https://${domain} -severity low,medium,high -silent -timeout 2 -retries 1 -rate-limit 25 2>/dev/null | head -50`,
                scanRunId,
                stage: 'vuln_scanning',
                tool: 'nuclei',
                timeout: TOOL_TIMEOUTS.nuclei,
            });

            const vulns = parseNucleiOutput(nucleiResult.stdout);
            console.log(`[AGENT3] Nuclei: Found ${vulns.length} vulnerabilities`);

            return vulns;
        });

        // =====================================================================
        // TOOL 2: Nikto Web Server Scanner
        // =====================================================================
        const niktoResults = await step.run('agent3-nikto', async () => {
            console.log('[AGENT3] Running Nikto web server scan...');

            const niktoResult = await runWithRecovery({
                command: `nikto -h https://${domain} -timeout 10 -maxtime 60 -nointeractive 2>/dev/null | head -40`,
                scanRunId,
                stage: 'vuln_scanning',
                tool: 'nuclei', // reuse nuclei timeout
                timeout: 180_000,
            });

            const vulns = parseNiktoOutput(niktoResult.stdout);
            console.log(`[AGENT3] Nikto: Found ${vulns.length} issues`);

            return vulns;
        });

        // =====================================================================
        // SAVE: Write vulnerabilities to Convex
        // =====================================================================
        const savedCount = await step.run('agent3-save-vulns', async () => {
            if (!targetId) {
                console.warn('[AGENT3] No targetId — cannot save vulnerabilities');
                await logToConvex(scanRunId, 'warning', 'vuln_scanning', 'Could not resolve targetId — vulns not persisted');
                return 0;
            }

            const now = new Date().toISOString();
            const allVulns: any[] = [];

            // Nuclei vulns
            for (const vuln of nucleiResults) {
                allVulns.push({
                    targetId,
                    scanRunId,
                    targetDomain: domain,
                    title: vuln.title,
                    severity: vuln.severity,
                    description: vuln.description || `Detected by Nuclei template: ${vuln.templateId}`,
                    source: 'nuclei',
                    templateId: vuln.templateId,
                    matcher: vuln.matcher,
                    url: vuln.url,
                    evidence: `Template: ${vuln.templateId}, Matched: ${vuln.matcher || 'N/A'}`,
                    reference: vuln.reference,
                    status: 'open' as const,
                    foundAt: now,
                });
            }

            // Nikto vulns (classified as medium by default)
            for (const vuln of niktoResults) {
                allVulns.push({
                    targetId,
                    scanRunId,
                    targetDomain: domain,
                    title: vuln.title,
                    severity: 'medium' as const,
                    description: vuln.description,
                    source: 'nikto',
                    url: vuln.url.startsWith('http') ? vuln.url : `https://${domain}${vuln.url}`,
                    evidence: vuln.description,
                    reference: vuln.reference,
                    status: 'open' as const,
                    foundAt: now,
                });
            }

            if (allVulns.length === 0) {
                console.log('[AGENT3] No vulnerabilities found — nothing to save');
                return 0;
            }

            // Save in batches of 10 to avoid Convex limits
            let saved = 0;
            const BATCH_SIZE = 10;
            for (let i = 0; i < allVulns.length; i += BATCH_SIZE) {
                const batch = allVulns.slice(i, i + BATCH_SIZE);
                try {
                    await convex.mutation('vulnerabilities:createBatch' as any, { vulns: batch });
                    saved += batch.length;
                } catch (error) {
                    console.error(`[AGENT3] Failed to save batch ${i}/${allVulns.length}:`, error);
                    // Try individual saves as fallback
                    for (const v of batch) {
                        try {
                            await convex.mutation('vulnerabilities:create' as any, v);
                            saved++;
                        } catch {
                            console.error(`[AGENT3] Failed to save individual vuln: ${v.title}`);
                        }
                    }
                }
            }

            console.log(`[AGENT3] Saved ${saved}/${allVulns.length} vulnerabilities`);
            return saved;
        });

        // =====================================================================
        // UPDATE: Update scan with vuln count
        // =====================================================================
        await step.run('agent3-update-scan-metrics', async () => {
            const totalVulns = nucleiResults.length + niktoResults.length;

            // Count by severity
            const severityCounts = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
            for (const v of nucleiResults) {
                severityCounts[v.severity]++;
            }
            severityCounts.medium += niktoResults.length; // Nikto default severity

            await convex.mutation('scans:updateStatus' as any, {
                id: scanRunId,
                vulnCount: totalVulns,
            });

            await logToConvex(
                scanRunId,
                'info',
                'vuln_scanning',
                `📊 Vulnerability Summary: ${totalVulns} total ` +
                `(Critical: ${severityCounts.critical}, High: ${severityCounts.high}, ` +
                `Medium: ${severityCounts.medium}, Low: ${severityCounts.low}, Info: ${severityCounts.info})`
            );
        });

        // =====================================================================
        // COMPLETE: Mark vuln scanning done
        // =====================================================================
        await step.run('agent3-complete', async () => {
            await updateScanStatus(scanRunId, 7, 'done');
            await logToConvex(
                scanRunId,
                'info',
                'vuln_scanning',
                `✅ Agent 3 Complete — Nuclei: ${nucleiResults.length} vulns, ` +
                `Nikto: ${niktoResults.length} issues, ` +
                `Saved: ${savedCount}`
            );
        });

        // =====================================================================
        // CLEANUP: Kill Docker container to free RAM
        // =====================================================================
        await step.run('cleanup-session', async () => {
            await workerManager.endSession(scanRunId);
            console.log(`[AGENT3] Session cleaned up for: ${scanRunId}`);
        });

        // =====================================================================
        // EMIT: Trigger Reporting Stage
        // =====================================================================
        await step.run('agent3-emit-complete', async () => {
            await inngest.send({
                name: 'agent/vuln_scan.completed',
                data: {
                    scanRunId,
                    domain,
                    vulnCount: nucleiResults.length + niktoResults.length,
                    nucleiVulns: nucleiResults.length,
                    niktoIssues: niktoResults.length,
                    totalSaved: savedCount,
                },
            });
            console.log(`[AGENT3] Emitted agent/vuln_scan.completed → Reporting stage`);
            await logToConvex(scanRunId, 'info', 'vuln_scanning', '📡 Handed off to Reporting Stage');
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT3] ✅ Vulnerability Scanning complete for: ${domain}`);
        console.log(`[AGENT3] Nuclei: ${nucleiResults.length} vulns`);
        console.log(`[AGENT3] Nikto: ${niktoResults.length} issues`);
        console.log(`[AGENT3] Saved: ${savedCount} to Convex`);
        console.log(`${'═'.repeat(60)}\n`);

        return {
            success: true,
            domain,
            scanRunId,
            nucleiVulns: nucleiResults.length,
            niktoIssues: niktoResults.length,
            totalSaved: savedCount,
        };
    }
);
