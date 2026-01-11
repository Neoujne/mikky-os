/**
 * MIKKY OS - Tool Definitions
 * 
 * Defines the tools available to the AI agent.
 * Maps tool calls to Docker commands via WorkerManager.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { workerManager } from './docker.js';

// ============================================================================
// TOOL DEFINITIONS (OpenAI Function Calling Format)
// ============================================================================

export const AGENT_TOOLS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'nmap_scan',
            description: 'Perform a port scan on a target IP or domain using Nmap. Use for discovering open ports and running services.',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        description: 'The target IP address or domain to scan (e.g., "192.168.1.1" or "example.com")',
                    },
                    scan_type: {
                        type: 'string',
                        enum: ['fast', 'normal', 'full', 'stealth'],
                        description: 'Type of scan: fast (-F), normal (top 1000), full (-p-), stealth (-sS)',
                        default: 'fast',
                    },
                },
                required: ['target'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'whois_lookup',
            description: 'Perform a WHOIS lookup to get domain registration information including registrar, creation date, and contact info.',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: 'The domain to look up (e.g., "example.com")',
                    },
                },
                required: ['domain'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'dns_lookup',
            description: 'Perform DNS lookups to discover DNS records (A, AAAA, MX, TXT, NS, CNAME) for a domain.',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: 'The domain to query (e.g., "example.com")',
                    },
                    record_type: {
                        type: 'string',
                        enum: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'ANY'],
                        description: 'Type of DNS record to query',
                        default: 'ANY',
                    },
                },
                required: ['domain'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'http_probe',
            description: 'Probe HTTP/HTTPS services to detect web servers, technologies, and response headers.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL or domain to probe (e.g., "https://example.com" or "example.com")',
                    },
                },
                required: ['url'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'subdomain_enum',
            description: 'Enumerate subdomains of a target domain to discover additional attack surface.',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: 'The root domain to enumerate subdomains for (e.g., "example.com")',
                    },
                },
                required: ['domain'],
                additionalProperties: false,
            },
        },
    },
];

// ============================================================================
// TOOL EXECUTION
// ============================================================================

interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

/**
 * Build the Docker command for a tool
 */
function buildCommand(toolName: string, args: Record<string, unknown>): string {
    switch (toolName) {
        case 'nmap_scan': {
            const target = args.target as string;
            const scanType = (args.scan_type as string) || 'fast';

            let flags = '-F'; // fast by default
            switch (scanType) {
                case 'normal':
                    flags = '';
                    break;
                case 'full':
                    flags = '-p-';
                    break;
                case 'stealth':
                    flags = '-sS -T2';
                    break;
            }

            return `nmap ${flags} ${target}`.trim();
        }

        case 'whois_lookup': {
            const domain = args.domain as string;
            return `whois ${domain}`;
        }

        case 'dns_lookup': {
            const domain = args.domain as string;
            const recordType = (args.record_type as string) || 'ANY';
            return `dig ${domain} ${recordType} +short`;
        }

        case 'http_probe': {
            const url = args.url as string;
            // Use curl for HTTP probing
            return `curl -sI -L --max-time 10 ${url}`;
        }

        case 'subdomain_enum': {
            const domain = args.domain as string;
            // Use subfinder if available, fallback to DNS brute
            return `subfinder -d ${domain} -silent 2>/dev/null || echo "Subdomain enumeration requires subfinder"`;
        }

        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
    toolName: string,
    args: Record<string, unknown>,
    sessionId: string
): Promise<ToolResult> {
    console.log(`[TOOLS] Executing: ${toolName}`, args);

    try {
        const command = buildCommand(toolName, args);
        console.log(`[TOOLS] Command: ${command}`);

        // Execute via WorkerManager
        const result = await workerManager.runToolInSession({
            command,
            scanRunId: sessionId,
            stage: 'agent',
            tool: toolName,
            timeout: 60000, // 1 minute timeout for agent tools
        });

        if (result.success) {
            return {
                success: true,
                output: result.stdout || 'Command completed with no output.',
            };
        } else if (result.timedOut) {
            return {
                success: false,
                output: '',
                error: `Command timed out after ${result.duration}ms`,
            };
        } else {
            return {
                success: false,
                output: result.stdout || '',
                error: result.stderr || `Command failed with exit code ${result.exitCode}`,
            };
        }
    } catch (error) {
        console.error(`[TOOLS] Execution error:`, error);
        return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get tool definition by name
 */
export function getToolByName(name: string): ChatCompletionTool | undefined {
    return AGENT_TOOLS.find(t => {
        if (t.type === 'function' && 'function' in t) {
            return (t as { type: 'function'; function: { name: string } }).function.name === name;
        }
        return false;
    });
}

/**
 * Format tool result for LLM consumption
 */
export function formatToolResult(toolName: string, result: ToolResult): string {
    if (result.success) {
        return `Tool "${toolName}" completed successfully:\n\n${result.output}`;
    } else {
        return `Tool "${toolName}" failed: ${result.error}\n\nPartial output:\n${result.output}`;
    }
}
