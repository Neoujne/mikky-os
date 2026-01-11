/**
 * MIKKY CLI - Agent Client
 * Real backend communication with polling support
 */

import axios, { type AxiosInstance } from 'axios';
import ora, { type Ora } from 'ora';
import { getApiKey } from '../commands/auth.js';
import { colors, printMessage } from './ui.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentResponse {
    type: 'text' | 'action';
    message: string;
    action?: {
        type: 'scan' | 'status' | 'info' | 'error';
        target?: string;
        taskId?: string;
    };
}

export interface AgentStatus {
    status: 'thinking' | 'executing' | 'analyzing' | 'completed' | 'failed';
    thought?: string;
    logs: string[];
    currentTool?: string;
    finalResponse?: string;
    lastUpdated: number;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const POLL_INTERVAL_MS = 1000; // Poll every 1 second
const MAX_POLL_ATTEMPTS = 300; // 5 minutes max (300 * 1s)

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class AgentClient {
    private baseUrl: string;
    private client: AxiosInstance;
    private history: ConversationMessage[] = [];
    private sessionId: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.MIKKY_BACKEND_URL || 'http://localhost:3000';
        this.sessionId = this.generateSessionId();

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `cli-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Send a chat message and poll for response
     */
    async chat(prompt: string): Promise<AgentResponse> {
        // Add user message to history
        this.history.push({ role: 'user', content: prompt });

        try {
            // Step 1: Send message to backend
            const apiKey = getApiKey();
            await this.client.post('/api/agent/chat', {
                message: prompt,
                sessionId: this.sessionId,
            }, {
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
            });

            // Step 2: Poll for status updates
            const response = await this.pollForCompletion();

            this.history.push({ role: 'assistant', content: response.message });
            return response;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    return {
                        type: 'text',
                        message: `❌ Unable to connect to MIKKY backend at ${this.baseUrl}\n` +
                            `Make sure the server is running with: ${colors.accent('npm run dev')}`,
                    };
                }
                return {
                    type: 'text',
                    message: `❌ API Error: ${error.message}`,
                };
            }
            throw error;
        }
    }

    /**
     * Poll the backend for agent status updates
     */
    private async pollForCompletion(): Promise<AgentResponse> {
        let pollCount = 0;
        let spinner: Ora | null = null;
        let lastStatus: string | null = null;
        let lastThought: string | null = null;
        let printedLogs: Set<string> = new Set();

        try {
            // Initial spinner
            spinner = ora({
                text: `${colors.primary('🧠')} Agent is thinking...`,
                spinner: 'dots',
                color: 'cyan',
            }).start();

            while (pollCount < MAX_POLL_ATTEMPTS) {
                pollCount++;

                try {
                    const response = await this.client.get<AgentStatus>(
                        `/api/agent/status/${this.sessionId}`
                    );
                    const status = response.data;

                    // Print new logs above spinner (avoid duplicates)
                    for (const log of status.logs) {
                        if (!printedLogs.has(log)) {
                            printedLogs.add(log);
                            // Stop spinner temporarily to print log
                            if (spinner) spinner.stop();
                            printMessage(`  ${colors.dim('│')} ${log}`, 'dim');
                            if (spinner) spinner.start();
                        }
                    }

                    // Update spinner only if status or thought changed
                    const statusChanged = status.status !== lastStatus;
                    const thoughtChanged = status.thought !== lastThought;

                    if ((statusChanged || thoughtChanged) && spinner) {
                        lastStatus = status.status;
                        lastThought = status.thought || null;

                        // Update spinner based on status
                        switch (status.status) {
                            case 'thinking':
                                spinner.text = `${colors.primary('🧠')} ${status.thought || 'Agent is thinking...'}`;
                                spinner.color = 'cyan';
                                break;
                            case 'executing':
                                spinner.text = `${colors.warning('⚡')} ${status.thought || `Running ${status.currentTool || 'tool'}...`}`;
                                spinner.color = 'yellow';
                                break;
                            case 'analyzing':
                                spinner.text = `${colors.info('🔍')} ${status.thought || 'Analyzing results...'}`;
                                spinner.color = 'blue';
                                break;
                            case 'completed':
                                spinner.succeed(`${colors.success('✓')} Request completed`);
                                spinner = null;
                                return {
                                    type: 'text',
                                    message: status.finalResponse || 'Request completed.',
                                };
                            case 'failed':
                                spinner.fail(`${colors.danger('✗')} Request failed`);
                                spinner = null;
                                return {
                                    type: 'text',
                                    message: status.thought || 'An error occurred.',
                                };
                        }
                    }

                } catch (pollError) {
                    // 404 means session not ready yet, keep waiting
                    if (axios.isAxiosError(pollError) && pollError.response?.status === 404) {
                        // Session not found yet, wait longer on first attempts
                        if (pollCount < 5) {
                            await this.delay(2000);
                            continue;
                        }
                    }
                    // Other errors - log but continue polling
                    console.error('Poll error:', pollError);
                }

                // Wait before next poll
                await this.delay(POLL_INTERVAL_MS);
            }

            // Max attempts reached
            if (spinner) spinner.warn('Request timed out after 5 minutes');
            return {
                type: 'text',
                message: '⏱️ Request timed out. The agent is still processing in the background.',
            };

        } catch (error) {
            if (spinner) spinner.fail('Error during polling');
            throw error;
        }
    }

    /**
     * Get conversation history
     */
    getHistory(): ConversationMessage[] {
        return [...this.history];
    }

    /**
     * Clear conversation history and reset session
     */
    clearHistory(): void {
        this.history = [];
        this.sessionId = this.generateSessionId();
    }

    /**
     * Get current session ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Singleton instance
let agentInstance: AgentClient | null = null;

export function getAgentClient(): AgentClient {
    if (!agentInstance) {
        agentInstance = new AgentClient();
    }
    return agentInstance;
}
