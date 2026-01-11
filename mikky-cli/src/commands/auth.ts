/**
 * MIKKY CLI - Authentication Command
 * Manages API key storage and authentication flows
 */

import Conf from 'conf';
import { input, password, confirm } from '@inquirer/prompts';
import { colors, printSuccess, printError, printSystemMessage } from '../lib/ui.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG STORE
// ═══════════════════════════════════════════════════════════════════════════

interface MikkyConfig {
  apiKey?: string;
  backendUrl?: string;
  lastLogin?: string;
}

const config = new Conf<MikkyConfig>({
  projectName: 'mikky-cli',
  schema: {
    apiKey: {
      type: 'string',
    },
    backendUrl: {
      type: 'string',
      default: 'http://localhost:3001',
    },
    lastLogin: {
      type: 'string',
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the stored API key
 */
export function getApiKey(): string | null {
  return config.get('apiKey') || null;
}

/**
 * Set/update the API key
 */
export function setApiKey(key: string): void {
  config.set('apiKey', key);
  config.set('lastLogin', new Date().toISOString());
}

/**
 * Clear all stored credentials
 */
export function clearAuth(): void {
  config.delete('apiKey');
  config.delete('lastLogin');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getApiKey();
}

/**
 * Get the backend URL
 */
export function getBackendUrl(): string {
  return config.get('backendUrl') || 'http://localhost:3001';
}

/**
 * Set the backend URL
 */
export function setBackendUrl(url: string): void {
  config.set('backendUrl', url);
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE AUTH FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the interactive authentication flow
 */
export async function runAuth(): Promise<boolean> {
  console.log();
  console.log(colors.secondary('  ╔════════════════════════════════════════════════════════════╗'));
  console.log(colors.secondary('  ║') + colors.primary('               🔑 MIKKY Authentication                      ') + colors.secondary('║'));
  console.log(colors.secondary('  ╚════════════════════════════════════════════════════════════╝'));
  console.log();

  try {
    // Check for existing credentials
    const existingKey = getApiKey();
    if (existingKey) {
      const masked = existingKey.slice(0, 8) + '...' + existingKey.slice(-4);
      printSystemMessage(`Existing API key found: ${colors.dim(masked)}`);
      
      const replace = await confirm({
        message: 'Replace existing API key?',
        default: false,
      });

      if (!replace) {
        printSystemMessage('Keeping existing credentials.');
        return true;
      }
    }

    // Get new API key
    const apiKey = await password({
      message: 'Enter your MIKKY API key:',
      mask: '*',
      validate: (value) => {
        if (!value || value.length < 10) {
          return 'API key must be at least 10 characters';
        }
        return true;
      },
    });

    // Optional: Configure backend URL
    const configureBackend = await confirm({
      message: 'Configure custom backend URL?',
      default: false,
    });

    if (configureBackend) {
      const backendUrl = await input({
        message: 'Backend URL:',
        default: getBackendUrl(),
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      });
      setBackendUrl(backendUrl);
    }

    // Save credentials
    setApiKey(apiKey);
    
    console.log();
    printSuccess('Authentication configured successfully!');
    printSystemMessage(`API key stored securely in ${colors.dim(config.path)}`);
    console.log();

    return true;
  } catch (error) {
    if ((error as Error).name === 'ExitPromptError') {
      // User cancelled with Ctrl+C
      console.log();
      printSystemMessage('Authentication cancelled.');
      return false;
    }
    printError(`Authentication failed: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Run logout flow
 */
export async function runLogout(): Promise<void> {
  const key = getApiKey();
  if (!key) {
    printSystemMessage('No credentials stored.');
    return;
  }

  const shouldLogout = await confirm({
    message: 'Are you sure you want to clear stored credentials?',
    default: false,
  });

  if (shouldLogout) {
    clearAuth();
    printSuccess('Credentials cleared successfully.');
  } else {
    printSystemMessage('Logout cancelled.');
  }
}

/**
 * Check auth status and optionally prompt for login
 */
export async function ensureAuth(promptIfMissing = true): Promise<boolean> {
  if (isAuthenticated()) {
    return true;
  }

  if (promptIfMissing) {
    printSystemMessage('No API key configured. Please authenticate first.');
    return await runAuth();
  }

  return false;
}
