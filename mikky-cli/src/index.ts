#!/usr/bin/env node

/**
 * MIKKY CLI - Entry Point
 * 
 * The "Gemini CLI for Hackers" experience.
 * 
 * Usage:
 *   mikky           → Launch interactive REPL
 *   mikky auth      → Configure API key
 *   mikky hack <t>  → One-shot scan
 *   mikky --help    → Show help (only when explicitly requested)
 */

import { Command } from 'commander';
import { startRepl } from './commands/repl.js';
import { runAuth, runLogout, isAuthenticated } from './commands/auth.js';
import { getAgentClient } from './lib/agent-client.js';
import {
    renderBanner,
    printAgentMessage,
    printError,
    printSuccess,
    printGoodbye,
    spinners,
    colors,
} from './lib/ui.js';

// ═══════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════
// CLI SETUP
// ═══════════════════════════════════════════════════════════════════════════

const program = new Command();

program
    .name('mikky')
    .description('MIKKY CLI - The Autonomous Security Agent')
    .version(VERSION, '-v, --version', 'Display version number');

// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

// Auth command
program
    .command('auth')
    .alias('login')
    .description('Configure your API key')
    .action(async () => {
        renderBanner();
        await runAuth();
    });

// Logout command
program
    .command('logout')
    .description('Clear stored credentials')
    .action(async () => {
        await runLogout();
    });

// Status command
program
    .command('status')
    .description('Check MIKKY system status')
    .action(async () => {
        const spinner = spinners.connecting();
        spinner.start();
        await new Promise(resolve => setTimeout(resolve, 800));
        spinner.succeed(colors.success('MIKKY Agent is online'));
        console.log();
        console.log(colors.dim('  Auth: ') + (isAuthenticated() ? colors.success('Configured') : colors.warning('Not configured')));
        console.log(colors.dim('  Mode: ') + colors.accent('Mock (demo mode)'));
        console.log();
    });

// Hack/scan command (one-shot)
program
    .command('hack <target>')
    .alias('scan')
    .description('Run a security scan on a target')
    .action(async (target: string) => {
        renderBanner();
        console.log(colors.dim(`  Target: ${colors.highlight(target)}\n`));

        const agentClient = getAgentClient();

        try {
            // chat() now handles all the polling and spinner updates
            const response = await agentClient.chat(`scan ${target}`);
            printAgentMessage(response.message);
        } catch (error) {
            printError((error as Error).message);
        }

        console.log();
        printGoodbye();
    });

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    // Check if any arguments provided (besides node and script path)
    const hasArgs = process.argv.length > 2;

    if (!hasArgs) {
        // No arguments → Launch interactive REPL
        await startRepl();
    } else {
        // Has arguments → Parse with Commander
        await program.parseAsync(process.argv);
    }
}

// Run
main().catch((error) => {
    printError(`Fatal error: ${error.message}`);
    process.exit(1);
});
