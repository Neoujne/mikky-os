import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client.js';
import { functions } from './inngest/functions.js';
import { workerManager } from './lib/docker.js';
import { convex } from './lib/convex.js';
import { validateDomain } from './lib/validators.js';
import { startCronJobs, touchSession } from './lib/cron.js';
import { chat } from './lib/llm.js';
import PDFDocument from 'pdfkit';

const app = express();
const PORT = 5000;
const HOST = '127.0.0.1';
const MIKKY_SECRET_KEY = process.env.MIKKY_SECRET_KEY || 'dev-secret-key';
const TERMINAL_CONTAINER_NAME = 'mikky-terminal-worker';

// =============================================================================
// 1. DEBUG LOGGING — See every incoming request before anything else touches it
// =============================================================================
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.path}`);
    next();
});

// =============================================================================
// 2. PUBLIC ROUTES — BEFORE cors(), BEFORE express.json(), BEFORE everything
//    These routes set their own CORS headers so nothing can block them.
// =============================================================================

// A. Comprehensive Health Check (Convex cron + Dashboard polling)
app.get('/api/health', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const health = await workerManager.healthCheck();

        const status = health.dockerAvailable && health.imageExists
            ? 'healthy'
            : health.dockerAvailable
                ? 'degraded'
                : 'down';

        console.log(`[HEALTH] ${status} | Docker: ${health.dockerAvailable} | Image: ${health.imageExists} | Containers: ${health.activeContainers}`);

        return res.json({
            status,
            worker: true,
            dockerAvailable: health.dockerAvailable,
            imageExists: health.imageExists,
            activeContainers: health.activeContainers,
            activeSessions: health.activeSessions,
            version: health.version,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[HEALTH] Health check failed:', error);
        return res.status(503).json({
            status: 'down',
            worker: false,
            dockerAvailable: false,
            imageExists: false,
            activeContainers: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
});

// B. Simple Health Check (quick liveness probe)
app.get('/health', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({
        status: 'ok',
        service: 'mikky-os-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// C. Root Route (browser verification — confirms server is alive)
app.get('/', (_req, res) => {
    res.send(`
        <html>
        <head><title>Mikky OS Backend</title></head>
        <body style="background:#0a0a0a;color:#06b6d4;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
                <h1 style="font-size:2rem;">MIKKY OS Backend is ONLINE</h1>
                <p style="color:#71717a;">Orchestration Engine v1.0</p>
                <p style="color:#22c55e;margin-top:1rem;">Status: OPERATIONAL</p>
                <p style="color:#71717a;margin-top:2rem;font-size:0.8rem;">
                    Health: <a href="/api/health" style="color:#06b6d4;">/api/health</a> |
                    Inngest: <a href="http://localhost:8288" style="color:#06b6d4;">:8288</a>
                </p>
            </div>
        </body>
        </html>
    `);
});

// =============================================================================
// 3. GLOBAL MIDDLEWARE — Applied to all routes below this point
// =============================================================================
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mikky-secret'],
}));
app.use(express.json({ limit: '10mb' }));

// =============================================================================
// 4. INNGEST ENDPOINT — Workflow orchestration
// =============================================================================
app.use(
    '/api/inngest',
    serve({
        client: inngest,
        functions,
    })
);

// =============================================================================
// 5. SCAN ROUTES — Trigger and manage security scan pipelines
// =============================================================================

// Start a new scan pipeline via Inngest
app.post('/api/scan/start', async (req, res) => {
    const { scanRunId, domain } = req.body;

    if (!scanRunId || !domain) {
        return res.status(400).json({
            error: 'Missing required fields: scanRunId and domain',
        });
    }

    // Phase 3: Input Sanitization — validate domain before scanning
    const validation = validateDomain(domain);
    if (!validation.valid) {
        console.warn(`[API] Rejected invalid domain: ${domain} — ${validation.error}`);
        return res.status(400).json({
            error: validation.error,
        });
    }

    try {
        await inngest.send({
            name: 'scan.initiated',
            data: { scanRunId, domain },
        });

        console.log(`[API] Scan initiated for ${domain} (Run ID: ${scanRunId})`);

        res.json({
            success: true,
            message: `Scan pipeline initiated for ${domain}`,
            scanRunId,
        });
    } catch (error) {
        console.error('[API] Failed to initiate scan:', error);
        res.status(500).json({
            error: 'Failed to initiate scan',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// =============================================================================
// 5.5. CODE AUDIT ROUTES — Static source analysis via AI
// =============================================================================

app.post('/api/audit/start', async (req, res) => {
    const auditId = req.body?.auditId ?? req.body?.id;
    const repoUrl = req.body?.repoUrl ?? req.body?.repositoryUrl;

    console.log('[API][AUDIT] Incoming payload:', req.body);

    if (!auditId || !repoUrl) {
        return res.status(400).json({
            error: 'Missing required fields: auditId and repoUrl',
            received: {
                auditId: auditId ?? null,
                repoUrl: repoUrl ?? null,
            },
        });
    }

    // Basic URL validation
    try {
        const parsed = new URL(repoUrl);
        if (parsed.hostname !== 'github.com') {
            return res.status(400).json({ error: 'Only public GitHub repositories are supported' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    const eventName = 'audit.requested';
    try {
        const sendResult = await inngest.send({
            name: eventName,
            data: { auditId, repoUrl },
        });

        console.log(
            `[API][AUDIT] Code audit initiated for ${repoUrl} (Audit ID: ${auditId}) | Event: ${eventName}`,
            sendResult
        );

        res.json({
            success: true,
            message: `Code audit initiated for ${repoUrl}`,
            auditId,
            eventName,
        });
    } catch (error) {
        console.error('[API][AUDIT] Failed to send Inngest event', {
            eventName,
            auditId,
            repoUrl,
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).json({
            error: 'Failed to initiate code audit',
            details: error instanceof Error ? error.message : 'Unknown error',
            eventName,
        });
    }
});

// =============================================================================
// 5.6. AUDIT CHAT — Ask questions about scan findings
// =============================================================================

app.post('/api/audit/chat', async (req, res) => {
    // Explicit CORS headers for safety
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { findings, userMessage } = req.body || {};

    console.log('[API][AUDIT-CHAT] Incoming chat request');

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        return res.status(400).json({ error: 'Missing required field: userMessage' });
    }

    if (!Array.isArray(findings)) {
        return res.status(400).json({ error: 'Missing required field: findings (must be an array)' });
    }

    const systemPrompt = `You are a Senior Security Engineer helping a developer understand and fix vulnerabilities found during a code audit.

