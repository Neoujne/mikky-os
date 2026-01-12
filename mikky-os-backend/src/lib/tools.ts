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
            description: 'Enumerate subdomains of a target domain using subfinder to discover additional attack surface.',
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
    {
        type: 'function',
        function: {
            name: 'amass_enum',
            description: 'Perform advanced subdomain enumeration and network mapping using Amass.',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: 'The root domain to enumerate (e.g., "example.com")',
                    },
                    intensity: {
                        type: 'string',
                        enum: ['passive', 'active'],
                        description: 'Passive (no direct traffic) or Active (DNS resolution/brute)',
                        default: 'passive',
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
            name: 'theharvester_search',
            description: 'Gather emails, names, subdomains, IPs and URLs using multiple public data sources.',
            parameters: {
                type: 'object',
                properties: {
                    domain: {
                        type: 'string',
                        description: 'Domain to search for (e.g., "example.com")',
                    },
                    source: {
                        type: 'string',
                        description: 'Data source (e.g., "google", "bing", "crtsh", "all")',
                        default: 'all',
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
            name: 'nuclei_scan',
            description: 'Run targeted vulnerability scans using Nuclei templates.',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        description: 'Target URL or domain to scan',
                    },
                    template: {
                        type: 'string',
                        description: 'Specific template or category (e.g., "cves", "vulnerabilities", "technologies")',
                        default: 'vulnerabilities',
                    },
                    severity: {
                        type: 'string',
                        enum: ['info', 'low', 'medium', 'high', 'critical'],
                        description: 'Filter findings by severity',
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
            name: 'nikto_scan',
            description: 'Perform a comprehensive web server security scan using Nikto.',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        description: 'Target URL or IP (e.g., "http://example.com")',
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
            name: 'whatweb_probe',
            description: 'Fingerprint web technologies, CMS, and server versions using WhatWeb.',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        description: 'Target URL or domain',
                    },
                    aggression: {
                        type: 'number',
                        description: 'Aggression level (1-4). 1 is stealthy, 3 is aggressive.',
                        default: 1,
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
            name: 'gobuster_dir',
            description: 'Brute-force discover hidden directories and files on a web server.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'Base URL to scan (e.g., "http://example.com/")',
                    },
                    wordlist: {
                        type: 'string',
                        enum: ['common', 'medium', 'big'],
                        description: 'Size of wordlist to use',
                        default: 'common',
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
            name: 'sqlmap_scan',
            description: 'Detect and exploit SQL injection vulnerabilities in a target URL.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'Target URL with parameters (e.g., "http://example.com/page.php?id=1")',
                    },
                    batch: {
                        type: 'boolean',
                        description: 'Never ask for user input, use default behavior',
                        default: true,
                    },
                    risk: {
                        type: 'number',
                        description: 'Risk level (1-3)',
                        default: 1,
                    },
                    level: {
                        type: 'number',
                        description: 'Level of tests to perform (1-5)',
                        default: 1,
                    },
                },
                required: ['url'],
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
            return `subfinder -d ${domain} -silent`;
        }

        case 'amass_enum': {
            const domain = args.domain as string;
            const intensity = (args.intensity as string) || 'passive';
            const flag = intensity === 'active' ? 'enum' : 'enum -passive';
            return `amass ${flag} -d ${domain}`;
        }

        case 'theharvester_search': {
            const domain = args.domain as string;
            const source = (args.source as string) || 'all';
            return `theHarvester -d ${domain} -b ${source}`;
        }

        case 'nuclei_scan': {
            const target = args.target as string;
            const template = (args.template as string) || 'vulnerabilities';
            const severity = args.severity as string;
            let cmd = `nuclei -u ${target} -t ${template} -silent`;
            if (severity) cmd += ` -severity ${severity}`;
            return cmd;
        }

        case 'nikto_scan': {
            const target = args.target as string;
            return `nikto -h ${target} -Tuning 123bde`;
        }

        case 'whatweb_probe': {
            const target = args.target as string;
            const aggression = (args.aggression as number) || 1;
            return `whatweb -a ${aggression} ${target}`;
        }

        case 'gobuster_dir': {
            const url = args.url as string;
            const wordlist = (args.wordlist as string) || 'common';
            const wordlistPath = `/usr/share/wordlists/dirb/${wordlist}.txt`;
            return `gobuster dir -u ${url} -w ${wordlistPath} -z -q`;
        }

        case 'sqlmap_scan': {
            const url = args.url as string;
            const risk = (args.risk as number) || 1;
            const level = (args.level as number) || 1;
            return `sqlmap -u "${url}" --batch --risk ${risk} --level ${level} --random-agent`;
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
