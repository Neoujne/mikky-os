/**
 * MIKKY CLI - UI Library
 * Cyberpunk-themed styling, banner, and spinners
 */

import chalk from 'chalk';
import figlet from 'figlet';
import ora, { type Ora } from 'ora';

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PALETTE - Cyberpunk Neon Theme
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    primary: chalk.cyan,
    secondary: chalk.magenta,
    accent: chalk.hex('#00FF41'), // Matrix green
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    danger: chalk.red.bold,  // Alias for critical errors
    info: chalk.blue,        // Info/analysis messages
    dim: chalk.gray,
    highlight: chalk.bold.cyan,
    prompt: chalk.bold.magenta,
};

// ═══════════════════════════════════════════════════════════════════════════
// ASCII BANNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render the MIKKY ASCII banner with cyberpunk styling
 */
export function renderBanner(): void {
    console.clear();

    const banner = figlet.textSync('MIKKY', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
    });

    // Apply gradient-like effect with cyan/magenta
    const lines = banner.split('\n');
    lines.forEach((line, index) => {
        if (index % 2 === 0) {
            console.log(colors.primary(line));
        } else {
            console.log(colors.secondary(line));
        }
    });

    // Subtitle
    console.log();
    console.log(
        colors.dim('  ╔════════════════════════════════════════════════════════════╗')
    );
    console.log(
        colors.dim('  ║') +
        colors.accent('  🛡️  MIKKY OS - The Autonomous Security Agent               ') +
        colors.dim('║')
    );
    console.log(
        colors.dim('  ╚════════════════════════════════════════════════════════════╝')
    );
    console.log();
}

/**
 * Print tips/help message on startup
 */
export function printTips(): void {
    console.log(colors.dim('  Tips: '));
    console.log(
        colors.dim('    • ') +
        colors.primary('Ask questions') +
        colors.dim(' or ') +
        colors.primary('run scans') +
        colors.dim(' naturally')
    );
    console.log(
        colors.dim('    • ') +
        colors.secondary('/help') +
        colors.dim(' for commands, ') +
        colors.secondary('/quit') +
        colors.dim(' to exit')
    );
    console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT STYLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the styled REPL prompt string
 */
export function getPromptPrefix(): string {
    return colors.prompt('mikky') + colors.dim(' > ');
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE PRINTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print a message from the AI agent
 */
/**
 * Print a message from the AI agent
 */
export function printAgentMessage(message: string): void {
    // Sanitize message: remove leaked JSON tool outputs
    // Regex matches text like ```tool_outputs ... ``` or similar massive JSON dumps
    const cleanMessage = message
        .replace(/'''tool_outputs[\s\S]*?'''/g, '') // Remove tool outcome blocks
        .replace(/```tool_outputs[\s\S]*?```/g, '') // Remove fenced blocks
        .replace(/{'nmap_scan_response':[\s\S]*?}}/g, '') // Remove specific raw JSON leaks
        .trim();

    if (!cleanMessage) return; // Don't print empty messages

    console.log();
    const lines = cleanMessage.split('\n');
    lines.forEach((line) => {
        console.log(colors.accent('  ▶ ') + line);
    });
    console.log();
}

/**
 * Print a system message (tips, status updates)
 */
export function printSystemMessage(message: string): void {
    console.log(colors.dim('  ℹ ') + colors.dim(message));
}

/**
 * Print a success message
 */
export function printSuccess(message: string): void {
    console.log(colors.success('  ✔ ') + colors.success(message));
}

/**
 * Print a warning message
 */
export function printWarning(message: string): void {
    console.log(colors.warning('  ⚠ ') + colors.warning(message));
}

/**
 * Print an error message
 */
export function printError(message: string): void {
    console.log(colors.error('  ✖ ') + colors.error(message));
}

/**
 * Print a generic message with a specific color type
 */
export function printMessage(message: string, colorType: keyof typeof colors = 'dim'): void {
    console.log(colors[colorType](message));
}

/**
 * Print a highlighted/important message
 */
export function printHighlight(message: string): void {
    console.log(colors.highlight('  ★ ') + colors.highlight(message));
}

// ═══════════════════════════════════════════════════════════════════════════
// SPINNERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a cyberpunk-styled spinner
 */
export function createSpinner(text: string): Ora {
    return ora({
        text: colors.primary(text),
        spinner: 'dots12',
        color: 'cyan',
        prefixText: '  ',
    });
}

/**
 * Spinner presets for common operations
 */
export const spinners = {
    thinking: () => createSpinner('Processing your request...'),
    scanning: (target: string) => createSpinner(`Scanning ${colors.highlight(target)}...`),
    connecting: () => createSpinner('Connecting to MIKKY Agent...'),
    analyzing: () => createSpinner('Analyzing results...'),
};

// ═══════════════════════════════════════════════════════════════════════════
// DIVIDERS & DECORATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print a horizontal divider
 */
export function printDivider(): void {
    console.log(colors.dim('  ' + '─'.repeat(60)));
}

/**
 * Print a styled section header
 */
export function printSectionHeader(title: string): void {
    console.log();
    console.log(colors.dim('  ┌─') + colors.secondary(` ${title} `) + colors.dim('─'.repeat(50 - title.length)));
}

/**
 * Print the help menu
 */
export function printHelp(): void {
    console.log();
    printSectionHeader('COMMANDS');
    console.log();
    console.log(colors.dim('  │'));
    console.log(colors.dim('  │  ') + colors.secondary('/help') + colors.dim('     - Show this help menu'));
    console.log(colors.dim('  │  ') + colors.secondary('/clear') + colors.dim('    - Clear screen and redraw banner'));
    console.log(colors.dim('  │  ') + colors.secondary('/login') + colors.dim('    - Configure API key'));
    console.log(colors.dim('  │  ') + colors.secondary('/logout') + colors.dim('   - Clear stored credentials'));
    console.log(colors.dim('  │  ') + colors.secondary('/history') + colors.dim('  - Show conversation history'));
    console.log(colors.dim('  │  ') + colors.secondary('/quit') + colors.dim('     - Exit MIKKY CLI'));
    console.log(colors.dim('  │'));
    console.log(colors.dim('  └─') + colors.dim('─'.repeat(58)));
    console.log();
    console.log(colors.dim('  For natural commands, just type:'));
    console.log(colors.accent('    "scan example.com"'));
    console.log(colors.accent('    "find vulnerabilities in target.com"'));
    console.log(colors.accent('    "what ports are open on 192.168.1.1?"'));
    console.log();
}

/**
 * Print goodbye message
 */
export function printGoodbye(): void {
    console.log();
    console.log(
        colors.secondary('  ╔════════════════════════════════════════════════════════════╗')
    );
    console.log(
        colors.secondary('  ║') +
        colors.accent('        Session terminated. Stay vigilant, hacker.          ') +
        colors.secondary('║')
    );
    console.log(
        colors.secondary('  ╚════════════════════════════════════════════════════════════╝')
    );
    console.log();
}
