/**
 * MIKKY OS - Tool Definitions
 * 
 * Defines the tools available to the AI agent.
 * Maps tool calls to Docker commands via WorkerManager.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { workerManager } from './docker.js';
import { chat } from './llm.js';
import { convex } from './convex.js';

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
            name: 'generate_final_report',
            description: 'Synthesize all findings into a professional Markdown penetration testing report.',
            parameters: {
                type: 'object',
                properties: {
                    focus_areas: {
                        type: 'string',
                        description: 'Specific areas to highlight in the report (e.g., "SQL Injection", "Exposed Ports")',
                    },
                },
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
    rawOutput: string;
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

        case 'generate_final_report': {
            return `echo "Generating final report for session ${args.sessionId || 'current'}..."`;
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

    // SPECIAL CASE: generate_final_report (Pure AI synthesis, no Docker)
    if (toolName === 'generate_final_report') {
        try {
            const isCliSession = sessionId.startsWith('cli-');
            let rawLogsText = '';

            if (isCliSession) {
                const run = await convex.query('agent:getRunStatus' as any, { sessionId }) as any;
                rawLogsText = (run?.rawLogs || []).join('\n---\n');
            } else {
                const logs = await convex.query('scanLogs:getAllByScanRun' as any, { scanRunId: sessionId }) as any[];
                rawLogsText = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
            }

            if (!rawLogsText || rawLogsText.length < 10) {
                return {
                    success: false,
                    output: 'Insufficient evidence to generate a report. Run some scans first!',
                    rawOutput: '',
                    error: 'Empty log history'
                };
            }

            const prompt = `You are a Senior Penetration Tester. Generate a professional Markdown report based on the following RAW tool logs.
            
TEMPLATE:
# Penetration Test Report: [Target]
## 1. Executive Summary
[High-level findings and risk posture]
## 2. Methodology
[List tools used: Nmap, Nuclei, etc.]
## 3. Vulnerability Findings
### [Finding Name]
- **Severity:** [Critical/High/Medium/Low/Info]
- **Evidence:** [Snippet from raw logs]
- **Remediation:** [How to fix]

RAW LOG DATA:
${rawLogsText.substring(0, 50000)}
`;

            const reportResponse = await chat({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });

            const reportContent = reportResponse.content || 'Failed to generate report content.';

            // Save to database
            if (isCliSession) {
                await convex.mutation('agent:updateStatus' as any, {
                    sessionId,
                    status: 'completed',
                    thought: 'Generated final report.',
                    finalReport: reportContent
                });
            } else {
                await convex.mutation('scans:updateStatus' as any, {
                    id: sessionId,
                    aiSummary: reportContent
                });
            }

            return {
                success: true,
                output: `Final report generated and persisted to database. Summary:\n\n${reportContent.substring(0, 500)}...`,
                rawOutput: reportContent
            };
        } catch (err) {
            console.error('[TOOLS] Report generation failed:', err);
            return {
                success: false,
                output: 'Failed to synthesize report.',
                rawOutput: '',
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    }

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
            const rawOutput = result.stdout || 'Command completed with no output.';
            let output = rawOutput;

            // HYBRID OUTPUT STRATEGY: Truncate for Agent context window
            // The full raw logs are saved to the database via WorkerManager
            if (output.length > 2000) {
                output = output.substring(0, 2000) + "\n\n... [Output truncated. Full logs saved to database] ...";
            }

            return {
                success: true,
                output: output,
                rawOutput: rawOutput,
            };
        } else if (result.timedOut) {
            return {
                success: false,
                output: '',
                rawOutput: '',
                error: `Command timed out after ${result.duration}ms`,
            };
        } else {
            return {
                success: false,
                output: result.stdout || '',
                rawOutput: result.stdout || '',
                error: result.stderr || `Command failed with exit code ${result.exitCode}`,
            };
        }
    } catch (error) {
        console.error(`[TOOLS] Execution error:`, error);
        return {
            success: false,
            output: '',
            rawOutput: '',
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
