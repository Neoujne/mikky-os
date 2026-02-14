# MIKKY OS 🛡️
### AI-Powered Offensive Security Operations Center

> **"The Matrix has you... unless you hack it first."** 🕶️

![Mikky OS Banner](https://img.shields.io/badge/Status-OPERATIONAL-cyan?style=for-the-badge&logo=security-network) ![Vibe](https://img.shields.io/badge/Vibe-CYBERPUNK-purple?style=for-the-badge&logo=ghost) ![AI](https://img.shields.io/badge/AI-DEEPSEEK_R1-red?style=for-the-badge&logo=openai)

---

## ⚡ TL;DR (Quickstart)

For the elite operators who just want to run it:

```bash
# 1. Clone & Install
git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
npm install

# 2. Configure Environment (.env)
# Required Keys: OPENROUTER_API_KEY, CONVEX_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
cp .env.example .env

# 3. Launch System
npm run dev:all
```

---

## 🌆 The Vibe

Mikky OS isn't just a tool; it's an experience. Toggle between **Cyberpunk Mode** (Neon Cyan/Purple, Matrix rain aesthetics) and **Stealth Mode** (Green/Black terminal vibes) instantly. 

Designed for the Vibeathon, it merges high-end UI engineering with ruthless backend efficiency.

---

## 🚀 Features (The "Meat")

### 🕸️ Network Recon & Surveillance
Active monitoring engine that orchestrates **Nmap**, **Masscan**, and **Subfinder** to map attack surfaces in real-time. Results are streamed live to your dashboard via WebSockets.

### 🧪 Vulnerability Lab
Integrated **Nuclei** engine capabilities. Detects CVEs, misconfigurations, and exposed panels. The system automatically categorizes findings by severity (CRITICAL to INFO).

### 🤖 Source Code Audit [NEW]
**AI-Driven SAST Engine**. Give it a GitHub URL, and Mikky OS will:
1. Fetch the repository structure via GitHub API.
2. Identify high-risk files (Auth, API, Crypto).
3. "Read" the code using Large Language Models (LLMs).
4. Produce a detailed vulnerability report with fixed code snippets.

### 💬 AI Security Consultant [NEW]
**Interactive Remediation Chat**. Found a vulnerability? Don't just stare at it. chat with the **AI Security Consultant** directly in the audit dashboard.
- *"How do I fix this SQL Injection?"*
- *"Explain why this regex is dangerous."*
The AI analyzes the specific finding and provides tailored, copy-pasteable fixes.

---

## 🏗️ Architecture

Event-Driven Architecture powered by **Inngest** for reliable orchestration.

```mermaid
graph TD
    User[User UI] -->|Action| Convex[Convex DB]
    Convex -->|Stream| User
    Convex -->|Event| Inngest[Inngest Orchestrator]
    
    Inngest -->|Trigger| Agent1[Agent 1: Recon]
    Inngest -->|Trigger| Agent4[Agent 4: Code Audit]
    
    subgraph Docker Armory
    Agent1 -->|Run| Nmap[Nmap Container]
    Agent1 -->|Run| Nuclei[Nuclei Container]
    end
    
    subgraph AI Cloud
    Agent4 -->|Analysis| LLM[OpenRouter / DeepSeek]
    end
    
    Agent1 -->|Save| Convex
    Agent4 -->|Save| Convex
```

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, TailwindCSS, Shadcn UI, Framer Motion
- **Backend:** Node.js, Express, Inngest
- **Database:** Convex (Real-time)
- **Auth:** Clerk
- **AI:** OpenRouter (DeepSeek, Gemini, Claude)
- **Infrastructure:** Docker (Worker Nodes)

---

*Built for the Vibeathon. Hacking the planet, one repo at a time.* 💀