Here are the audit findings:
${JSON.stringify(findings, null, 2)}

Rules:
1. Answer the user's question based ONLY on the findings above.
2. Be technical, precise, and concise.
3. When providing fixes, include complete code examples.
4. Reference specific file paths and line numbers from the findings.
5. If the user asks about something not in the findings, say so clearly.
6. Use markdown formatting for code blocks and emphasis.`;

    try {
        const response = await chat({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage.trim() },
            ],
            temperature: 0.3,
            maxTokens: 2048,
        });

        res.json({
            success: true,
            reply: response.content || 'No response generated.',
            model: response.model,
        });
    } catch (error) {
        console.error('[API][AUDIT-CHAT] LLM call failed:', error);
        res.status(500).json({
            error: 'Failed to generate response',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// =============================================================================
// 6. AGENT ROUTES — CLI ReAct loop integration
// =============================================================================

// Receive a message from the CLI and trigger the agent ReAct loop
app.post('/api/agent/chat', async (req, res) => {
    const { message, sessionId, userId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({
            error: 'Missing required fields: message, sessionId',
        });
    }

    try {
        await inngest.send({
            name: 'agent/received_message',
            data: {
                message,
                sessionId,
                userId: userId || 'anonymous',
            },
        });

        console.log(`[AGENT] Received message for session ${sessionId}: ${message.substring(0, 50)}...`);
        touchSession(sessionId);

        res.json({
            accepted: true,
            sessionId,
            message: 'Agent processing started. Poll for updates.',
        });
    } catch (error) {
        console.error('[AGENT] Failed to process message:', error);
        res.status(500).json({
            error: 'Failed to process agent message',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Get agent run status for CLI polling
app.get('/api/agent/status/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId parameter' });
    }

    try {
        const status = await convex.query('agent:getRunStatus' as any, { sessionId });

        if (!status) {
            return res.status(404).json({
                error: 'Session not found',
                sessionId,
            });
        }

        res.json(status);
    } catch (error) {
        console.error('[AGENT] Failed to get status:', error);
        res.status(500).json({
            error: 'Failed to get agent status',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// =============================================================================
// 6.5. VULNERABILITY ANALYSIS ROUTES — AI Explanations
// =============================================================================

app.post('/api/vuln/explain', async (req, res) => {
    const { title, description, severity, cvss, cve, targetDomain, tool, evidence } = req.body;

    const prompt = `You are a senior cybersecurity analyst. Explain this vulnerability in detail:

