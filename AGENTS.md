# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# 🛑 CRITICAL AGENT PROTOCOL (READ FIRST)

**CONTEXT:** You are one of multiple AI agents working on "Mikky OS" simultaneously.
**RULE:** You share the file system. You MUST prevent race conditions.

**BEFORE EDITING ANY FILE:**
1.  **LOCK IT:** Run `npm run agent:lock -- <file_path> --id "Agent-Name" --intent "Reason"`
2.  **VERIFY:**
    * If output is `✓ Lock acquired`: Proceed.
    * If output is `JSON Error` (LOCKED): **STOP**. Do not edit. Read the JSON to see who holds it.
3.  **EDIT:** Perform your task.
4.  **RELEASE:** Immediately run `npm run agent:release -- <file_path> --id "Agent-Name"`

**PENALTY:** If you edit a file without locking it first, you will corrupt the work of other agents. **ALWAYS LOCK FIRST.**

## Project Overview

Mikky OS is an autonomous penetration testing platform with a multi-service architecture: a Node.js/Express backend that orchestrates security scans via Inngest workflows running inside ephemeral Docker containers (Kali Linux), a React frontend for dashboards and reporting, a Convex real-time database, and an Ink-based CLI for interactive agent sessions.

## Build & Dev Commands

### Full Stack (from repo root)
```
npm run dev:all          # Starts Convex dev, frontend (Vite), backend (tsx watch), and Inngest dev server concurrently
```

### Backend (`mikky-os-backend/`)
```
npm run dev              # tsx watch src/index.ts (hot-reload, port 5000)
npm run build            # tsc (compiles to dist/)
npx vitest run           # Run tests (vitest is installed but no test script configured)
```

### Frontend (`mikky-os-frontend/`)
```
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run lint             # ESLint
npx convex dev           # Convex dev mode (watches convex/ for schema/function changes)
```

### Docker Worker
```
docker build -t mikky-worker ./mikky-os-worker    # Build the Kali Linux scanning image
```
The image must be named `mikky-worker:latest` — the backend's `WorkerManager` hardcodes this name.

### Environment Setup
Copy `.env.example` to `.env` at root. Required keys: `MIKKY_SECRET_KEY`, `OPENROUTER_API_KEY`, `CONVEX_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. The frontend also needs `.env.local` inside `mikky-os-frontend/` with Clerk and Convex credentials.

## Architecture

### Service Communication Flow
```
CLI (Ink/React) → HTTP → Backend (Express :5000) → Inngest Event Bus → Agent Functions → Docker (Kali containers) → Tool output
                                                       ↕                        ↕
                                                  Convex (real-time DB)    Convex (logs, intel, vulns)
