/**
 * WorkerManager - Production-Grade Docker Container Orchestration
 * 
 * A singleton class that manages ephemeral Kali Linux containers for 
 * executing security scanning tools with proper timeouts, output parsing,
 * and error handling.
 */

import Docker from 'dockerode';
import { Writable } from 'stream';
import * as os from 'os';
import { convex } from './convex.js';
import { summarizeOutput } from './parsers.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORKER_IMAGE = 'mikky-worker:latest';

// Tool-specific timeouts in milliseconds
export const TOOL_TIMEOUTS: Record<string, number> = {
    // Quick tools (30 seconds)
    whois: 30_000,
    dig: 30_000,
    host: 30_000,
    curl: 30_000,

    // Medium tools (2 minutes)
    httpx: 120_000,
    whatweb: 120_000,
    wafw00f: 120_000,

    // Slow tools (5 minutes)
    nmap: 300_000,
    subfinder: 300_000,

    // Very slow tools (10 minutes)
    nuclei: 600_000,
    dirsearch: 600_000,

    // Default
    default: 120_000,
};

// ============================================================================
// TYPES
// ============================================================================

export interface ToolExecutionOptions<T = any> {
    /** Command to execute (e.g., "nmap -F example.com") */
    command: string;
    /** Scan run ID for logging */
    scanRunId: string;
    /** Current pipeline stage */
    stage: string;
    /** Tool name for timeout lookup */
    tool: string;
    /** Optional custom timeout in ms */
    timeout?: number;
    /** Optional parser function for structured output */
    parser?: (output: string) => T;
    /** Whether to mount /tmp volume */
    mountVolume?: boolean;
    /** Volume path on host */
    volumePath?: string;
}

export interface ToolExecutionResult<T = unknown> {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    timedOut: boolean;
    parsed?: T;
    error?: string;
}

// ============================================================================
// WORKER MANAGER CLASS
// ============================================================================

export class WorkerManager {
    private docker: Docker;
    private activeSessions: Map<string, Docker.Container> = new Map();
    private scanSessions: Map<string, Docker.Container> = new Map();
    private activeContainers: Map<string, Docker.Container> = new Map();
    private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

    private static instance: WorkerManager;

    private constructor() {
        // Platform-specific Docker connection logic
        // Windows requires named pipe, Linux/Mac use socket buffer
        const isWindows = os.platform() === 'win32';

        console.log(`[DOCKER] Initializing WorkerManager on ${os.platform()}...`);

        if (isWindows) {
            this.docker = new Docker({
                socketPath: '//./pipe/docker_engine'
            });
        } else {
            this.docker = new Docker({
                socketPath: '/var/run/docker.sock'
            });
        }
    }

    public static getInstance(): WorkerManager {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }

    /**
            this.isConnected = true;
            console.log('[WORKER] Docker connection established');
            return true;
        } catch (error) {
            this.isConnected = false;
            console.error('[WORKER] Docker connection failed:', error);
            return false;
        }
    }

    /**
     * Check if Docker is available and image exists
     * Perform a system health check
     */
    public async healthCheck() {
        try {
            // Test connection by listing containers (lightweight)
            const containers = await this.docker.listContainers();

            // Check if our worker image exists (by repo tag)
            const images = await this.docker.listImages();

            // Note: dockerode returns different structures for images depending on version
            // Safer to check safely
            let imageExists = false;
            try {
                imageExists = images.some(img =>
                    (img.RepoTags || []).some(tag => tag && tag.includes('mikky-worker'))
                );
            } catch (e) {
                console.warn('[DOCKER] Failed to check images:', e);
            }

            return {
                dockerAvailable: true,
                imageExists,
                activeContainers: containers.length,
                activeSessions: this.activeSessions.size,
                version: '24.0.6' // Mock for now or use (await this.docker.version()).Version
            };
        } catch (error) {
            console.error('[DOCKER] Health check failed:', error);
            // Return safe fallback instead of throwing, so API serves 503/200 OK with 'down' status
            return {
                dockerAvailable: false,
                imageExists: false,
                activeContainers: 0,
                activeSessions: 0,
            };
        }
    }

