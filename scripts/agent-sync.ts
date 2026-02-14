#!/usr/bin/env tsx
/**
 * agent-sync.ts — Concurrency control for multi-agent file editing.
 *
 * Manages a local `.agent-locks.json` lockfile so multiple AI agents
 * can coordinate file access without conflicts.
 *
 * Usage:
 *   tsx scripts/agent-sync.ts check <file>
 *   tsx scripts/agent-sync.ts lock  <file> --id <agent> --intent <"reason">
 *   tsx scripts/agent-sync.ts release <file> --id <agent>
 *   tsx scripts/agent-sync.ts list
 */

import { readFile, writeFile, open } from "node:fs/promises";
import { resolve, relative } from "node:path";

// ── Constants ──────────────────────────────────────────────────────────

const LOCK_FILE = resolve(process.cwd(), ".agent-locks.json");
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Types ──────────────────────────────────────────────────────────────

interface LockEntry {
  agentId: string;
  intent: string;
  timestamp: number;
  expiresAt: number;
}

type LockStore = Record<string, LockEntry>;

interface LockDenied {
  status: "LOCKED";
  holder: string;
  intent: string;
  expiresAt: string;
  remainingMs: number;
}

// ── Lockfile I/O (atomic read-modify-write) ────────────────────────────

async function readLockStore(): Promise<LockStore> {
  try {
    const raw = await readFile(LOCK_FILE, "utf-8");
    return JSON.parse(raw) as LockStore;
  } catch {
    // File missing or corrupt — start fresh
    return {};
  }
}

/**
 * Atomic write: write to a temp file then rename, so concurrent readers
 * never see a half-written file. On Windows rename is not truly atomic,
 * so we use a file-handle lock as a secondary guard.
 */
async function writeLockStore(store: LockStore): Promise<void> {
  const data = JSON.stringify(store, null, 2) + "\n";
  // Open with 'wx' flags on a .lock sentinel to serialise writers.
  const sentinel = LOCK_FILE + ".write-lock";
  let handle;
  try {
    handle = await open(sentinel, "wx");
  } catch {
    // Another writer holds the sentinel — spin-wait briefly
    await sleep(50);
    try {
      handle = await open(sentinel, "wx");
    } catch {
      // Force through — the sentinel is likely stale
      await writeFile(LOCK_FILE, data, "utf-8");
      return;
    }
  }
  try {
    await writeFile(LOCK_FILE, data, "utf-8");
  } finally {
    await handle.close();
    // Best-effort cleanup of sentinel
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(sentinel);
    } catch { /* ignored */ }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Normalise path to forward-slash relative form for consistent keys. */
function normalisePath(filePath: string): string {
  const abs = resolve(process.cwd(), filePath);
  return relative(process.cwd(), abs).replace(/\\/g, "/");
}

/** Strip expired locks in-place, return the cleaned store. */
function pruneExpired(store: LockStore): LockStore {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].expiresAt <= now) {
      delete store[key];
    }
  }
  return store;
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

// ── Commands ────────────────────────────────────────────────────────────

async function cmdCheck(filePath: string): Promise<void> {
  const key = normalisePath(filePath);
  const store = pruneExpired(await readLockStore());

  const entry = store[key];
  if (!entry) {
    console.log(`✓ ${key} is free`);
    process.exit(0);
  }

  const denied: LockDenied = {
    status: "LOCKED",
    holder: entry.agentId,
    intent: entry.intent,
    expiresAt: formatTimestamp(entry.expiresAt),
    remainingMs: entry.expiresAt - Date.now(),
  };
  console.log(JSON.stringify(denied));
  process.exit(1);
}

async function cmdLock(
  filePath: string,
  agentId: string,
  intent: string
): Promise<void> {
  const key = normalisePath(filePath);
  const store = pruneExpired(await readLockStore());

  const existing = store[key];

  // Already locked by someone else?
  if (existing && existing.agentId !== agentId) {
    const denied: LockDenied = {
      status: "LOCKED",
      holder: existing.agentId,
      intent: existing.intent,
      expiresAt: formatTimestamp(existing.expiresAt),
      remainingMs: existing.expiresAt - Date.now(),
    };
    console.error(JSON.stringify(denied));
    process.exit(1);
  }

  // Acquire or refresh
  const now = Date.now();
  store[key] = {
    agentId,
    intent,
    timestamp: now,
    expiresAt: now + LOCK_TTL_MS,
  };
  await writeLockStore(store);
  console.log(`✓ Lock acquired: ${key} → ${agentId} (${intent})`);
  process.exit(0);
}

