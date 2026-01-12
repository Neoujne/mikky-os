
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { MessageList, Message } from './MessageList.js';

describe('MessageList', () => {
    it('should render messages with correct roles', () => {
        const messages: Message[] = [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'hi' }
        ];

        const { lastFrame } = render(<MessageList messages={messages} />);

        expect(lastFrame()).toContain('USER:');
        expect(lastFrame()).toContain('hello');
        expect(lastFrame()).toContain('ASSISTANT:');
        expect(lastFrame()).toContain('hi');
    });

    it('should show empty state message when no messages', () => {
        const { lastFrame } = render(<MessageList messages={[]} />);
        expect(lastFrame()).toContain('No messages yet');
    });
});
