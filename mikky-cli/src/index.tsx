#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './ui.js';
import { getAgentClient } from './lib/agent-client.js';

const cli = meow(`
	Usage
	  $ mikky

	Options
	  --name  Your name

	Examples
	  $ mikky --name=Jane
	  Hello, Jane
`, {
	importMeta: import.meta,
	flags: {
		name: {
			type: 'string'
		}
	}
});

// Handle graceful termination on Ctrl+C
process.on('SIGINT', async () => {
    const client = getAgentClient();
    await client.terminateSession();
    process.exit(0);
});

render(<App />);