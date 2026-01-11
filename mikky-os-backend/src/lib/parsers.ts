/**
 * Output Parsers - Transform raw CLI output into structured data
 * Used by the WorkerManager to extract meaningful information from tool outputs.
 */

// ============================================================================
// SUBDOMAIN PARSERS
// ============================================================================

/**
 * Parse subfinder output (one subdomain per line)
 */
export function parseSubfinderOutput(output: string): string[] {
    return output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('['));
}

/**
 * Parse DNS dig output for subdomains/records
 */
export function parseDigOutput(output: string): { records: string[]; ips: string[] } {
    const lines = output.split('\n').filter((l) => l.trim());
    const ips: string[] = [];
    const records: string[] = [];

    for (const line of lines) {
        // Match IP addresses
        const ipMatch = line.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
        if (ipMatch) {
            ips.push(ipMatch[1]);
        }
        // Match domain records
        if (line.includes('.') && !line.startsWith(';')) {
            records.push(line.trim());
        }
    }

    return { records, ips: [...new Set(ips)] };
}

// ============================================================================
// WHOIS PARSER
// ============================================================================

export interface WhoisData {
    registrar?: string;
    createdDate?: string;
    expiryDate?: string;
    nameServers: string[];
    registrantOrg?: string;
}

export function parseWhoisOutput(output: string): WhoisData {
    const data: WhoisData = { nameServers: [] };

    const lines = output.split('\n');
    for (const line of lines) {
        const lower = line.toLowerCase();

        if (lower.includes('registrar:')) {
            data.registrar = line.split(':').slice(1).join(':').trim();
        }
        if (lower.includes('creation date:') || lower.includes('created:')) {
            data.createdDate = line.split(':').slice(1).join(':').trim();
        }
        if (lower.includes('expir') && lower.includes('date')) {
            data.expiryDate = line.split(':').slice(1).join(':').trim();
        }
        if (lower.includes('name server:') || lower.includes('nserver:')) {
            const ns = line.split(':').slice(1).join(':').trim();
            if (ns) data.nameServers.push(ns.toLowerCase());
        }
        if (lower.includes('registrant organization:') || lower.includes('org:')) {
            data.registrantOrg = line.split(':').slice(1).join(':').trim();
        }
    }

    return data;
}

// ============================================================================
// NMAP PARSER
// ============================================================================

export interface NmapPort {
    port: number;
    protocol: string;
    state: string;
    service: string;
    version?: string;
}

export interface NmapResult {
    host: string;
    hostStatus: 'up' | 'down' | 'unknown';
    ports: NmapPort[];
    osGuess?: string;
}