**Vulnerability:** ${title}
**Severity:** ${severity} (CVSS: ${cvss || 'N/A'})
**CVE:** ${cve || 'N/A'}
**Target:** ${targetDomain}
**Detected By:** ${tool}
**Description:** ${description}
**Evidence:** ${evidence || 'N/A'}

Provide your analysis in this exact format:

## Why This Is Dangerous
[Explain what an attacker could do with this vulnerability. Be specific about the attack vector.]

## Real-World Impact
[Give concrete examples of what damage could result: data breach, account takeover, server compromise, etc.]

## How To Fix It
[Step-by-step remediation instructions with code examples where applicable]

## Quick Fix (Copy-Paste)
[Provide a single code snippet or configuration change that fixes the most critical aspect]

Keep the total response under 500 words.`;

    try {
        const response = await chat({
            messages: [
                { role: 'system', content: 'You are a senior cybersecurity analyst. Provide clear, actionable analysis.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            maxTokens: 1024,
        });

        const analysis = response.content || 'Analysis could not be generated.';

        console.log(`[API] AI Explanation generated for "${title}" (${response.usage?.totalTokens || '?'} tokens)`);

        res.json({
            explanation: analysis,
            remediation: analysis,
        });
    } catch (error) {
        console.error('[API] Failed to generate explanation:', error);

        // If LLM is not configured, return a helpful error instead of 500
        if (error instanceof Error && error.message.includes('OPENROUTER_API_KEY')) {
            return res.status(503).json({
                error: 'AI service not configured. Set OPENROUTER_API_KEY in .env',
            });
        }

        res.status(500).json({ error: 'Failed to generate explanation' });
    }
});

// =============================================================================
// 6.6. PDF REPORT GENERATION — Download scan results as PDF
// =============================================================================

app.get('/api/scan/:scanId/report', async (req, res) => {
    const { scanId } = req.params;

    try {
        // Fetch scan data from Convex
        const scan = await convex.query('scans:getById' as any, { id: scanId });
        if (!scan) {
            return res.status(404).json({ error: 'Scan not found' });
        }

        // Fetch vulnerabilities and intel for this scan
        const [vulns, intel] = await Promise.all([
            convex.query('vulnerabilities:getByScan' as any, { scanRunId: scanId }),
            convex.query('intel:getByScan' as any, { scanRunId: scanId }),
        ]);

        // Count severities
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const v of vulns || []) {
            if (v.severity in counts) counts[v.severity as keyof typeof counts]++;
        }
        const totalVulns = (vulns || []).length;

        // Determine risk level from safety score
        const safetyScore = scan.safetyScore ?? 100;
        const riskLevel =
            safetyScore >= 80 ? 'LOW' :
                safetyScore >= 60 ? 'MEDIUM' :
                    safetyScore >= 40 ? 'HIGH' :
                        'CRITICAL';

        const riskColor =
            riskLevel === 'CRITICAL' ? '#ef4444' :
                riskLevel === 'HIGH' ? '#f97316' :
                    riskLevel === 'MEDIUM' ? '#eab308' :
                        '#22c55e';

        // Build PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="mikky-report-${scan.targetDomain}-${Date.now()}.pdf"`
        );
        doc.pipe(res);

        // --- HEADER BANNER ---
        doc.rect(0, 0, doc.page.width, 100).fill('#0a0a0a');
        doc.fontSize(22).fillColor('#06b6d4')
            .text('CONFIDENTIAL SECURITY REPORT', 50, 25, { align: 'center' });
        doc.fontSize(14).fillColor('#a1a1aa')
            .text(scan.targetDomain.toUpperCase(), 50, 55, { align: 'center' });
        doc.fontSize(9).fillColor('#71717a')
            .text(`Generated: ${new Date().toISOString().split('T')[0]}  |  Scan ID: ${scanId.slice(-8)}`, 50, 78, { align: 'center' });

        doc.moveDown(3);

        // --- SECTION 1: EXECUTIVE SUMMARY ---
        doc.fontSize(16).fillColor('#06b6d4').text('1. EXECUTIVE SUMMARY', 50);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#27272a').stroke();
        doc.moveDown(0.5);

        // Score box
        doc.fontSize(11).fillColor('#d4d4d8');
        doc.text(`Safety Score:   `, 50, doc.y, { continued: true });
        doc.fillColor(riskColor).text(`${safetyScore} / 100`, { continued: false });

        doc.fillColor('#d4d4d8').text(`Risk Level:     `, 50, doc.y, { continued: true });
        doc.fillColor(riskColor).text(riskLevel, { continued: false });

        doc.fillColor('#d4d4d8')
            .text(`Scan Status:    ${scan.status}`)
            .text(`Started:        ${scan.startedAt}`)
            .text(`Completed:      ${scan.completedAt || 'N/A'}`)
            .text(`Total Vulns:    ${totalVulns}`);

        if (scan.aiSummary) {
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#a1a1aa').text('AI Summary:', 50);
            doc.fontSize(9).fillColor('#d4d4d8').text(scan.aiSummary, 60, doc.y, { width: 475 });
        }

        doc.moveDown(1.5);

        // --- SECTION 2: VULNERABILITY TABLE ---
        doc.fontSize(16).fillColor('#06b6d4').text('2. VULNERABILITY BREAKDOWN', 50);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#27272a').stroke();
        doc.moveDown(0.5);

        // Severity summary row
        const sevColors: Record<string, string> = {
            critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#71717a',
        };

        doc.fontSize(11).fillColor('#d4d4d8');
        for (const [sev, count] of Object.entries(counts)) {
            doc.fillColor(sevColors[sev] || '#d4d4d8')
                .text(`${sev.toUpperCase()}: ${count}`, 50, doc.y, { continued: sev !== 'info' });
            if (sev !== 'info') doc.text('   |   ', { continued: true });
        }
        doc.moveDown(1);

        // Vulnerability detail list (top 20)
        if (totalVulns > 0) {
            const topVulns = (vulns || []).slice(0, 20);
            const tableTop = doc.y;
            // Table header
            doc.fontSize(9).fillColor('#06b6d4');
            doc.text('SEVERITY', 50, tableTop, { width: 70 });
            doc.text('TITLE', 125, tableTop, { width: 280 });
            doc.text('TOOL', 410, tableTop, { width: 80 });
            doc.text('STATUS', 490, tableTop, { width: 60 });

            doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#3f3f46').stroke();

            let rowY = tableTop + 20;
            for (const vuln of topVulns) {
                if (rowY > 750) {
                    doc.addPage();
                    rowY = 50;
                }

                doc.fontSize(8)
                    .fillColor(sevColors[vuln.severity] || '#d4d4d8')
                    .text(vuln.severity.toUpperCase(), 50, rowY, { width: 70 });
                doc.fillColor('#d4d4d8')
                    .text(vuln.title?.slice(0, 50) || 'Untitled', 125, rowY, { width: 280 });
                doc.fillColor('#a1a1aa')
                    .text(vuln.tool || '-', 410, rowY, { width: 80 });
                doc.text(vuln.status || 'open', 490, rowY, { width: 60 });

                rowY += 16;
            }

            if (totalVulns > 20) {
                doc.fontSize(8).fillColor('#71717a')
                    .text(`... and ${totalVulns - 20} more vulnerabilities`, 50, rowY + 4);
            }

            doc.y = rowY + 20;
        } else {
            doc.fontSize(10).fillColor('#22c55e').text('No vulnerabilities detected.', 50);
        }

        doc.moveDown(1);

        // --- SECTION 3: RECON DATA ---
        if (doc.y > 680) doc.addPage();

        doc.fontSize(16).fillColor('#06b6d4').text('3. RECON INTELLIGENCE', 50);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#27272a').stroke();
        doc.moveDown(0.5);

        // Open Ports
        const ports = intel?.ports || scan.agentResults?.openPorts || [];
        doc.fontSize(11).fillColor('#d4d4d8').text('Open Ports:', 50);
        if (Array.isArray(ports) && ports.length > 0) {
            // ports can be objects {port, protocol, service} or plain numbers
            const portList = ports.map((p: any) =>
                typeof p === 'object' ? `${p.port}/${p.protocol} (${p.service || 'unknown'})` : String(p)
            ).join(', ');
            doc.fontSize(9).fillColor('#a1a1aa').text(portList, 60, doc.y, { width: 475 });
        } else {
            doc.fontSize(9).fillColor('#71717a').text('No port data available.', 60);
        }

        doc.moveDown(0.5);

        // Technologies
        const techs = intel?.technologies || [];
        doc.fontSize(11).fillColor('#d4d4d8').text('Technologies Detected:', 50);
        if (Array.isArray(techs) && techs.length > 0) {
            const techList = techs.map((t: any) =>
                `${t.name}${t.version ? ` v${t.version}` : ''}`
            ).join(', ');
            doc.fontSize(9).fillColor('#a1a1aa').text(techList, 60, doc.y, { width: 475 });
        } else {
            doc.fontSize(9).fillColor('#71717a').text('No technology data available.', 60);
        }

        doc.moveDown(0.5);

        // Subdomains
        const subs = intel?.subdomains || [];
        if (Array.isArray(subs) && subs.length > 0) {
            doc.fontSize(11).fillColor('#d4d4d8').text('Subdomains:', 50);
            const subList = subs.slice(0, 15).map((s: any) => s.subdomain || s).join(', ');
            doc.fontSize(9).fillColor('#a1a1aa').text(subList, 60, doc.y, { width: 475 });
            if (subs.length > 15) {
                doc.fontSize(8).fillColor('#71717a').text(`... and ${subs.length - 15} more`, 60);
            }
        }

        // --- FOOTER ---
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#3f3f46')
                .text(
                    'Generated by Mikky OS  |  CONFIDENTIAL',
                    50,
                    doc.page.height - 40,
                    { align: 'center', width: doc.page.width - 100 }
                );
        }

        doc.end();
        console.log(`[REPORT] PDF generated for scan ${scanId} (${scan.targetDomain})`);
    } catch (error) {
        console.error('[REPORT] PDF generation failed:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate report',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
});

