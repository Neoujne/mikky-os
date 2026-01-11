/**
 * MIKKY CLI - Interactive REPL
 * The "Gemini CLI for Hackers" experience
 */

import { input, select } from '@inquirer/prompts';
import {
  renderBanner,
  printTips,
  getPromptPrefix,
  printAgentMessage,
  printSystemMessage,
  printError,
  printHelp,
  printGoodbye,
  printDivider,
  spinners,
  colors,
} from '../lib/ui.js';
import { getAgentClient, type AgentResponse } from '../lib/agent-client.js';
import { runAuth, runLogout, isAuthenticated } from './auth.js';

// ═══════════════════════════════════════════════════════════════════════════
// REPL STATE
// ═══════════════════════════════════════════════════════════════════════════

let isRunning = true;
const agentClient = getAgentClient();

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL COMMANDS (start with /)
// ═══════════════════════════════════════════════════════════════════════════

interface LocalCommand {
  aliases: string[];
  description: string;
  handler: () => Promise<void>;
}

const localCommands: LocalCommand[] = [
  {
    aliases: ['quit', 'exit', 'q'],
    description: 'Exit MIKKY CLI',
    handler: async () => {
      isRunning = false;
      printGoodbye();
    },
  },
  {
    aliases: ['clear', 'cls'],
    description: 'Clear screen and redraw banner',
    handler: async () => {
      renderBanner();
      printTips();
    },
  },
  {
    aliases: ['help', 'h', '?'],
    description: 'Show help menu',
    handler: async () => {
      printHelp();
    },
  },
  {
    aliases: ['login', 'auth'],
    description: 'Configure API key',
    handler: async () => {
      await runAuth();
    },
  },
  {
    aliases: ['logout'],
    description: 'Clear stored credentials',
    handler: async () => {
      await runLogout();
    },
  },
  {
    aliases: ['history'],
    description: 'Show conversation history',
    handler: async () => {
      const history = agentClient.getHistory();
      if (history.length === 0) {
        printSystemMessage('No conversation history yet.');
        return;
      }
      console.log();
      printDivider();
      console.log(colors.secondary('  Conversation History:'));
      printDivider();
      history.forEach((msg, index) => {
        const prefix = msg.role === 'user'
          ? colors.primary('  You: ')
          : colors.accent('  MIKKY: ');
        const content = msg.content.split('\n')[0].slice(0, 60);
        console.log(prefix + colors.dim(content + (msg.content.length > 60 ? '...' : '')));
      });
      printDivider();
      console.log();
    },
  },
  {
    aliases: ['reset'],
    description: 'Clear conversation history',
    handler: async () => {
      agentClient.clearHistory();
      printSystemMessage('Conversation history cleared.');
    },
  },
  {
    aliases: ['status'],
    description: 'Check system status',
    handler: async () => {
      const spinner = spinners.connecting();
      spinner.start();

      // Simulate status check
      await new Promise(resolve => setTimeout(resolve, 800));

      spinner.succeed(colors.success('Connected to MIKKY Agent'));
      printSystemMessage(`Auth: ${isAuthenticated() ? colors.success('Configured') : colors.warning('Not configured')}`);
      printSystemMessage(`Mode: ${colors.accent('Mock')} (demo mode)`);
    },
  },
];

/**
 * Handle a local command (starting with /)
 */
async function handleLocalCommand(cmd: string): Promise<boolean> {
  const commandName = cmd.slice(1).toLowerCase().trim();

  for (const command of localCommands) {
    if (command.aliases.includes(commandName)) {
      await command.handler();
      return true;
    }
  }

  printError(`Unknown command: /${commandName}`);
  printSystemMessage('Type /help for available commands.');
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT INTERACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if a message requires user confirmation (permission prompt)
 */
function requiresConfirmation(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  // Detect common permission/confirmation patterns
  return (
    (lowerMsg.includes('permission') && lowerMsg.includes('?')) ||
    lowerMsg.includes('proceed?') ||
    lowerMsg.includes('approve?') ||
    lowerMsg.includes('continue?') ||
    lowerMsg.includes('do you want') ||
    lowerMsg.includes('shall i') ||
    lowerMsg.includes('would you like')
  );
}

/**
 * Handle agent message and display response
 */
async function handleAgentMessage(userInput: string): Promise<void> {
  const spinner = spinners.thinking();
  spinner.start();

  try {
    const response: AgentResponse = await agentClient.chat(userInput);
    spinner.stop();

    // Handle action responses specially
    if (response.type === 'action' && response.action) {
      await handleActionResponse(response);
    } else {
      printAgentMessage(response.message);
    }

    // Check if the agent is asking for permission/confirmation
    if (requiresConfirmation(response.message)) {
      // Show interactive Yes/No buttons
      const decision = await select({
        message: colors.warning('⚠️  Action Required:'),
        choices: [
          { name: '✅ Yes, proceed', value: 'yes' },
          { name: '❌ No, cancel', value: 'no' },
        ],
      });

      // Send the decision back to the agent
      printSystemMessage(`You selected: ${decision}`);
      await handleAgentMessage(decision);
    }
  } catch (error) {
    spinner.fail(colors.error('Failed to get response'));
    printError(`Error: ${(error as Error).message}`);
  }
}

/**
 * Handle action-type responses (scans, etc.)
 * Note: The polling and status updates are now handled by chat() internally
 */
async function handleActionResponse(response: AgentResponse): Promise<void> {
  if (!response.action) return;

  const { type, target } = response.action;

  if (type === 'scan' && target) {
    // Just show the message - chat() already handled the polling/streaming
    printAgentMessage(response.message);
  } else {
    // Default: just print the message
    printAgentMessage(response.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REPL LOOP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start the interactive REPL
 */
export async function startRepl(): Promise<void> {
  // Clear screen and show banner
  renderBanner();
  printTips();

  // Main loop
  while (isRunning) {
    try {
      // Get user input
      const userInput = await input({
        message: getPromptPrefix(),
        theme: {
          prefix: '',
          style: {
            message: () => '',
          },
        },
      });

      // Skip empty input
      const trimmedInput = userInput.trim();
      if (!trimmedInput) {
        continue;
      }

      // Check for local commands
      if (trimmedInput.startsWith('/')) {
        await handleLocalCommand(trimmedInput);
        continue;
      }

      // Send to agent
      await handleAgentMessage(trimmedInput);

    } catch (error) {
      if ((error as Error).name === 'ExitPromptError') {
        // User pressed Ctrl+C
        console.log();
        printGoodbye();
        break;
      }
      printError(`Unexpected error: ${(error as Error).message}`);
    }
  }
}
