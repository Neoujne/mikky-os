/**
 * MIKKY OS - Agent Inngest Function
 * 
 * The ReAct (Reasoning + Acting) loop for the autonomous security agent.
 * Handles: Think → Act → Observe → Repeat
 */

import { inngest } from './client.js';
import { chatWithTools, MIKKY_SYSTEM_PROMPT, summarizeContext, type ChatMessage, type ToolCall } from '../lib/llm.js';
import { AGENT_TOOLS, executeToolCall, formatToolResult } from '../lib/tools.js';
import { workerManager } from '../lib/docker.js';
import { convex } from '../lib/convex.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_TOOL_ITERATIONS = 5; // Prevent infinite loops
const SESSION_TIMEOUT = 300000; // 5 minutes max per request

// ============================================================================
// TYPES
// ============================================================================

interface AgentEvent {
    name: 'agent/received_message';
    data: {
        message: string;
        sessionId: string;
        userId?: string;
    };
}

type AgentStatus = 'thinking' | 'executing_tool' | 'analyzing' | 'complete' | 'error';

// In-memory session storage (for MVP - can be moved to Convex later)
const sessionHistory: Map<string, ChatMessage[]> = new Map();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Push a status update to Convex for the CLI to display
 * Uses the new agent:updateStatus mutation
 */
async function pushStatus(
    sessionId: string,
    status: 'thinking' | 'executing' | 'analyzing' | 'completed' | 'failed',
    thought: string,
    options?: {
        log?: string;
        currentTool?: string;
        finalResponse?: string;
    }
): Promise<void> {
    console.log(`[AGENT] Status: ${status} - ${thought}`);

    try {
        await convex.mutation('agent:updateStatus' as any, {
            sessionId,
            status,
            thought,
            log: options?.log,
            currentTool: options?.currentTool,
            finalResponse: options?.finalResponse,
        });
    } catch (error) {
        // Log but don't crash - CLI will still work with polling
        console.warn('[AGENT] Failed to push status to Convex:', error);
    }
}

/**
 * Initialize a new agent run in Convex
 */
async function createAgentRun(sessionId: string): Promise<void> {
    try {
        await convex.mutation('agent:createRun' as any, { sessionId });
        console.log(`[AGENT] Created run for session: ${sessionId}`);
    } catch (error) {
        console.warn('[AGENT] Failed to create agent run:', error);
    }
}

/**
 * Get or initialize session history
 */
function getSessionHistory(sessionId: string): ChatMessage[] {
    if (!sessionHistory.has(sessionId)) {
        sessionHistory.set(sessionId, [
            { role: 'system', content: MIKKY_SYSTEM_PROMPT }
        ]);
    }
    return sessionHistory.get(sessionId)!;
}

/**
 * Parse tool call arguments from JSON string
 */
function parseToolArgs(argsString: string): Record<string, unknown> {
    try {
        return JSON.parse(argsString);
    } catch {
        console.error('[AGENT] Failed to parse tool args:', argsString);
        return {};
    }
}

// ============================================================================
// INNGEST FUNCTION
// ============================================================================