Frontend (React :5173) ← Convex subscriptions ← Convex
```

### Backend (`mikky-os-backend/src/`)
- **`index.ts`** — Express server with all REST routes. Routes are organized in numbered sections (scan, agent, terminal, session, vuln explain, PDF report).
- **`inngest/functions.ts`** — **Pure registry file** that exports all Inngest functions. **NEVER add logic here** — only import and register new agent functions.
- **`inngest/client.ts`** — Inngest client singleton.
- **`inngest/agent.ts`** — ReAct loop for the CLI agent. Handles Think → Act → Observe cycles with tool calling via OpenRouter LLM. Session history is kept in-memory (Map) and persisted to Convex `agent_runs` table.
- **`inngest/agents/`** — The scan pipeline agents, chained via Inngest events:
  - `agent1-info-gathering.ts` — Passive recon (dig, whois, subfinder, curl). Triggered by `scan.initiated`. Emits `agent/info_gathering.completed`.
  - `agent2-port-enum.ts` — Port scanning & enumeration (nmap, whatweb, etc.). Triggered by `agent/info_gathering.completed`. Emits `agent/port_enum.completed`.
  - `agent3-vuln-scan.ts` — Active vulnerability scanning (nuclei). Triggered by `agent/port_enum.completed`. Emits `agent/vuln_scan.completed`.
  - `reporting.ts` — AI-generated summary & scoring. Final stage.
  - `shared.ts` — Common helpers: `runDockerCommand()`, `updateScanStatus()`, `logToConvex()`, output parsers (`parseDig`, `parseWhois`, `parseSubdomains`, `parseHttpHeaders`).
- **`lib/docker.ts`** — `WorkerManager` singleton. Manages Docker container lifecycle (session-based keep-alive containers for scan pipelines, ephemeral containers as fallback). Handles stream demuxing, timeouts per tool, and cancellation checks against Convex.
- **`lib/llm.ts`** — OpenRouter wrapper using OpenAI SDK. Provides `chat()`, `chatWithTools()` (with retry/fallback), and `summarizeContext()` for infinite memory compression.
- **`lib/tools.ts`** — Agent tool definitions (OpenAI function calling format) and `executeToolCall()` which maps tool names to Docker commands. The `generate_final_report` tool is special — it's pure AI synthesis, no Docker.
- **`lib/convex.ts`** — Convex HTTP client singleton.
- **`lib/validators.ts`** — Domain input sanitization.
- **`lib/parsers.ts`** — Output summarization utilities.

### Frontend (`mikky-os-frontend/`)
- **React + Vite + TypeScript + Tailwind CSS v4**
- **Auth:** Clerk (`@clerk/clerk-react`)
- **Database:** Convex with real-time subscriptions — schema is in `convex/schema.ts`
- **Routing:** React Router v7 with `SignedIn`/`SignedOut` wrappers
- **UI components:** Radix UI primitives in `components/ui/`, feature components in `components/{command-center,intel,vulns,reports,terminal,shell}/`
- **Pages:** Dashboard, Targets, Operations, Intel, Vulns, Settings, plus public pages (Landing, Features, Docs, Blog, Pricing)
- **Convex functions** (`convex/` dir): `scans.ts`, `targets.ts`, `vulnerabilities.ts`, `intel.ts`, `scanLogs.ts`, `terminal.ts`, `agent.ts`, `status.ts`, `crons.ts`

### Docker Worker (`mikky-os-worker/`)
- Kali Linux rolling image with security tools: nmap, nuclei, subfinder, nikto, whatweb, gobuster, sqlmap, metasploit, hydra, amass, theHarvester, etc.
- Containers run as root with `NET_ADMIN`/`NET_RAW` capabilities and privileged mode for raw socket access

### Convex Schema (key tables)
- `targets` — Tracked domains with safety scores
- `scanRuns` — Scan execution state, progress (0-100), stage status map, inter-agent result passing via `agentResults` field
- `vulnerabilities` — Individual vulnerability records with severity, CVE, evidence, AI analysis
- `intel_data` — Structured recon data (DNS, whois, subdomains, HTTP probe, technologies, network/traceroute, ports)
- `scanLogs` — Timestamped log entries per scan run
- `terminal_sessions` / `terminal_logs` — Interactive terminal state

## Critical Rules

- **NEVER modify `inngest/functions.ts`** beyond imports and the registry array — it is a pure registry file, all logic lives in individual agent modules.
- **ALWAYS use `process.env.MIKKY_BACKEND_URL`** (not hardcoded localhost) when referencing the backend URL from the frontend.
- The scan pipeline is event-driven: agents chain by emitting Inngest events (`scan.initiated` → `agent/info_gathering.completed` → `agent/port_enum.completed` → `agent/vuln_scan.completed`). Adding a new pipeline stage requires creating a new agent file, registering it in `functions.ts`, and wiring the event chain.
- The Docker worker image name is hardcoded as `mikky-worker:latest` in `lib/docker.ts`. If you rename the image, update the `WORKER_IMAGE` constant.
- Backend binds to `127.0.0.1:5000` (IPv4 only). The frontend Vite server runs on port 5173.
- The LLM integration uses OpenRouter (not OpenAI directly) — the OpenAI SDK is configured with `baseURL: 'https://openrouter.ai/api/v1'`. The default model is set via `OPENROUTER_MODEL` env var.
- Tool timeouts are defined per-tool in `lib/docker.ts` (`TOOL_TIMEOUTS` map). Quick tools get 30s, scan tools up to 10 minutes.
- The `WorkerManager` is a singleton — use `workerManager` export, not `new WorkerManager()`.