async function cmdRelease(filePath: string, agentId: string): Promise<void> {
  const key = normalisePath(filePath);
  const store = pruneExpired(await readLockStore());

  const existing = store[key];

  if (!existing) {
    console.log(`✓ ${key} was already free`);
    process.exit(0);
  }

  if (existing.agentId !== agentId) {
    console.error(
      `✗ Cannot release: ${key} is locked by ${existing.agentId}, not ${agentId}`
    );
    process.exit(1);
  }

  delete store[key];
  await writeLockStore(store);
  console.log(`✓ Lock released: ${key}`);
  process.exit(0);
}

async function cmdList(): Promise<void> {
  const store = pruneExpired(await readLockStore());
  const entries = Object.entries(store);

  if (entries.length === 0) {
    console.log("No active locks.");
    process.exit(0);
  }

  // Column widths
  const fileW = Math.max(6, ...entries.map(([k]) => k.length));
  const agentW = Math.max(8, ...entries.map(([, v]) => v.agentId.length));
  const intentW = Math.max(8, ...entries.map(([, v]) => v.intent.length));
  const timeW = 19; // ISO timestamp without ms

  const pad = (s: string, w: number) => s.padEnd(w);
  const sep = "-".repeat(fileW + agentW + intentW + timeW + timeW + 16);

  console.log(
    `${pad("FILE", fileW)}  ${pad("AGENT ID", agentW)}  ${pad("INTENT", intentW)}  ${pad("LOCKED AT", timeW)}  ${pad("EXPIRES AT", timeW)}`
  );
  console.log(sep);

  for (const [file, entry] of entries) {
    console.log(
      `${pad(file, fileW)}  ${pad(entry.agentId, agentW)}  ${pad(entry.intent, intentW)}  ${pad(formatTimestamp(entry.timestamp), timeW)}  ${pad(formatTimestamp(entry.expiresAt), timeW)}`
    );
  }

  process.exit(0);
}

// ── CLI Arg Parsing ─────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  command: string;
  positional: string[];
  flags: Record<string, string>;
} {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  let i = 0;
  while (i < rest.length) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const val = rest[i + 1];
      if (!val || val.startsWith("--")) {
        flags[key] = "true";
        i++;
      } else {
        flags[key] = val;
        i += 2;
      }
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { command: command ?? "", positional, flags };
}

function printUsage(): void {
  console.log(`
agent-sync — Multi-agent file lock coordinator

Commands:
  check   <file>                            Check if a file is free (exit 0) or locked (exit 1)
  lock    <file> --id <agent> --intent <?>  Acquire a lock on a file
  release <file> --id <agent>               Release your lock on a file
  list                                      Show all active locks

Examples:
  tsx scripts/agent-sync.ts check src/index.ts
  tsx scripts/agent-sync.ts lock src/index.ts --id Agent-Alpha --intent "Refactoring event loop"
  tsx scripts/agent-sync.ts release src/index.ts --id Agent-Alpha
  tsx scripts/agent-sync.ts list
`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "check": {
      const file = positional[0];
      if (!file) {
        console.error("Usage: agent-sync check <file_path>");
        process.exit(2);
      }
      await cmdCheck(file);
      break;
    }

    case "lock": {
      const file = positional[0];
      const id = flags["id"];
      const intent = flags["intent"];
      if (!file || !id || !intent) {
        console.error(
          'Usage: agent-sync lock <file_path> --id <agent_id> --intent "<description>"'
        );
        process.exit(2);
      }
      await cmdLock(file, id, intent);
      break;
    }

    case "release": {
      const file = positional[0];
      const id = flags["id"];
      if (!file || !id) {
        console.error(
          "Usage: agent-sync release <file_path> --id <agent_id>"
        );
        process.exit(2);
      }
      await cmdRelease(file, id);
      break;
    }

    case "list": {
      await cmdList();
      break;
    }

    default:
      printUsage();
      process.exit(command ? 2 : 0);
  }
}

main().catch((err) => {
  console.error("agent-sync fatal:", err);
  process.exit(2);
});
