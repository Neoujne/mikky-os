/**
 * Reporting Stage: AI Summary & Scan Finalization
 *
 * Listens for `agent/vuln_scan.completed` emitted by Agent 3.
 * Generates an executive AI summary, calculates a safety score,
 * marks the scan as 100% complete, and cleans up the Docker session.
 *
 * @trigger agent/vuln_scan.completed
 */

import { inngest } from '../client.js';
import { convex } from '../../lib/convex.js';
import { workerManager } from '../../lib/docker.js';
import { chat, isConfigured } from '../../lib/llm.js';
import { updateScanStatus, logToConvex } from './shared.js';

// ============================================================================
// REPORTING STAGE
// ============================================================================

export const reportingStage = inngest.createFunction(
    {
        id: 'reporting-stage',
        name: 'Reporting: AI Summary & Finalization',
        retries: 1,
        onFailure: async ({ event, error }) => {
            const { scanRunId } = event.data as any;
            console.error(`[REPORTING] Failed for ${scanRunId}:`, error);

            if (!scanRunId) return;

            // Even if reporting fails, mark the scan as completed (data is already saved)
            try {
                await convex.mutation('scans:updateStatus' as any, {
                    id: scanRunId,
                    status: 'completed',
                    progress: 100,
                    aiSummary: `### ⚠️ Report Generation Failed\n\nScan data was collected successfully but the AI summary could not be generated.\n\n**Error:** ${error?.message || 'Unknown error'}`,
                    completedAt: new Date().toISOString(),
                });
            } catch (e) {
                console.error('[REPORTING] Failed to update failure status:', e);
            }

            // Cleanup container as a safety net
            try {
                await workerManager.endSession(scanRunId);
            } catch { /* ignore */ }
        },
    },
    { event: 'agent/vuln_scan.completed' },
    async ({ event, step }) => {
        const { scanRunId, domain, vulnCount, nucleiVulns, niktoIssues, openPorts, totalSaved } = event.data;

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[REPORTING] Starting Report Generation for: ${domain}`);
        console.log(`[REPORTING] Scan Run ID: ${scanRunId}`);
        console.log(`${'═'.repeat(60)}\n`);

        // =====================================================================
        // MARK: Reporting stage running
        // =====================================================================
        await step.run('reporting-mark-running', async () => {
            await updateScanStatus(scanRunId, 8, 'running');
            await logToConvex(scanRunId, 'info', 'reporting', '📝 Reporting stage starting — generating AI summary...');
        });

        // =====================================================================
        // STEP 1: Generate AI Executive Summary
        // =====================================================================
        const aiSummary = await step.run('reporting-ai-summary', async () => {
            const totalVulns = vulnCount ?? ((nucleiVulns || 0) + (niktoIssues || 0));
            const portsCount = Array.isArray(openPorts) ? openPorts.length : (openPorts || 0);

            // If LLM is not configured, generate a structured fallback
            if (!isConfigured()) {
                console.warn('[REPORTING] LLM not configured — using fallback summary');
                await logToConvex(scanRunId, 'warning', 'reporting', 'LLM not configured — generating structured fallback summary');

                return `### 🛡️ Scan Report: ${domain}\n\n` +
                    `**Vulnerabilities Found:** ${totalVulns} (Nuclei: ${nucleiVulns || 0}, Nikto: ${niktoIssues || 0})\n` +
                    `**Open Ports:** ${portsCount}\n` +
                    `**Saved to Database:** ${totalSaved || 0} records\n\n` +
                    `> AI analysis unavailable — configure OPENROUTER_API_KEY for detailed insights.`;
            }

            try {
                console.log('[REPORTING] Calling LLM for executive summary...');

                const response = await chat({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a cybersecurity analyst writing a concise executive summary. Be direct, technical, and actionable. Use markdown formatting. Keep it to 3-5 sentences maximum.',
                        },
                        {
                            role: 'user',
                            content: `Generate an executive summary for a security scan of "${domain}".\n\n` +
                                `Results:\n` +
                                `- Vulnerabilities found: ${totalVulns} (Nuclei: ${nucleiVulns || 0}, Nikto: ${niktoIssues || 0})\n` +
                                `- Open ports detected: ${portsCount}\n` +
                                `- Records saved: ${totalSaved || 0}\n\n` +
                                `Provide a risk assessment and top recommendation.`,
                        },
                    ],
                    temperature: 0.4,
                    maxTokens: 512,
                });

                const summary = response.content || 'No summary generated.';
                console.log(`[REPORTING] AI summary generated (${summary.length} chars)`);
                await logToConvex(scanRunId, 'info', 'reporting', `AI summary generated (${summary.length} chars)`);

                return `### 🛡️ Scan Report: ${domain}\n\n${summary}`;
            } catch (error) {
                console.error('[REPORTING] LLM call failed:', error);
                await logToConvex(scanRunId, 'warning', 'reporting', `LLM call failed: ${error instanceof Error ? error.message : 'Unknown'}`);

                // Return a structured fallback instead of crashing
                return `### 🛡️ Scan Report: ${domain}\n\n` +
                    `**Vulnerabilities Found:** ${totalVulns}\n` +
                    `**Open Ports:** ${portsCount}\n\n` +
                    `> AI analysis failed — results above are from automated scanning tools.`;
            }
        });

        // =====================================================================
        // STEP 2: Calculate Safety Score
        // =====================================================================
        const safetyScore = await step.run('reporting-safety-score', async () => {
            // ─── Weighted Safety Score ───────────────────────────────────
            // Penalty weights per severity:
            //   Critical = 20 pts   (RCE, SQLi, etc.)
            //   High     = 10 pts   (XSS, SSRF, etc.)
            //   Medium   =  2 pts   (Missing headers, info disclosure)
            //   Low      =  1 pt    (Minor config issues)
            //   Info     =  0 pts   (Informational only)
            //
            // Example: 12 Medium findings → 12 × 2 = 24 penalty → Score 76/100
            // ─────────────────────────────────────────────────────────────

            const SEVERITY_WEIGHTS: Record<string, number> = {
                critical: 20,
                high: 10,
                medium: 2,
                low: 1,
                info: 0,
            };

            let penalty = 0;

            // Try to fetch actual vulnerability severities from the database
            try {
                const vulns = await convex.query('vulnerabilities:getByScan' as any, { scanRunId });

                if (vulns && Array.isArray(vulns) && vulns.length > 0) {
                    for (const v of vulns) {
                        const weight = SEVERITY_WEIGHTS[v.severity] ?? 2; // default to medium
                        penalty += weight;
                    }
                    console.log(`[REPORTING] Weighted penalty from ${vulns.length} vulns: ${penalty}`);
                } else {
                    // Fallback: if no DB records yet, use event counts with medium weight
                    const totalVulns = vulnCount ?? ((nucleiVulns || 0) + (niktoIssues || 0));
                    penalty = totalVulns * 2; // assume medium as a safe default
                    console.log(`[REPORTING] Fallback penalty (no DB records): ${penalty} from ${totalVulns} vulns`);
                }
            } catch (e) {
                // If query fails, use the event data with medium weight
                const totalVulns = vulnCount ?? ((nucleiVulns || 0) + (niktoIssues || 0));
                penalty = totalVulns * 2;
                console.warn(`[REPORTING] Failed to query vulns for scoring, using fallback: ${penalty}`, e);
            }

            const score = Math.max(0, 100 - penalty);

            console.log(`[REPORTING] Safety Score: ${score}/100 (penalty: ${penalty})`);
            await logToConvex(scanRunId, 'info', 'reporting', `Safety Score calculated: ${score}/100 (penalty: ${penalty})`);

            return score;
        });

        // =====================================================================
        // STEP 3: Finalize — Mark scan as 100% complete
        // =====================================================================
        await step.run('reporting-finalize', async () => {
            await updateScanStatus(scanRunId, 8, 'done', 'completed');

            // Set the final fields that updateScanStatus doesn't cover
            await convex.mutation('scans:updateStatus' as any, {
                id: scanRunId,
                status: 'completed',
                progress: 100,
                safetyScore,
                aiSummary,
                completedAt: new Date().toISOString(),
            });

            await logToConvex(
                scanRunId,
                'info',
                'reporting',
                `✅ Scan COMPLETE — Safety: ${safetyScore}/100 | AI Summary generated | Status: completed`
            );
        });

        // =====================================================================
        // STEP 4: Sync parent target with scan results
        // =====================================================================
        await step.run('sync-target-status', async () => {
            const totalVulns = vulnCount ?? ((nucleiVulns || 0) + (niktoIssues || 0));

            try {
                const target = await convex.query('targets:getByDomain' as any, { domain });
                if (!target?._id) {
                    console.warn(`[REPORTING] Could not find target for domain: ${domain}`);
                    await logToConvex(scanRunId, 'warning', 'reporting', `Target not found for domain: ${domain} — skipping sync`);
                    return;
                }

                await convex.mutation('targets:updateStats' as any, {
                    id: target._id,
                    lastScanDate: new Date().toISOString(),
                    lastScanStatus: 'completed',
                    safetyScore,
                    totalVulns,
                });

                console.log(`[REPORTING] Target synced: ${domain} → safety=${safetyScore}, vulns=${totalVulns}, status=completed`);
                await logToConvex(scanRunId, 'info', 'reporting', `📡 Target synced: safety=${safetyScore}/100, vulns=${totalVulns}`);
            } catch (e) {
                console.error('[REPORTING] Failed to sync target status:', e);
                await logToConvex(scanRunId, 'warning', 'reporting', `Target sync failed: ${e instanceof Error ? e.message : 'Unknown'}`);
            }
        });

        // =====================================================================
        // STEP 5: Cleanup — Final container teardown (safety net)
        // =====================================================================
        await step.run('reporting-cleanup', async () => {
            try {
                await workerManager.endSession(scanRunId);
                console.log(`[REPORTING] Session cleaned up for: ${scanRunId}`);
            } catch {
                // Agent 3 may have already cleaned up — that's fine
                console.log(`[REPORTING] Session already cleaned (or not found) for: ${scanRunId}`);
            }
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`[REPORTING] ✅ Report complete for: ${domain}`);
        console.log(`[REPORTING] Safety Score: ${safetyScore}/100`);
        console.log(`[REPORTING] AI Summary: ${aiSummary.length} chars`);
        console.log(`${'═'.repeat(60)}\n`);

        return {
            success: true,
            domain,
            scanRunId,
            safetyScore,
            aiSummaryLength: aiSummary.length,
        };
    }
);
