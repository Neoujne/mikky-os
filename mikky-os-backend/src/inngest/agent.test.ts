
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock dependencies using vi.hoisted
const { mockSummarizeContext, mockChatWithTools, mockConvexQuery, mockConvexMutation } = vi.hoisted(() => ({
    mockSummarizeContext: vi.fn(),
    mockChatWithTools: vi.fn(),
    mockConvexQuery: vi.fn(),
    mockConvexMutation: vi.fn()
}));

vi.mock('../lib/llm.js', () => ({
    summarizeContext: mockSummarizeContext,
    chatWithTools: mockChatWithTools,
    MIKKY_SYSTEM_PROMPT: 'SYSTEM PROMPT',
}));

vi.mock('../lib/convex.js', () => ({
    convex: {
        query: mockConvexQuery,
        mutation: mockConvexMutation,
    }
}));

vi.mock('../lib/docker.js', () => ({
    workerManager: {
        startSession: vi.fn(),
    }
}));

// Mock Inngest client to avoid real instantiation
vi.mock('./client.js', () => ({
    inngest: {
        createFunction: (config: any, trigger: any, handler: any) => handler // Return handler directly
    }
}));

import { agentFunction } from './agent';

describe('agentFunction', () => {
    let mockStep: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockStep = {
            run: vi.fn(async (name, callback) => callback()) // execute callback immediately
        };
        mockChatWithTools.mockResolvedValue({
            content: 'Hello',
            toolCalls: [],
            finishReason: 'stop'
        });
    });

    it('should call summarizeContext when history > 3 messages', async () => {
        // Mock convex history return with 4 messages
        const mockHistory = [
            { role: 'user', content: '1' },
            { role: 'assistant', content: '2' },
            { role: 'user', content: '3' },
            { role: 'assistant', content: '4' },
        ];
        mockConvexQuery.mockResolvedValue(mockHistory);
        mockSummarizeContext.mockResolvedValue('Summary of conversation');

        // Execute the agent handler
        const event = {
            data: {
                message: 'New message',
                sessionId: 'session-123',
                userId: 'user-1'
            }
        };

        // Call the handler (which we mocked createFunction to return)
        await (agentFunction as any)({ event, step: mockStep });

        // Verify summarizeContext was called
        expect(mockSummarizeContext).toHaveBeenCalled();
    });

    it('should NOT call summarizeContext when history is short', async () => {
        // Mock convex history return with 1 message
        const mockHistory = [
            { role: 'user', content: '1' }
        ];
        mockConvexQuery.mockResolvedValue(mockHistory);

        // Execute the agent handler
        const event = {
            data: {
                message: 'New message',
                sessionId: 'session-123',
                userId: 'user-1'
            }
        };

        await (agentFunction as any)({ event, step: mockStep });

        expect(mockSummarizeContext).not.toHaveBeenCalled();
    });
});
