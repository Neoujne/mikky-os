import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock workerManager
vi.mock('./docker.js', () => ({
    workerManager: {
        runToolInSession: vi.fn().mockResolvedValue({
            success: true,
            stdout: 'mock output',
            stderr: '',
            exitCode: 0,
            duration: 100
        })
    },
    TOOL_TIMEOUTS: {}
}));

// Mock convex
vi.mock('./convex.js', () => ({
    convex: {
        query: vi.fn().mockResolvedValue('active')
    }
}));

import { executeToolCall } from './tools';
import { workerManager } from './docker';

describe('Tool Command Generation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate correct nmap_scan command', async () => {
        await executeToolCall('nmap_scan', { target: 'example.com', scan_type: 'stealth' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'nmap -sS -T2 example.com'
        }));
    });

    it('should generate correct nuclei_scan command', async () => {
        await executeToolCall('nuclei_scan', { target: 'example.com', template: 'cves', severity: 'high' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'nuclei -u example.com -t cves -silent -severity high'
        }));
    });

    it('should generate correct sqlmap_scan command', async () => {
        await executeToolCall('sqlmap_scan', { url: 'http://example.com?id=1', risk: 2, level: 3 }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'sqlmap -u "http://example.com?id=1" --batch --risk 2 --level 3 --random-agent'
        }));
    });

    it('should generate correct amass_enum command (passive)', async () => {
        await executeToolCall('amass_enum', { domain: 'example.com', intensity: 'passive' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'amass enum -passive -d example.com'
        }));
    });

    it('should generate correct amass_enum command (active)', async () => {
        await executeToolCall('amass_enum', { domain: 'example.com', intensity: 'active' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'amass enum -d example.com'
        }));
    });

    it('should generate correct gobuster_dir command', async () => {
        await executeToolCall('gobuster_dir', { url: 'http://example.com/', wordlist: 'medium' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'gobuster dir -u http://example.com/ -w /usr/share/wordlists/dirb/medium.txt -z -q'
        }));
    });

    it('should generate correct theharvester_search command', async () => {
        await executeToolCall('theharvester_search', { domain: 'example.com', source: 'google' }, 'session-123');
        expect(workerManager.runToolInSession).toHaveBeenCalledWith(expect.objectContaining({
            command: 'theHarvester -d example.com -b google'
        }));
    });
});
