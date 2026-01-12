import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./llm.js', () => ({
    chat: vi.fn().mockResolvedValue({
        content: '# Mock Report',
        finishReason: 'stop',
        model: 'mock-model'
    })
}));

vi.mock('./convex.js', () => ({
    convex: {
        query: vi.fn(),
        mutation: vi.fn().mockResolvedValue(null)
    }
}));

vi.mock('./docker.js', () => ({
    workerManager: {
        runToolInSession: vi.fn()
    },
    TOOL_TIMEOUTS: {}
}));

import { executeToolCall } from './tools';
import { convex } from './convex.js';

describe('Tool Logic Gate: generate_final_report', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should FAIL when logs are empty (The Blindness Protocol)', async () => {
        // Mock empty logs
        vi.mocked(convex.query).mockResolvedValueOnce({
            rawLogs: []
        });

        const result = await executeToolCall('generate_final_report', {}, 'cli-session-empty');

        expect(result.success).toBe(false);
        expect(result.output).toContain('ERROR: No evidence found');
        expect(result.output).toContain('Report generation aborted');
    });

    it('should FAIL when logs are insufficient (length < 10)', async () => {
        // Mock insufficient logs
        vi.mocked(convex.query).mockResolvedValueOnce({
            rawLogs: ['hi']
        });

        const result = await executeToolCall('generate_final_report', {}, 'cli-session-short');

        expect(result.success).toBe(false);
        expect(result.output).toContain('ERROR: No evidence found');
    });

    it('should SUCCEED when logs exist', async () => {
        // Mock valid logs
        vi.mocked(convex.query).mockResolvedValueOnce({
            rawLogs: ['[INFO] Nmap scan found port 80 open', '[INFO] Nikto found XSS']
        });

        const result = await executeToolCall('generate_final_report', {}, 'cli-session-valid');

        expect(result.success).toBe(true);
        expect(result.output).toContain('Final report generated');
    });
});