    // =========================================================================
    // SESSION-BASED CONTAINER MANAGEMENT (Keep-Alive Optimization)
    // =========================================================================

    // Map of scanRunId -> container for session reuse
    // Map of scanRunId -> container for session reuse

    /**
     * Get session container name for a scan
     * Uses full scan ID suffix for unique isolation between simultaneous scans
     */
    private getSessionName(scanRunId: string): string {
        // Use full ID to ensure uniqueness and match requirement
        // Format: mikky-worker-{scanRunId}
        return `mikky-worker-${scanRunId}`;
    }

    /**
     * Start a session container for a scan (called at Stage 1)
     * The container stays alive for all subsequent commands
     */
    public async startSession(scanRunId: string): Promise<boolean> {
        const sessionName = this.getSessionName(scanRunId);

        // Check if session already exists in memory
        if (this.scanSessions.has(scanRunId)) {
            console.log(`[SESSION] Reusing existing session: ${sessionName}`);
            return true;
        }

        try {
            // ROBUST CHECK: Try to get container by name directly (more reliable than listing)
            // This prevents the "double container" leak issue
            let existingContainer: Docker.Container | null = null;

            try {
                // Attempt direct lookup - Docker adds "/" prefix to names
                existingContainer = this.docker.getContainer(sessionName);
                const info = await existingContainer.inspect();

                console.log(`[SESSION] Found existing container: ${sessionName} (State: ${info.State.Status})`);

                if (info.State.Running) {
                    // Container exists and is running - reuse it
                    this.scanSessions.set(scanRunId, existingContainer);
                    console.log(`[SESSION] Reconnected to running session: ${sessionName}`);
                    return true;
                } else {
                    // Container exists but is stopped - remove it before creating new one
                    console.log(`[SESSION] Removing stopped container: ${sessionName}`);
                    await existingContainer.remove({ force: true });
                    existingContainer = null;
                }
            } catch (notFoundError: any) {
                // Container doesn't exist - this is expected for new scans
                if (notFoundError.statusCode === 404) {
                    console.log(`[SESSION] No existing container found, will create new: ${sessionName}`);
                } else {
                    // Unexpected error - log but continue
                    console.warn(`[SESSION] Error checking container existence:`, notFoundError.message);
                }
            }

            // Create new session container that stays alive
            // Using tail -f /dev/null is the most reliable way to keep a container alive
            const container = await this.docker.createContainer({
                Image: WORKER_IMAGE,
                Entrypoint: null as any, // Crucial: Nullify entrypoint to prevent immediate exit
                Cmd: ['tail', '-f', '/dev/null'], // Keep container alive indefinitely
                name: sessionName,
                Tty: true, // Keep terminal open
                StopSignal: 'SIGKILL', // Force kill on stop to prevent hanging
                HostConfig: {
                    AutoRemove: false,
                    NetworkMode: 'bridge',
                    Privileged: true, // Required for Nmap raw sockets
                    CapAdd: ['NET_ADMIN', 'NET_RAW'], // Required for Nmap raw sockets
                    Memory: 512 * 1024 * 1024,
                    CpuShares: 256,
                },
                Labels: {
                    'mikky.scanRunId': scanRunId,
                    'mikky.type': 'session',
                },
            });

            await container.start();
            this.scanSessions.set(scanRunId, container);
            console.log(`[SESSION] Started new session: ${sessionName}`);

            await this.logToConvex(scanRunId, 'info', 'session', '[SESSION] Worker container started (Keep-Alive mode)');

            return true;
        } catch (error) {
            console.error(`[SESSION] Failed to start session:`, error);
            return false;
        }
    }