export function parseNmapOutput(output: string): NmapResult {
    const result: NmapResult = {
        host: '',
        hostStatus: 'unknown',
        ports: [],
    };

    // Handle empty or null output gracefully
    if (!output || output.trim() === '') {
        console.log('[PARSER] Nmap output is empty');
        return result;
    }

    const lines = output.split('\n');

    // Check for "host seems down" or similar failure messages
    const fullOutput = output.toLowerCase();
    if (fullOutput.includes('host seems down') || fullOutput.includes('0 hosts up')) {
        result.hostStatus = 'down';
        // Try to extract host from the output anyway
        for (const line of lines) {
            if (line.includes('Nmap scan report for')) {
                const match = line.match(/for\s+(.+?)(?:\s+\(|$)/);
                if (match) result.host = match[1].trim();
                break;
            }
        }
        return result;
    }

    for (const line of lines) {
        // Parse host status
        if (line.includes('Nmap scan report for')) {
            const match = line.match(/for\s+(.+?)(?:\s+\(|$)/);
            if (match) result.host = match[1].trim();
        }

        if (line.includes('Host is up')) {
            result.hostStatus = 'up';
        }

        // Parse port lines: "22/tcp   open  ssh     OpenSSH 8.4"
        const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+(\S+)(?:\s+(.*))?$/);
        if (portMatch) {
            result.ports.push({
                port: parseInt(portMatch[1], 10),
                protocol: portMatch[2],
                state: portMatch[3],
                service: portMatch[4],
                version: portMatch[5]?.trim(),
            });
        }

        // Parse OS detection
        if (line.includes('OS details:') || line.includes('Running:')) {
            result.osGuess = line.split(':').slice(1).join(':').trim();
        }
    }

    return result;
}

// ============================================================================
// HTTP HEADER PARSER
// ============================================================================

export interface SecurityHeaders {
    hsts: boolean;
    csp: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    xXssProtection: boolean;
    referrerPolicy: boolean;
    permissionsPolicy: boolean;
    score: number; // 0-100
    missing: string[];
}

export function parseSecurityHeaders(output: string): SecurityHeaders {
    const headers = output.toLowerCase();
    const result: SecurityHeaders = {
        hsts: headers.includes('strict-transport-security'),
        csp: headers.includes('content-security-policy'),
        xContentTypeOptions: headers.includes('x-content-type-options'),
        xFrameOptions: headers.includes('x-frame-options'),
        xXssProtection: headers.includes('x-xss-protection'),
        referrerPolicy: headers.includes('referrer-policy'),
        permissionsPolicy: headers.includes('permissions-policy') || headers.includes('feature-policy'),
        score: 0,
        missing: [],
    };

    // Calculate score
    const checks = [
        { name: 'HSTS', present: result.hsts },
        { name: 'CSP', present: result.csp },
        { name: 'X-Content-Type-Options', present: result.xContentTypeOptions },
        { name: 'X-Frame-Options', present: result.xFrameOptions },
        { name: 'Referrer-Policy', present: result.referrerPolicy },
    ];

    let score = 0;
    for (const check of checks) {
        if (check.present) {
            score += 20;
        } else {
            result.missing.push(check.name);
        }
    }
    result.score = score;

    return result;
}

// ============================================================================
// HTTPX / LIVE HOST PARSER
// ============================================================================

export interface LiveHost {
    url: string;
    statusCode: number;
    title?: string;
    contentLength?: number;
}

export function parseHttpxOutput(output: string): LiveHost[] {
    const hosts: LiveHost[] = [];
    const lines = output.split('\n').filter((l) => l.trim());

    for (const line of lines) {
        // HTTPX JSON mode: {"url":"https://example.com","status_code":200,...}
        try {
            if (line.startsWith('{')) {
                const json = JSON.parse(line);
                hosts.push({
                    url: json.url || json.input,
                    statusCode: json.status_code || json.status || 0,
                    title: json.title,
                    contentLength: json.content_length,
                });
                continue;
            }
        } catch {
            // Not JSON, try regex
        }

        // Simple URL extraction fallback
        const urlMatch = line.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            const statusMatch = line.match(/\[(\d{3})\]/);
            hosts.push({
                url: urlMatch[0],
                statusCode: statusMatch ? parseInt(statusMatch[1], 10) : 200,
            });
        }
    }

    return hosts;
}

// ============================================================================
// WHATWEB / TECH DETECTION PARSER
// ============================================================================

export interface TechStack {
    technologies: string[];
    server?: string;
    cms?: string;
    framework?: string;
}

export function parseWhatwebOutput(output: string): TechStack {
    const result: TechStack = { technologies: [] };

    // WhatWeb outputs like: http://example.com [200 OK] Apache[2.4.41], WordPress[5.8]
    const techMatches = output.matchAll(/\[([^\]]+)\]/g);
    for (const match of techMatches) {
        const tech = match[1];
        if (tech === '200 OK' || tech === '301' || tech === '302') continue;

        result.technologies.push(tech);

        const lower = tech.toLowerCase();
        if (lower.includes('apache') || lower.includes('nginx') || lower.includes('iis')) {
            result.server = tech;
        }
        if (lower.includes('wordpress') || lower.includes('drupal') || lower.includes('joomla')) {
            result.cms = tech;
        }
        if (lower.includes('react') || lower.includes('angular') || lower.includes('vue') || lower.includes('next')) {
            result.framework = tech;
        }
    }

    return result;
}

// ============================================================================
// GENERIC OUTPUT SUMMARY
// ============================================================================

export function summarizeOutput(output: string, maxLines: number = 50): string {
    const lines = output.split('\n');
    if (lines.length <= maxLines) return output;

    const head = lines.slice(0, maxLines / 2).join('\n');
    const tail = lines.slice(-maxLines / 2).join('\n');
    return `${head}\n\n... [${lines.length - maxLines} lines truncated] ...\n\n${tail}`;
}
