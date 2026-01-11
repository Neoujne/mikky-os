# Mikky OS 🛡️ - The Autonomous Pentesting Agent

Mikky OS is an advanced, autonomous security agent designed for ethical hacking and extensive reconnaissance. It combines a ReAct-based agentic workflow with a secure Docker execution environment ("Docker Armory") and a slick, Gemini-style CLI.

## Features

- **Agentic Workflow**: Recursive "Think → Act → Observe" loop that autonomously plans and executes security scans.
- **Docker Armory**: Safe, ephemeral containers for running dangerous tools (Nmap, Nuclei, etc.) with `NET_RAW` capabilities.
- **Gemini-Style CLI**: Interactive terminal interface with session persistence, history simulation, and slick UI animations.
- **Memory Persistence**: Continues conversations across sessions (no more Amnesia).
- **Interactive Prompts**: Smart Yes/No decision making for critical actions.

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Neoujne/mikky-os.git
    cd mikky-os
    ```

2.  **Configure Environment:**
    Copy the example credentials and fill in your keys.
    ```bash
    cp .env.example .env
    ```
    *Required keys: `MIKKY_SECRET_KEY`, `OPENROUTER_API_KEY`, `CONVEX_URL`, `CLERK_*`*

3.  **Install Dependencies:**
    ```bash
    npm install
    # Install CLI globally (optional)
    npm install -g ./mikky-cli
    ```

4.  **Build the Docker Armory:**
    Build the Kali Linux worker image.
    ```bash
    docker build -t mikky-worker ./mikky-os-worker
    ```

5.  **Launch System:**
    Start backend, frontend, and worker manager.
    ```bash
    npm run dev
    ```

## Usage

In a separate terminal, run the CLI to interact with the agent:
```bash
mikky
# or
npx tsx mikky-cli/src/index.ts
```

---
*Disclaimer: For educational and authorized testing purposes only.*
