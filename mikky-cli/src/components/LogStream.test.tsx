
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { LogStream } from './LogStream.js';

describe('LogStream', () => {
    it('should render logs', () => {
        const logs = ['Starting Nmap...', 'Port 80 open'];
        const { lastFrame } = render(<LogStream logs={logs} />);
        expect(lastFrame()).toContain('RUN LOGS (2)');
        expect(lastFrame()).toContain('Starting Nmap...');
        expect(lastFrame()).toContain('Port 80 open');
    });

    it('should render nothing when logs are empty', () => {
        const { lastFrame } = render(<LogStream logs={[]} />);
        expect(lastFrame()).toBe('');
    });
});
