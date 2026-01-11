import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn()
}));

vi.mock('openai', () => {
    return {
        default: class MockOpenAI {
            chat = {
                completions: {
                    create: mockCreate
                }
            }
        }
    };
});

describe('summarizeContext', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call OpenAI with summarization prompt', async () => {
        vi.resetModules();
        process.env.OPENROUTER_API_KEY = 'test-key';
        
        // Dynamic import to ensure fresh evaluation with new env var
        const { summarizeContext } = await import('./llm');
        
        const messages = [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' },
            { role: 'user', content: 'How are you?' }
        ];

        mockCreate.mockResolvedValue({
            choices: [{
                message: { content: 'Summary of chat' },
                finish_reason: 'stop'
            }],
            model: 'test-model',
            usage: { total_tokens: 10 }
        });

        const summary = await summarizeContext(messages as any);

        expect(summary).toBe('Summary of chat');
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            messages: expect.arrayContaining([
                expect.objectContaining({
                    role: 'system',
                    content: expect.stringContaining('Summarize')
                })
            ])
        }));
    });
});