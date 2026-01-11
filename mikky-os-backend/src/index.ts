import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client.js';
import { functions } from './inngest/functions.js';
import { workerManager } from './lib/docker.js';
import { convex } from './lib/convex.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const MIKKY_SECRET_KEY = process.env.MIKKY_SECRET_KEY || 'dev-secret-key';

// Terminal container name for interactive sessions
const TERMINAL_CONTAINER_NAME = 'mikky-terminal-worker';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint - basic server status
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'mikky-os-backend',
        timestamp: new Date().toISOString()
    });
});

// API Health check endpoint - comprehensive Docker/Worker status
// Called by Convex cron job every minute for real-time monitoring
app.get('/api/health', async (req, res) => {
    try {
        const health = await workerManager.healthCheck();

        const status = health.dockerAvailable && health.imageExists
            ? 'healthy'
            : health.dockerAvailable
                ? 'degraded'  // Docker works but image missing
                : 'down';     // Docker unavailable

        res.json({
            status,
            dockerAvailable: health.dockerAvailable,
            imageExists: health.imageExists,
            activeContainers: health.activeContainers,
            activeSessions: health.activeSessions,
            version: health.version,
            timestamp: new Date().toISOString(),
        });

        console.log(`[HEALTH] Status: ${status} (Docker: ${health.dockerAvailable}, Image: ${health.imageExists})`);
    } catch (error) {
        console.error('[HEALTH] Health check failed:', error);
        res.status(503).json({
            status: 'down',
            dockerAvailable: false,
            imageExists: false,
            activeContainers: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});

// Inngest serve endpoint (handles both PUT and POST)
app.use(
    '/api/inngest',
    serve({
        client: inngest,
        functions,
    })
);

// Scan start endpoint - triggers the Inngest workflow
app.post('/api/scan/start', async (req, res) => {
    const { scanRunId, domain } = req.body;

    if (!scanRunId || !domain) {
        return res.status(400).json({
            error: 'Missing required fields: scanRunId and domain',
        });
    }

    try {
        // Send event to Inngest to start the scan pipeline
        await inngest.send({
            name: 'scan.initiated',
            data: {
                scanRunId,
                domain,
            },
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

// ============================================================================
// AGENT CHAT ENDPOINT - CLI Integration
// ============================================================================

/**
 * Receive a message from the CLI and trigger the agent ReAct loop
 * This is an async handoff - the agent runs in the background via Inngest
 */
app.post('/api/agent/chat', async (req, res) => {
    const { message, sessionId, userId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({
            error: 'Missing required fields: message, sessionId',
        });
    }

    try {
        // Trigger Inngest event to start the agent loop
        await inngest.send({
            name: 'agent/received_message',
            data: {
                message,
                sessionId,
                userId: userId || 'anonymous',
            },
        });

        console.log(`[AGENT] Received message for session ${sessionId}: ${message.substring(0, 50)}...`);

        // Async handoff - CLI polls Convex for status updates
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

/**
 * Get agent run status for CLI polling
 */
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

// ============================================================================
// TERMINAL EXEC ENDPOINT - Fire-and-Push Architecture
// ============================================================================

/**
 * Execute a command in Docker and stream output back to Convex
 * This endpoint is called by Convex actions and immediately returns 200 OK
 * The actual execution happens asynchronously with output pushed to Convex
 */
app.post('/api/terminal/exec', async (req, res) => {
    const { sessionId, userId, command } = req.body;
    const secretKey = req.headers['x-mikky-secret'];

    // Validate secret key
    if (secretKey !== MIKKY_SECRET_KEY) {
        console.error('[TERMINAL] Invalid secret key');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!sessionId || !userId || !command) {
        return res.status(400).json({
            error: 'Missing required fields: sessionId, userId, command',
        });
    }

    console.log(`[TERMINAL] Received command: ${command} (session: ${sessionId})`);

    // Immediately respond - execution is async
    res.json({ accepted: true, message: 'Command accepted for execution' });

    // Execute command asynchronously
    executeTerminalCommand(sessionId, userId, command).catch((error) => {
        console.error('[TERMINAL] Execution error:', error);
    });
});

/**
 * Execute a terminal command in Docker and push output to Convex
 */
async function executeTerminalCommand(
    sessionId: string,
    userId: string,
    command: string
): Promise<void> {
    const startTime = Date.now();

    try {
        // Check Docker health first
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

        // Ensure terminal container is running
        const containerReady = await ensureTerminalContainer();
        if (!containerReady) {
            await pushLog(sessionId, userId,
                `\x1b[31m✗ Failed to start terminal container.\x1b[0m\r\n`,
                'stderr'
            );
            return;
        }

        // Execute the command
        await pushLog(sessionId, userId,
            `\x1b[90m⚡ Executing in Docker...\x1b[0m\r\n`,
            'stdout'
        );

        const result = await executeInTerminalContainer(command, sessionId, userId);

        const duration = Date.now() - startTime;

        // Push completion status
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

/**
 * Ensure the persistent terminal container is running
 */
async function ensureTerminalContainer(): Promise<boolean> {
    try {
        // Use workerManager to start a session (reuses if exists)
        return await workerManager.startSession(TERMINAL_CONTAINER_NAME);
    } catch (error) {
        console.error('[TERMINAL] Failed to ensure container:', error);
        return false;
    }
}

/**
 * Execute a command in the terminal container with streaming output
 */
async function executeInTerminalContainer(
    command: string,
    sessionId: string,
    userId: string
): Promise<{ success: boolean; exitCode: number; timedOut: boolean }> {
    const timeout = 120000; // 2 minute timeout for interactive commands

    try {
        const result = await workerManager.runToolInSession({
            command,
            scanRunId: TERMINAL_CONTAINER_NAME, // Use terminal container
            stage: 'terminal',
            tool: command.split(' ')[0] || 'shell',
            timeout,
            // Custom handler to stream output as it arrives
        });

        // Push the output to Convex
        if (result.stdout) {
            // Format output for terminal display (handle ANSI codes properly)
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

/**
 * Format terminal output for xterm display
 */
function formatTerminalOutput(output: string): string {
    // Replace newlines with carriage return + newline for xterm
    return output.replace(/\n/g, '\r\n');
}

/**
 * Push a log entry to Convex terminal_logs
 */
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

// Start the server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 MIKKY OS Backend - Orchestration Engine               ║
║                                                            ║
║   Server running at: http://localhost:${PORT}                ║
║   Inngest endpoint:  http://localhost:${PORT}/api/inngest    ║
║   Scan endpoint:     POST /api/scan/start                  ║
║   Terminal endpoint: POST /api/terminal/exec               ║
║                                                            ║
║   Inngest Dashboard: http://localhost:8288                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