// =============================================================================
// 7. SESSION ROUTES — Container lifecycle management
// =============================================================================

// Terminate an agent session and kill the associated Docker container
app.post('/api/session/terminate', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    try {
        console.log(`[SESSION] Received termination request for: ${sessionId}`);
        const killed = await workerManager.killContainer(sessionId);

        res.json({
            success: true,
            message: killed ? 'Session terminated and container killed' : 'Session not found or already terminated',
        });
    } catch (error) {
        console.error('[SESSION] Termination failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to terminate session',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// =============================================================================
// 8. TERMINAL ROUTES — Fire-and-Push Docker execution
// =============================================================================

// Execute a command in Docker and push output back to Convex
app.post('/api/terminal/exec', async (req, res) => {
    const { sessionId, userId, command } = req.body;
    const secretKey = req.headers['x-mikky-secret'];

    if (secretKey !== MIKKY_SECRET_KEY) {
        console.error('[TERMINAL] Invalid secret key');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!sessionId || !userId || !command) {
        return res.status(400).json({
            error: 'Missing required fields: sessionId, userId, command',
        });
    }

    console.log(`[TERMINAL] Received command: ${command} (session: ${sessionId})`);

    // Immediately respond — execution is async
    res.json({ accepted: true, message: 'Command accepted for execution' });

    // Execute command asynchronously
    executeTerminalCommand(sessionId, userId, command).catch((error) => {
        console.error('[TERMINAL] Execution error:', error);
    });
});

// =============================================================================
// 9. TERMINAL HELPER FUNCTIONS
// =============================================================================

async function executeTerminalCommand(
    sessionId: string,
    userId: string,
    command: string
): Promise<void> {
    const startTime = Date.now();

    try {
        const health = await workerManager.healthCheck();

        if (!health.dockerAvailable) {
            await pushLog(sessionId, userId,
                `\x1b[31m✗ Docker is not available. Start Docker Desktop.\x1b[0m\r\n`,
                'stderr'
            );
            return;
        }

        if (!health.imageExists) {
            await pushLog(sessionId, userId,
                `\x1b[31m✗ Worker image not found. Run: docker build -t mikky-worker ./mikky-os-worker\x1b[0m\r\n`,
                'stderr'
            );
            return;
        }

        const containerReady = await ensureTerminalContainer();
        if (!containerReady) {
            await pushLog(sessionId, userId,
                `\x1b[31m✗ Failed to start terminal container.\x1b[0m\r\n`,
                'stderr'
            );
            return;
        }

        await pushLog(sessionId, userId,
            `\x1b[90m⚡ Executing in Docker...\x1b[0m\r\n`,
            'stdout'
        );

        const result = await executeInTerminalContainer(command, sessionId, userId);
        const duration = Date.now() - startTime;

        if (result.success) {
            await pushLog(sessionId, userId,
                `\x1b[32m✓\x1b[0m \x1b[90mCompleted in ${duration}ms\x1b[0m\r\n`,
                'stdout'
            );
        } else if (result.timedOut) {
            await pushLog(sessionId, userId,
                `\x1b[33m⚠ Command timed out after ${duration}ms\x1b[0m\r\n`,
                'stderr'
            );
        } else {
            await pushLog(sessionId, userId,
                `\x1b[31m✗ Command failed (exit code: ${result.exitCode})\x1b[0m\r\n`,
                'stderr'
            );
        }
    } catch (error) {
        console.error('[TERMINAL] Execution error:', error);
        await pushLog(sessionId, userId,
            `\x1b[31m✗ Execution error: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m\r\n`,
            'stderr'
        );
    }
}

async function ensureTerminalContainer(): Promise<boolean> {
    try {
        return await workerManager.startSession(TERMINAL_CONTAINER_NAME);
    } catch (error) {
        console.error('[TERMINAL] Failed to ensure container:', error);
        return false;
    }
}

async function executeInTerminalContainer(
    command: string,
    sessionId: string,
    userId: string
): Promise<{ success: boolean; exitCode: number; timedOut: boolean }> {
    const timeout = 120000;

    try {
        const result = await workerManager.runToolInSession({
            command,
            scanRunId: TERMINAL_CONTAINER_NAME,
            stage: 'terminal',
            tool: command.split(' ')[0] || 'shell',
            timeout,
        });

        if (result.stdout) {
            const formattedOutput = formatTerminalOutput(result.stdout);
            await pushLog(sessionId, userId, formattedOutput, 'stdout');
        }

        if (result.stderr) {
            const formattedError = formatTerminalOutput(result.stderr);
            await pushLog(sessionId, userId, `\x1b[31m${formattedError}\x1b[0m`, 'stderr');
        }

        return {
            success: result.success,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
        };
    } catch (error) {
        console.error('[TERMINAL] Command execution failed:', error);
        throw error;
    }
}

function formatTerminalOutput(output: string): string {
    return output.replace(/\n/g, '\r\n');
}

async function pushLog(
    sessionId: string,
    userId: string,
    content: string,
    source: 'stdout' | 'stderr' | 'stdin'
): Promise<void> {
    try {
        await convex.mutation('terminal:appendLogPublic' as any, {
            sessionId,
            userId,
            content,
            source,
        });
    } catch (error) {
        console.error('[TERMINAL] Failed to push log to Convex:', error);
    }
}

// =============================================================================
// 10. SERVER START (Force IPv4 Binding)
// =============================================================================
app.listen(PORT, HOST, () => {
    console.log('\n============================================================');
    console.log(`  BACKEND LISTENING ON http://localhost:${PORT}`);
    console.log(`  TRY THIS IN BROWSER: http://127.0.0.1:${PORT}`);
    console.log(`  HEALTH CHECK:        http://127.0.0.1:${PORT}/api/health`);
    console.log('============================================================\n');

    startCronJobs();
});
