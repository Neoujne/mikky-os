/**
 * Agent 1: Information Gathering (Passive Recon)
 * 
 * Performs passive reconnaissance using Docker-based tools:
 * - dig: DNS record enumeration
 * - whois: Domain registration data
 * - subfinder: Subdomain discovery
 * - curl: HTTP header probe
 * 
 * Results are saved to the `intel_data` table in Convex.
 * 
 * @trigger scan.initiated
 */

import { inngest } from '../client.js';
import { convex } from '../../lib/convex.js';
import { workerManager } from '../../lib/docker.js';
import {
    runDockerCommand,
    updateScanStatus,
    logToConvex,
    parseDig,
    parseWhois,
    parseSubdomains,
    parseHttpHeaders,
} from './shared.js';

// ============================================================================
// AGENT 1: PASSIVE RECON
// ============================================================================

export const agent1InfoGathering = inngest.createFunction(
    {
        id: 'agent-1-info-gathering',
        name: 'Agent 1: Information Gathering',
        retries: 1,
        onFailure: async ({ event, error }) => {
            const { scanRunId } = event.data as any;
            console.error(`[AGENT1] Failed for ${scanRunId}:`, error);

            if (!scanRunId) return;

            try {
                await convex.mutation('scans:updateStatus' as any, {
                    id: scanRunId,
                    status: 'failed',
                    aiSummary: `### ❌ Recon Failed\n\n**Error:** ${error?.message || 'Unknown error during information gathering'}`,
                });
            } catch (e) {
                console.error('[AGENT1] Failed to update failure status:', e);
            }

            // Kill container on failure
            try {
                await workerManager.killContainer(scanRunId);
            } catch {
                // Ignore
            }
        },
    },
    { event: 'scan.initiated' },
    async ({ event, step }) => {
        const { scanRunId, domain } = event.data;

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT1] Starting Passive Recon for: ${domain}`);
        console.log(`[AGENT1] Scan Run ID: ${scanRunId}`);
        console.log(`${'═'.repeat(60)}\n`);

        // =====================================================================
        // INIT: Start Docker session container
        // =====================================================================
        await step.run('agent1-init-session', async () => {
            console.log('[AGENT1] Starting Docker session...');
            const started = await workerManager.startSession(scanRunId);
            if (!started) {
                throw new Error('CRITICAL: Failed to start Docker session. Is Docker Desktop running?');
            }
            await logToConvex(scanRunId, 'info', 'info_gathering', '🔍 Agent 1: Passive Recon starting...');
        });

        // Mark Stage 1 as running
        await step.run('agent1-mark-running', async () => {
            await updateScanStatus(scanRunId, 0, 'running', 'scanning');
        });

        // =====================================================================
        // TOOL 1: DNS Enumeration (dig)
        // =====================================================================
        const dnsResults = await step.run('agent1-dig', async () => {
            console.log('[AGENT1] Running DNS enumeration...');

            // A records
            const digA = await runDockerCommand({
                command: `dig ${domain} A +short 2>/dev/null`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'dig',
            });

            // MX records
            const digMX = await runDockerCommand({
                command: `dig ${domain} MX +short 2>/dev/null`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'dig',
            });

            // NS records
            const digNS = await runDockerCommand({
                command: `dig ${domain} NS +short 2>/dev/null`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'dig',
            });

            // TXT records
            const digTXT = await runDockerCommand({
                command: `dig ${domain} TXT +short 2>/dev/null`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'dig',
            });

            // Parse all results
            const aRecords = digA.stdout.split('\n').map(l => l.trim()).filter(Boolean);
            const mxRecords = digMX.stdout.split('\n').map(l => l.trim()).filter(Boolean);
            const nsRecords = digNS.stdout.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(';'));
            const txtRecords = digTXT.stdout.split('\n').map(l => l.trim()).filter(Boolean);

            console.log(`[AGENT1] DNS: ${aRecords.length} A, ${mxRecords.length} MX, ${nsRecords.length} NS, ${txtRecords.length} TXT`);

            return {
                aRecords,
                aaaaRecords: [] as string[],
                mxRecords,
                nsRecords,
                txtRecords,
                cnameRecords: [] as string[],
            };
        });

        // =====================================================================
        // TOOL 2: Whois Lookup
        // =====================================================================
        const whoisResults = await step.run('agent1-whois', async () => {
            console.log('[AGENT1] Running WHOIS lookup...');

            const whoisResult = await runDockerCommand({
                command: `whois ${domain} 2>/dev/null | head -80`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'whois',
            });

            const parsed = parseWhois(whoisResult.stdout);
            console.log(`[AGENT1] WHOIS: Registrar=${parsed.registrar || 'N/A'}, NS=${parsed.nameServers.length}`);

            return parsed;
        });

        // =====================================================================
        // TOOL 3: Subdomain Discovery (subfinder)
        // =====================================================================
        const subdomainResults = await step.run('agent1-subfinder', async () => {
            console.log('[AGENT1] Running subdomain discovery...');

            const subfinderResult = await runDockerCommand({
                command: `subfinder -d ${domain} -silent -timeout 60 2>/dev/null | head -50`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'subfinder',
                timeout: 120_000,
            });

            const subdomains = parseSubdomains(subfinderResult.stdout);
            console.log(`[AGENT1] Subdomains: Found ${subdomains.length}`);

            return subdomains;
        });

        // =====================================================================
        // TOOL 4: HTTP Header Probe (curl)
        // =====================================================================
        const httpProbeResults = await step.run('agent1-curl-headers', async () => {
            console.log('[AGENT1] Running HTTP header probe...');

            const curlResult = await runDockerCommand({
                command: `curl -sI --connect-timeout 10 -L https://${domain} 2>/dev/null | head -30`,
                scanRunId,
                stage: 'info_gathering',
                tool: 'curl',
            });

            const parsed = parseHttpHeaders(curlResult.stdout);
            console.log(`[AGENT1] HTTP: Status=${parsed.statusCode || 'N/A'}, Server=${parsed.server || 'N/A'}`);

            // ── Extract technologies from HTTP headers ──────────────────
            const technologies: { name: string; category: string; version: string; confidence: number }[] = [];

            if (parsed.server) {
                // Server header often has format "nginx/1.2.3" or just "hcdn"
                const parts = parsed.server.split('/');
                technologies.push({
                    name: parts[0].trim(),
                    category: 'Web Server',
                    version: parts[1]?.trim() || '',
                    confidence: 90,
                });
            }

            if (parsed.poweredBy) {
                const parts = parsed.poweredBy.split('/');
                technologies.push({
                    name: parts[0].trim(),
                    category: 'Language/Framework',
                    version: parts[1]?.trim() || '',
                    confidence: 90,
                });
            }

            // Scan all raw headers for extra tech clues
            const rawHeaders = curlResult.stdout.toLowerCase();
            if (rawHeaders.includes('x-aspnet-version')) {
                technologies.push({ name: 'ASP.NET', category: 'Framework', version: '', confidence: 80 });
            }
            if (rawHeaders.includes('x-drupal') || rawHeaders.includes('x-generator: drupal')) {
                technologies.push({ name: 'Drupal', category: 'CMS', version: '', confidence: 80 });
            }
            if (rawHeaders.includes('x-wordpress') || rawHeaders.includes('x-pingback')) {
                technologies.push({ name: 'WordPress', category: 'CMS', version: '', confidence: 70 });
            }
            if (rawHeaders.includes('x-shopify')) {
                technologies.push({ name: 'Shopify', category: 'E-Commerce', version: '', confidence: 85 });
            }

            console.log(`[AGENT1] Technologies detected from headers: ${technologies.length}`);

            return { ...parsed, technologies };
        });

        // =====================================================================
        // TOOL 5: Ping Probe (network data for Network Map)
        // =====================================================================
        const networkResults = await step.run('agent1-ping-probe', async () => {
            console.log('[AGENT1] Running ping probe for network data...');

            // Resolve IP for target
            const resolvedIp = dnsResults.aRecords.length > 0 ? dnsResults.aRecords[0] : null;

            // Try ping (may fail in some Docker environments)
            let pingStats: { transmitted: number; received: number; lossPercent: number; avgRttMs?: number } | null = null;
            try {
                const pingResult = await runDockerCommand({
                    command: `ping -c 3 -W 5 ${domain} 2>/dev/null`,
                    scanRunId,
                    stage: 'info_gathering',
                    tool: 'ping',
                    timeout: 30_000,
                });

                // Parse ping output
                const output = pingResult.stdout;
                const statsMatch = output.match(/(\d+) packets transmitted, (\d+) (?:packets )?received, (\d+(?:\.\d+)?)% packet loss/);
                const rttMatch = output.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
                // Also try alternate format "round-trip min/avg/max/stddev"
                const rttMatch2 = output.match(/round-trip min\/avg\/max\/(?:std-dev|stddev) = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);

                if (statsMatch) {
                    pingStats = {
                        transmitted: parseInt(statsMatch[1]),
                        received: parseInt(statsMatch[2]),
                        lossPercent: parseFloat(statsMatch[3]),
                        avgRttMs: rttMatch ? parseFloat(rttMatch[2]) : (rttMatch2 ? parseFloat(rttMatch2[2]) : undefined),
                    };
                }

                console.log(`[AGENT1] Ping: ${pingStats ? `${pingStats.received}/${pingStats.transmitted} received, ${pingStats.avgRttMs ?? '?'}ms avg` : 'parse failed'}`);
            } catch (e) {
                console.warn('[AGENT1] Ping failed (expected in some environments):', e);
            }

            // Build minimal traceroute data from what we know
            // At minimum: source → target IP (gives the Network Map at least 1 node)
            const traceroute: { hop: number; ip?: string; hostname?: string; rtt?: string }[] = [];

            if (resolvedIp) {
                traceroute.push({
                    hop: 1,
                    ip: resolvedIp,
                    hostname: domain,
                    rtt: pingStats?.avgRttMs ? `${pingStats.avgRttMs}ms` : undefined,
                });
            }

            return {
                traceroute,
                pingStats: pingStats || undefined,
            };
        });

        // =====================================================================
        // SAVE: Write structured results to intel_data table
        // =====================================================================
        const intelId = await step.run('agent1-save-intel', async () => {
            console.log('[AGENT1] Saving intel data to Convex...');

            // Get the target ID from the scan run
            let targetId: string | null = null;
            try {
                const scanRun = await convex.query('scans:getStatus' as any, { id: scanRunId });
                // We need the targetId from scanRuns - query it differently
                const target = await convex.query('targets:getByDomain' as any, { domain });
                targetId = target?._id || null;
            } catch (e) {
                console.warn('[AGENT1] Could not resolve targetId:', e);
            }

            if (!targetId) {
                console.warn('[AGENT1] No targetId found, skipping intel_data save');
                await logToConvex(scanRunId, 'warning', 'info_gathering', 'Could not resolve targetId for intel_data');
                return null;
            }

            // Save to intel_data table
            try {
                const intelId = await convex.mutation('intel:create' as any, {
                    targetId,
                    scanRunId,
                    targetDomain: domain,
                    dns: {
                        aRecords: dnsResults.aRecords,
                        aaaaRecords: dnsResults.aaaaRecords,
                        mxRecords: dnsResults.mxRecords,
                        nsRecords: dnsResults.nsRecords,
                        txtRecords: dnsResults.txtRecords,
                        cnameRecords: dnsResults.cnameRecords,
                    },
                    whois: {
                        registrar: whoisResults.registrar,
                        registrantOrg: whoisResults.registrantOrg,
                        creationDate: whoisResults.creationDate,
                        expirationDate: whoisResults.expirationDate,
                        updatedDate: whoisResults.updatedDate,
                        nameServers: whoisResults.nameServers,
                        status: whoisResults.status,
                        dnssec: whoisResults.dnssec,
                    },
                    subdomains: subdomainResults,
                    httpProbe: {
                        statusCode: httpProbeResults.statusCode,
                        server: httpProbeResults.server,
                        poweredBy: httpProbeResults.poweredBy,
                        redirectChain: httpProbeResults.redirectChain,
                    },
                    technologies: httpProbeResults.technologies.length > 0 ? httpProbeResults.technologies : undefined,
                    network: (networkResults.traceroute.length > 0 || networkResults.pingStats) ? networkResults : undefined,
                    collectedAt: new Date().toISOString(),
                });

                console.log(`[AGENT1] Intel data saved: ${intelId}`);
                await logToConvex(scanRunId, 'info', 'info_gathering', `✅ Intel data saved to Convex`);
                return intelId;
            } catch (error) {
                console.error('[AGENT1] Failed to save intel_data:', error);
                await logToConvex(scanRunId, 'error', 'info_gathering', `Failed to save intel_data: ${error}`);
                return null;
            }
        });

        // =====================================================================
        // CHAIN: Emit event to trigger Agent 2 (Port Enumeration)
        // =====================================================================
        await step.run('agent1-chain-agent2', async () => {
            console.log('[AGENT1] 🔗 Chaining to Agent 2 (Port Enumeration)...');

            await inngest.send({
                name: 'agent/info_gathering.completed',
                data: {
                    scanRunId,
                    domain,
                    dnsRecords: dnsResults.aRecords.length,
                    subdomains: subdomainResults.length,
                    httpStatus: httpProbeResults.statusCode,
                },
            });

            await logToConvex(scanRunId, 'info', 'info_gathering', '🔗 Chaining to Agent 2 (Port Enumeration)...');
        });

        // =====================================================================
        // COMPLETE: Mark Stage 1 as done
        // =====================================================================
        await step.run('agent1-complete', async () => {
            await updateScanStatus(scanRunId, 0, 'done');
            await logToConvex(
                scanRunId,
                'info',
                'info_gathering',
                `✅ Agent 1 Complete — DNS: ${dnsResults.aRecords.length} A records, ` +
                `Whois: ${whoisResults.registrar || 'N/A'}, ` +
                `Subdomains: ${subdomainResults.length}, ` +
                `HTTP: ${httpProbeResults.statusCode || 'N/A'}`
            );
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[AGENT1] ✅ Passive Recon complete for: ${domain}`);
        console.log(`[AGENT1] DNS A Records: ${dnsResults.aRecords.length}`);
        console.log(`[AGENT1] Subdomains Found: ${subdomainResults.length}`);
        console.log(`[AGENT1] HTTP Status: ${httpProbeResults.statusCode || 'N/A'}`);
        console.log(`${'═'.repeat(60)}\n`);

        return {
            success: true,
            domain,
            scanRunId,
            dns: dnsResults,
            whois: whoisResults,
            subdomains: subdomainResults,
            httpProbe: httpProbeResults,
            intelId,
        };
    }
);