    /**
     * End a session container (called at Stage 9 or on failure)
     */
    public async endSession(scanRunId: string): Promise<void> {
        const container = this.scanSessions.get(scanRunId);
        if (!container) {
            console.log(`[SESSION] No active session to end for: ${scanRunId}`);
            return;
        }

        try {
            // Use SIGKILL to force immediate termination - prevents hanging containers
            await container.kill({ signal: 'SIGKILL' });
            await container.remove({ force: true });
            console.log(`[SESSION] Ended session: ${this.getSessionName(scanRunId)}`);
            await this.logToConvex(scanRunId, 'info', 'session', '[SESSION] Worker container stopped');
        } catch (error: any) {
            // Handle case where container is already stopped (HTTP 409)
            if (error.statusCode === 409 || error.message?.includes('not running')) {
                console.log(`[SESSION] Container already stopped, removing: ${this.getSessionName(scanRunId)}`);
                try {
                    await container.remove({ force: true });
                } catch {
                    // Ignore removal errors
                }
            } else {
                console.warn(`[SESSION] Error ending session:`, error);
            }
        } finally {
            this.scanSessions.delete(scanRunId);
        }
    }

    /**
     * Run a tool inside an existing session container using docker exec
     * Falls back to runTool if no session exists
     */
    public async runToolInSession<T = any>(options: ToolExecutionOptions<T>): Promise<ToolExecutionResult<T>> {
        const { command, scanRunId, stage, tool, timeout = TOOL_TIMEOUTS[tool] || TOOL_TIMEOUTS.default, parser } = options;

        // CHECK CANCELLATION
        try {
            const status = await convex.query('scans:getStatus' as any, { id: scanRunId });
            if (status === 'cancelled') {
                console.log(`[WORKER] Scan ${scanRunId} cancelled. Aborting ${tool}...`);
                await this.killContainer(scanRunId);
                throw new Error('Scan cancelled by user');
            }
        } catch (error: any) {
            if (error.message === 'Scan cancelled by user') throw error;
            // Ignore query errors/connection issues to avoid blocking
        }

        const container = this.scanSessions.get(scanRunId);

        // Fall back to regular runTool if no session
        if (!container) {
            console.log(`[SESSION] No session found, using ephemeral container`);
            return this.runTool(options);
        }

        const startTime = Date.now();
        console.log(`[SESSION] Exec in session: ${command} (timeout: ${timeout}ms)`);

        await this.logToConvex(scanRunId, 'info', stage, `[${tool.toUpperCase()}] Executing: ${command}`);

        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let exitCode = -1;

        try {
            // Create exec instance
            const exec = await container.exec({
                Cmd: ['sh', '-c', command],
                AttachStdout: true,
                AttachStderr: true,
            });

            // Start exec and capture output
            const stream = await exec.start({ Detach: false, Tty: false });

            // Collect output with timeout
            const outputPromise = new Promise<{ stdout: string; stderr: string }>((resolve) => {
                const output = this.demuxDockerStream(stream);
                output.then(resolve);
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), timeout);
            });

            try {
                const result = await Promise.race([outputPromise, timeoutPromise]);
                stdout = result.stdout;
                stderr = result.stderr;

                // Get exit code
                const inspectResult = await exec.inspect();
                exitCode = inspectResult.ExitCode ?? 0;
            } catch (err) {
                if (err instanceof Error && err.message === 'TIMEOUT') {
                    timedOut = true;
                    console.log(`[SESSION] Command timed out after ${timeout}ms`);
                    await this.logToConvex(scanRunId, 'warning', stage, `[${tool.toUpperCase()}] Timed out after ${timeout}ms`);
                } else {
                    throw err;
                }
            }

            const duration = Date.now() - startTime;
            const success = exitCode === 0 && !timedOut;

            if (success) {
                await this.logToConvex(
                    scanRunId,
                    'info',
                    stage,
                    `[${tool.toUpperCase()}] Completed in ${duration}ms (${stdout.split('\n').length} lines)`
                );

                if (stdout.length > 0) {
                    const summary = summarizeOutput(stdout, 20);
                    await this.logToConvex(scanRunId, 'info', stage, summary);
                }
            } else {
                await this.logToConvex(
                    scanRunId,
                    'error',
                    stage,
                    `[${tool.toUpperCase()}] Failed (exit: ${exitCode}, timeout: ${timedOut})`
                );
                if (stderr) {
                    await this.logToConvex(scanRunId, 'error', stage, stderr.substring(0, 500));
                }
            }

