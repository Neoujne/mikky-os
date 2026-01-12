import { describe, it, expect, vi } from 'vitest';

// Mock convex module before importing docker
vi.mock('./convex', () => ({
    convex: {
        mutation: vi.fn().mockResolvedValue(null),
        query: vi.fn().mockResolvedValue(null)
    }
}));

import { workerManager } from './docker';

// Increase timeout for Docker operations
const DOCKER_TIMEOUT = 60000;

describe('WorkerManager Privileges', () => {
    const scanId = 'test-privileges-' + Date.now();

    it('should have root privileges (uid=0)', async () => {
        const result = await workerManager.runTool({
            command: 'id -u',
            scanRunId: scanId,
            stage: 'test',
            tool: 'id',
            timeout: DOCKER_TIMEOUT
        });

        if (!result.success) {
            console.error('Command failed:', result.stderr);
        }

        expect(result.success).toBe(true);
        expect(result.stdout.trim()).toBe('0');
    }, DOCKER_TIMEOUT);

    it('should have NET_ADMIN/NET_RAW capability (Nmap SYN Scan)', async () => {
        // Nmap SYN scan (-sS) requires raw sockets
        const result = await workerManager.runTool({
            command: 'nmap -sS -p 80 -n --max-retries 0 127.0.0.1', 
            scanRunId: scanId,
            stage: 'test',
            tool: 'nmap',
            timeout: DOCKER_TIMEOUT
        });

        if (!result.success) {
            console.error('Nmap failed:', result.stderr);
        }

        // Check for success markers
        expect(result.stdout).toContain('Nmap scan report');
        
        // Check for failure markers
        const errorMarkers = [
            'Operation not permitted',
            'requires root privileges',
            'dnet: Failed to open device',
            'Permission denied'
        ];
        
        errorMarkers.forEach(marker => {
            expect(result.stderr).not.toContain(marker);
            expect(result.stdout).not.toContain(marker);
        });
    }, DOCKER_TIMEOUT);
});
