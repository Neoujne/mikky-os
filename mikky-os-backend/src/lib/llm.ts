/**
 * MIKKY OS - LLM Integration (OpenRouter)
 * 
 * Wrapper for OpenRouter API using the OpenAI SDK.
 * Supports tool calling for the ReAct agent loop.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

// Initialize OpenAI client with OpenRouter endpoint
const openai = new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'https://mikky-os.dev',
        'X-Title': 'MIKKY OS Security Agent',
    },
});

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    name?: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface ChatResponse {
    content: string | null;
    toolCalls: ToolCall[] | null;
    finishReason: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ChatOptions {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ToolCallOptions extends ChatOptions {
    tools: ChatCompletionTool[];
    toolChoice?: 'auto' | 'none' | 'required';
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export const MIKKY_SYSTEM_PROMPT = `You are MIKKY, an autonomous offensive security agent. You help security professionals conduct authorized penetration testing and vulnerability assessments.

CRITICAL RULES:
1. You MUST use tools to gather information - never make up scan results
2. Always confirm the target before scanning
3. Be concise and professional in your responses
4. When you call a tool, wait for results before providing analysis

AVAILABLE TOOLS:
- nmap_scan: Port scanning and service detection
- whois_lookup: Domain registration information
- dns_lookup: DNS records for a domain
- http_probe: HTTP service detection and headers
- subdomain_enum: Subdomain enumeration

When a user asks to "scan", "hack", or "check" a target, you should:
1. Acknowledge the target
2. Use appropriate tools to gather information
3. Analyze the results and provide a summary

Always be helpful but remember: you are an offensive security agent. Think like a hacker.

IMPORTANT OUTPUT RULES:
- After executing a tool, summarize the findings in plain English.
- NEVER output the raw JSON "tool_outputs" block to the user.
- Hide technical debug data and only show the insight.
- If a scan fails, explain why plainly (e.g. "Permission denied", "Target offline").`;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Send a chat message to the LLM
 */
export async function chat(options: ChatOptions): Promise<ChatResponse> {
    const { messages, model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 2048 } = options;

    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: messages as ChatCompletionMessageParam[],
            temperature,
            max_tokens: maxTokens,
        });

        const choice = response.choices[0];

        return {
            content: choice.message.content,
            toolCalls: null,
            finishReason: choice.finish_reason || 'stop',
            model: response.model,
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            } : undefined,
        };
    } catch (error) {
        console.error('[LLM] Chat error:', error);
        throw error;
    }
}

/**
 * Send a chat message with tool definitions (for function calling)
 */
/**
 * Send a chat message with tool definitions (for function calling)
 * Includes robust error handling and fallback logic
 */
export async function chatWithTools(options: ToolCallOptions): Promise<ChatResponse> {
    const {
        messages,
        tools,
        model = DEFAULT_MODEL,
        temperature = 0.3, // Lower temperature for tool calling
        maxTokens = 2048,
        toolChoice = 'auto',
    } = options;

    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: messages as ChatCompletionMessageParam[],
            tools,
            tool_choice: toolChoice,
            temperature,
            max_tokens: maxTokens,
        });

        const choice = response.choices[0];
        // Handle tool calls - filter for function type and map
        const toolCalls = choice.message.tool_calls
            ?.filter((tc): tc is { id: string; type: 'function'; function: { name: string; arguments: string } } =>
                tc.type === 'function' && 'function' in tc
            )
            .map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                },
            })) || null;

        return {
            content: choice.message.content,
            toolCalls,
            finishReason: choice.finish_reason || 'stop',
            model: response.model,
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            } : undefined,
        };
    } catch (error: any) {
        console.error('[LLM] Tool chat error:', error);

        // Detailed error logging for debugging provider issues
        if (error.response) {
            console.error('[LLM] Provider error details:', JSON.stringify(error.response.data, null, 2));
        }

        // FALLBACK LOGIC: If tool calling fails (400 Bad Request), retry without tools
        // This often happens if the provider doesn't support the specific tool schema or model doesn't support tools
        if (error.status === 400 || (error.message && error.message.includes('400'))) {
            console.warn('[LLM] Falling back to text-only mode due to provider error...');

            // Add a system instruction to guide the text-only response
            const fallbackMessages = [
                ...messages,
                {
                    role: 'system' as const,
                    content: 'SYSTEM NOTICE: Tool execution is currently unavailable. Please just expect that you cannot run tools right now. Suggest the commands the user should run manually instead.'
                }
            ];

            return chat({
                messages: fallbackMessages,
                model,
                temperature: 0.7,
                maxTokens,
            });
        }

        throw error;
    }
}

/**
 * Check if LLM is configured and available
 */
export function isConfigured(): boolean {
    return !!OPENROUTER_API_KEY;
}

/**
 * Get the current model being used
 */
export function getCurrentModel(): string {
    return DEFAULT_MODEL;
}

/**
 * Summarize a conversation history into a concise technical state
 */
export async function summarizeContext(messages: ChatMessage[]): Promise<string> {
    if (!OPENROUTER_API_KEY) {
         throw new Error('OPENROUTER_API_KEY is not set');
    }

    try {
        // Filter out system messages to avoid confusing the summarizer
        const conversationHistory = messages.filter(m => m.role !== 'system');
        
        const response = await chat({
            messages: [
                {
                    role: 'system',
                    content: 'Summarize the previous findings (User inputs and Assistant tool outputs) into a concise technical state. Focus on open ports, vulnerabilities found, and current objective. Ignore conversational filler.'
                },
                ...conversationHistory
            ],
            model: DEFAULT_MODEL,
            temperature: 0.3, // Low temp for factual summary
        });

        return response.content || 'No summary generated.';
    } catch (error) {
        console.error('[LLM] Summarization error:', error);
        return 'Failed to generate summary.';
    }
}