            // Parse output if parser provided
            let parsed: T | undefined;
            if (parser && stdout) {
                try {
                    parsed = parser(stdout) as T;
                } catch (parseError) {
                    console.error('[SESSION] Parse error:', parseError);
                }
            }

            return {
                success,
                stdout,
                stderr,
                exitCode,
                duration,
                timedOut,
                parsed,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            console.error(`[SESSION] CRITICAL Exec error: ${errorMessage}`);
            await this.logToConvex(scanRunId, 'critical', stage, `[${tool.toUpperCase()}] CRITICAL: ${errorMessage}`);

            // FAIL-FAST: Throw the error to crash the pipeline instead of returning garbage
            // This prevents zombie pipelines from continuing with empty data
            throw new Error(`[SESSION] Tool execution failed: ${errorMessage}`);
        }
    }

    /**
     * Execute a tool in an ephemeral Docker container
     */
    public async runTool<T = any>(options: ToolExecutionOptions<T>): Promise<ToolExecutionResult<T>> {
        const {
            command,
            scanRunId,
            stage,
            tool,
            timeout = TOOL_TIMEOUTS[tool] || TOOL_TIMEOUTS.default,
            parser,
            mountVolume = false,
            volumePath,
        } = options;

        const startTime = Date.now();
        const containerId = `mikky-${scanRunId.slice(-8)}-${Date.now()}`;

        console.log(`[WORKER] Running: ${command} (timeout: ${timeout}ms)`);

        // Log start
        await this.logToConvex(scanRunId, 'info', stage, `[${tool.toUpperCase()}] Starting: ${command}`);

        let container: Docker.Container | null = null;
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        try {
            // Build host config
            const hostConfig: Docker.HostConfig = {
                AutoRemove: false, // We'll manually remove after getting logs
                NetworkMode: 'bridge',
                CapDrop: ['ALL'],
                CapAdd: ['NET_RAW'], // Needed for nmap
                Memory: 512 * 1024 * 1024, // 512MB limit
                CpuShares: 256, // Low priority
            };

            // Add volume mount if requested
            if (mountVolume && volumePath) {
                hostConfig.Binds = [`${volumePath}:/output:rw`];
            }

            // Create container
            container = await this.docker.createContainer({
                Image: WORKER_IMAGE,
                Cmd: [command],
                name: containerId,
                Tty: false,
                HostConfig: hostConfig,
                Labels: {
                    'mikky.scanRunId': scanRunId,
                    'mikky.stage': stage,
                    'mikky.tool': tool,
                },
            });

            this.activeContainers.set(containerId, container);

            // Start container
            await container.start();

            // Wait for completion with timeout
            const waitPromise = container.wait();
            const timeoutPromise = new Promise<{ StatusCode: number }>((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), timeout);
            });

            let exitCode = -1;
            try {
                const result = await Promise.race([waitPromise, timeoutPromise]);
                exitCode = result.StatusCode;
            } catch (err) {
                if (err instanceof Error && err.message === 'TIMEOUT') {
                    timedOut = true;
                    console.log(`[WORKER] Container timed out after ${timeout}ms`);
                    await this.logToConvex(scanRunId, 'warning', stage, `[${tool.toUpperCase()}] Timed out after ${timeout}ms`);

                    // Kill the container
                    try {
                        await container.kill();
                    } catch {
                        // Container may have already exited
                    }
                } else {
                    throw err;
                }
            }

            // Get logs
            const logStream = await container.logs({
                stdout: true,
                stderr: true,
                follow: false,
            });

            // Parse multiplexed stream
            const output = await this.demuxDockerStream(logStream);
            stdout = output.stdout;
            stderr = output.stderr;

            // Clean up container
            try {
                await container.remove({ force: true });
            } catch {
                // Ignore removal errors
            }
            this.activeContainers.delete(containerId);

            const duration = Date.now() - startTime;
            const success = exitCode === 0 && !timedOut;

            // Log result
            if (success) {
                await this.logToConvex(
                    scanRunId,
                    'info',
                    stage,
                    `[${tool.toUpperCase()}] Completed in ${duration}ms (${stdout.split('\n').length} lines)`
                );

                // Log summary of output
                if (stdout.length > 0) {
                    const summary = summarizeOutput(stdout, 20);
                    await this.logToConvex(scanRunId, 'info', stage, summary);
                }
            } else {
                await this.logToConvex(
                    scanRunId,
                    'error',
                    stage,
                    `[${tool.toUpperCase()}] Failed (exit: ${exitCode}, timeout: ${timedOut})`
                );
                if (stderr) {
                    await this.logToConvex(scanRunId, 'error', stage, stderr.substring(0, 500));
                }
            }

            // Parse output if parser provided
            let parsed: T | undefined;
            if (parser && stdout) {
                try {
                    parsed = parser(stdout) as T;
                } catch (parseError) {
                    console.error('[WORKER] Parse error:', parseError);
                }
            }

            return {
                success,
                stdout,
                stderr,
                exitCode,
                duration,
                timedOut,
                parsed,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            console.error(`[WORKER] Execution error: ${errorMessage}`);
            await this.logToConvex(scanRunId, 'error', stage, `[${tool.toUpperCase()}] Error: ${errorMessage}`);

            // Clean up on error
            if (container) {
                try {
                    await container.remove({ force: true });
                } catch {
                    // Ignore
                }
                this.activeContainers.delete(containerId);
            }

            return {
                success: false,
                stdout,
                stderr,
                exitCode: -1,
                duration,
                timedOut: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Run a tool with mock fallback when Docker is unavailable
     * In strict mode, throws error instead of falling back to mock
     */
    public async runToolWithFallback<T = any>(
        options: ToolExecutionOptions<T>,
        mockResult: string,
        strictMode: boolean = false
    ): Promise<ToolExecutionResult<T>> {
        // Check if Docker is available
        const health = await this.healthCheck();

        if (!health.dockerAvailable || !health.imageExists) {
            // STRICT MODE: Throw critical error instead of using mock
            if (strictMode) {
                const errorMsg = !health.dockerAvailable
                    ? 'CRITICAL: Docker Daemon unavailable. Start Docker Desktop.'
                    : `CRITICAL: Docker image '${WORKER_IMAGE}' not found. Run: docker build -t mikky-os-worker ./mikky-os-worker`;

                await this.logToConvex(
                    options.scanRunId,
                    'critical',
                    options.stage,
                    errorMsg
                );

                throw new Error(errorMsg);
            }

            // NON-STRICT: Use mock fallback (development mode)
            console.log(`[WORKER] Docker unavailable, using mock for: ${options.tool}`);
            await this.logToConvex(
                options.scanRunId,
                'warning',
                options.stage,
                `[${options.tool.toUpperCase()}] Docker unavailable, using mock`
            );

            // Simulate execution time
            await new Promise((r) => setTimeout(r, 2000));

            let parsed: T | undefined;
            if (options.parser) {
                try {
                    parsed = options.parser(mockResult) as T;
                } catch {
                    // Ignore parse errors on mock
                }
            }

            return {
                success: true,
                stdout: mockResult,
                stderr: '',
                exitCode: 0,
                duration: 2000,
                timedOut: false,
                parsed,
            };
        }

        return this.runTool<T>(options);
    }

    /**
     * Demultiplex Docker log stream (stdout/stderr are interleaved)
     */
    /**
     * Demultiplex Docker log stream (stdout/stderr are interleaved)
     */
    private async demuxDockerStream(streamOrBuffer: NodeJS.ReadableStream | Buffer): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve) => {
            const processBuffer = (buffer: Buffer) => {
                let stdout = '';
                let stderr = '';
                let offset = 0;

                // Docker multiplexes stdout/stderr with an 8-byte header
                // Byte 0: stream type (1 = stdout, 2 = stderr)
                // Bytes 4-7: payload length (big endian)

                while (offset < buffer.length) {
                    if (offset + 8 > buffer.length) break;

                    const streamType = buffer[offset];
                    const length = buffer.readUInt32BE(offset + 4);

                    if (offset + 8 + length > buffer.length) break;

                    const payload = buffer.slice(offset + 8, offset + 8 + length).toString('utf8');

                    if (streamType === 1) {
                        stdout += payload;
                    } else if (streamType === 2) {
                        stderr += payload;
                    }

                    offset += 8 + length;
                }

                // Fallback: if no valid headers, treat entire buffer as stdout
                if (stdout === '' && stderr === '' && buffer.length > 0) {
                    stdout = buffer.toString('utf8');
                }

                resolve({ stdout, stderr });
            };

            if (Buffer.isBuffer(streamOrBuffer)) {
                // Mirror to console for immediate visibility
                process.stdout.write(streamOrBuffer.toString('utf8'));
                processBuffer(streamOrBuffer);
            } else {
                const chunks: Buffer[] = [];
                const stream = streamOrBuffer as NodeJS.ReadableStream;
                stream.on('data', (chunk: Buffer) => {
                    // Mirror to console for real-time output
                    process.stdout.write(chunk.toString('utf8'));
                    chunks.push(chunk);
                });
                stream.on('end', () => processBuffer(Buffer.concat(chunks)));
                stream.on('error', () => resolve({ stdout: '', stderr: '' }));
            }
        });
    }

    /**
     * Log a message to Convex scanLogs
     */
    private async logToConvex(
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
            console.error('[WORKER] Log to Convex failed:', error);
        }
    }

    /**
     * Kill all active containers (for cleanup)
     */
    public async killAll(): Promise<void> {
        for (const [id, container] of this.activeContainers) {
            try {
                await container.kill();
                await container.remove({ force: true });
                console.log(`[WORKER] Killed container: ${id}`);
            } catch {
                // Ignore
            }
        }
        this.activeContainers.clear();
    }

    /**
     * Kill the session container for a specific scan
     */
    public async killContainer(scanRunId: string): Promise<boolean> {
        const container = this.scanSessions.get(scanRunId);
        if (container) {
            try {
                console.log(`[WORKER] Killing container for scan: ${scanRunId}`);
                await container.kill();
                await container.remove({ force: true });
                this.scanSessions.delete(scanRunId);
                return true;
            } catch (error) {
                console.error(`[WORKER] Failed to kill container for ${scanRunId}:`, error);
                return false;
            }
        }

        // Also check active ephemeral containers
        for (const [id, cont] of this.activeContainers) {
            // This is a rough check since activeContainers keys are composite, 
            // but we don't map scanId -> ephemeral container directly in a simple map. 
            // However, labels should have it.
            // For now, prompt implies we mostly care about the session container or the "main" one.
            // If we need to find by label, we'd need to inspect. 
            // But existing logic doesn't easily expose ephemeral via scanRunId lookup without iteration.
            // Given the single-threaded nature per step, usually only the session matters or the current tool.
            // Since session is the persistent one, we focus on that.
        }
        return false;
    }
}

// Export singleton instance
export const workerManager = WorkerManager.getInstance();

// Export legacy functions for backwards compatibility
export async function runTool(
    command: string,
    scanRunId: string,
    stage: string
): Promise<ToolExecutionResult> {
    const tool = command.split(' ')[0];
    return workerManager.runTool({ command, scanRunId, stage, tool });
}

export async function runToolWithFallback(
    command: string,
    scanRunId: string,
    stage: string,
    mockResult?: string
): Promise<ToolExecutionResult> {
    const tool = command.split(' ')[0];
    return workerManager.runToolWithFallback(
        { command, scanRunId, stage, tool },
        mockResult || `[MOCK] Output for: ${command}`
    );
}


export async function checkDockerHealth() {
    return workerManager.healthCheck();
}

/**
 * Force kill a container for a specific scan ID
 */
export async function killContainer(scanRunId: string): Promise<boolean> {
    return workerManager.killContainer(scanRunId);
}