export const agentFunction = inngest.createFunction(
    {
        id: 'mikky-agent-react-loop',
        name: 'MIKKY Agent - ReAct Loop',
        retries: 0, // Don't retry agent runs
    },
    { event: 'agent/received_message' },
    async ({ event, step }) => {
        const { message, sessionId, userId } = event.data;

        console.log(`[AGENT] Received message for session ${sessionId}: ${message}`);

        // =====================================================================
        // STEP 1: Initialize Session & Fetch History from Convex
        // =====================================================================
        const history = await step.run('initialize-session', async () => {
            // Create agent run in Convex for CLI polling
            await createAgentRun(sessionId);
            await pushStatus(sessionId, 'thinking', 'Initializing agent session...');

            // Ensure Docker session is ready
            await workerManager.startSession(sessionId);

            // Fetch persistent history from Convex
            let convexHistory: ChatMessage[] = [];
            try {
                const result = await convex.query('agent:getHistory' as any, { sessionId });
                if (result && Array.isArray(result)) {
                    convexHistory = result as ChatMessage[];
                    console.log(`[AGENT] Loaded ${convexHistory.length} messages from Convex history`);
                }
            } catch (err) {
                console.warn('[AGENT] Failed to fetch history from Convex:', err);
            }

            // INFINITE CONTEXT STRATEGY
            // If history is too long, summarize it to save tokens and maintain focus
            if (convexHistory.length > 3) {
                await pushStatus(sessionId, 'analyzing', 'Summarizing previous context (Infinite Memory)...');
                const summary = await summarizeContext(convexHistory);
                console.log(`[AGENT] Generated context summary: ${summary.substring(0, 50)}...`);

                return [
                    { role: 'system', content: MIKKY_SYSTEM_PROMPT },
                    { role: 'system', content: `PREVIOUS CONTEXT SUMMARY:\n${summary}` },
                    { role: 'user', content: message },
                ];
            }

            // Build full history: System Prompt + Persisted History + New User Message
            const history: ChatMessage[] = [
                { role: 'system', content: MIKKY_SYSTEM_PROMPT },
                ...convexHistory,
                { role: 'user', content: message },
            ];

            return history;
        });

        // =====================================================================
        // STEP 2-N: ReAct Loop (Think → Act → Observe)
        // =====================================================================
        let iterations = 0;
        let finalResponse: string | null = null;
        let currentHistory = [...history];

        while (iterations < MAX_TOOL_ITERATIONS && !finalResponse) {
            iterations++;

            // THINK + ACT: Call LLM and execute any tool calls in the same step
            // This avoids Inngest JSON serialization issues with complex types
            const iterationResult = await step.run(`react-iteration-${iterations}`, async () => {
                await pushStatus(sessionId, 'thinking', `Processing... (iteration ${iterations})`);

                const response = await chatWithTools({
                    messages: currentHistory,
                    tools: AGENT_TOOLS,
                    toolChoice: 'auto',
                });

                console.log(`[AGENT] LLM response:`, {
                    hasContent: !!response.content,
                    toolCalls: response.toolCalls?.length || 0,
                    finishReason: response.finishReason,
                });

                // If no tool calls, this is the final response
                if (!response.toolCalls || response.toolCalls.length === 0) {
                    return {
                        type: 'final' as const,
                        content: response.content || 'I was unable to process your request.',
                        historyUpdates: [] as ChatMessage[],
                    };
                }

                // ACT: Execute each tool call
                const historyUpdates: ChatMessage[] = [];

                // Add the assistant message with intent to call tools
                historyUpdates.push({
                    role: 'assistant',
                    content: response.content || '',
                });

                for (const toolCall of response.toolCalls) {
                    await pushStatus(
                        sessionId,
                        'executing',
                        `Running ${toolCall.function.name}...`,
                        { currentTool: toolCall.function.name }
                    );

                    const args = parseToolArgs(toolCall.function.arguments);
                    const result = await executeToolCall(toolCall.function.name, args, sessionId);

                    // Log the tool result
                    const toolOutput = formatToolResult(toolCall.function.name, result);
                    await pushStatus(
                        sessionId,
                        'analyzing',
                        `Analyzing ${toolCall.function.name} results...`,
                        { log: `[${toolCall.function.name}] ${result.success ? 'Completed' : 'Failed'}` }
                    );

                    // Add tool result to history
                    historyUpdates.push({
                        role: 'tool',
                        content: toolOutput,
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                    });
                }

                return {
                    type: 'continue' as const,
                    content: null,
                    historyUpdates,
                };
            });

            // Update history with results from this iteration
            currentHistory = [...currentHistory, ...iterationResult.historyUpdates];

            if (iterationResult.type === 'final') {
                finalResponse = iterationResult.content;
            }
        }

        // =====================================================================
        // STEP FINAL: Return Result
        // =====================================================================
        const result = await step.run('finalize', async () => {
            // If we hit max iterations without a final response
            if (!finalResponse) {
                finalResponse = "I've gathered a lot of information but need to stop here. Here's what I found based on my tool executions.";
            }

            // Update session history
            currentHistory.push({
                role: 'assistant',
                content: finalResponse,
            });
            sessionHistory.set(sessionId, currentHistory);

            // Save user message + assistant response to Convex for persistence
            try {
                await convex.mutation('agent:appendHistory' as any, {
                    sessionId,
                    messages: [
                        { role: 'user', content: message },
                        { role: 'assistant', content: finalResponse },
                    ],
                });
                console.log(`[AGENT] Saved conversation to Convex history`);
            } catch (err) {
                console.warn('[AGENT] Failed to save history to Convex:', err);
            }

            // Push final status
            await pushStatus(sessionId, 'completed', 'Request completed.', {
                finalResponse,
            });

            return {
                success: true,
                response: finalResponse,
                iterations,
                sessionId,
            };
        });

        // Clean up Docker session (optional - could keep for future messages)
        await step.run('cleanup', async () => {
            // Don't end session immediately - let it persist for follow-up messages
            // await workerManager.endSession(sessionId);
            console.log(`[AGENT] Session ${sessionId} completed after ${iterations} iterations`);
        });

        return result;
    }
);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Clear a session's history (for /reset command)
 */
export function clearSessionHistory(sessionId: string): void {
    sessionHistory.delete(sessionId);
    console.log(`[AGENT] Cleared history for session: ${sessionId}`);
}

/**
 * Get session history length (for debugging)
 */
export function getSessionHistoryLength(sessionId: string): number {
    return sessionHistory.get(sessionId)?.length || 0;
}
