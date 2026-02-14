# Mikky OS Backend 🧠

Powered by **Node.js, Express, and Inngest**. This is the brain of the operation.

## 🤖 The Agents

### Agent 1: Reconnaissance (Network Map)
- **Goal:** Map the external attack surface.
- **Tools:** Subfinder, Nmap, Masscan.
- **Trigger:** Identifying a new target.
- **Output:** Open ports, services, and subdomain enumeration.

### Agent 4: Source Code Audit (SAST)
- **Goal:** Identify vulnerabilities in source code.
- **Input:** GitHub Repository URL.
- **Workflow:**
    1.  **Fetch Tree:** Uses GitHub API to get file structure.
    2.  **Filter:** Determines high-risk files (Auth, Config, API).
    3.  **Read:** Securely fetches file contents via `raw.githubusercontent.com`.
    4.  **Audit:** Sends code to LLM (DeepSeek/Claude) via OpenRouter.
    5.  **Report:** Generates findings with severity and remediation.

## 🔑 Configuration

To enable AI features, you must set `OPENROUTER_API_KEY` in your `.env`.

Supported Models (via OpenRouter):
- `deepseek/deepseek-r1` (Recommended)
- `google/gemini-pro-1.5`
- `anthropic/claude-3-opus`

## 📡 API Endpoints

- `POST /api/audit/start`: Initiate a code audit.
- `POST /api/audit/chat`: Chat with the AI Security Consultant about findings.
