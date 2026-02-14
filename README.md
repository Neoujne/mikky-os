# MIKKY OS 🛡️
AI-Powered Offensive Security Operations Center

> "The Matrix has you... unless you hack it first." 🕶️

## ⚡ TL;DR (For Pro Developers)
If you have Node.js and Docker installed, just run this:

```bash
# 1. Clone & Install
git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
npm install

# 2. Setup Env
cp .env.example .env
# Fill in: OPENROUTER_API_KEY, CONVEX_URL, CLERK Keys

# 3. Launch
npm run dev:all
```

## 🔰 Absolute Beginner's Guide (Start Here)
New to coding? Follow these exact steps to run Mikky OS in 5 minutes.

### 1. Install Prerequisites
You need these three tools installed on your computer first:

- **Node.js (v18+)**: The engine that runs the app.
  👉 [Download Node.js (LTS Version)](https://nodejs.org/)

- **Git**: To download the source code.
  👉 [Download Git](https://git-scm.com/)

- **Docker Desktop**: Required for the security scanners.
  👉 [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)

> **Important:** Open Docker Desktop after installing and let it run in the background.

### 2. Download the Project
Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Mac) and run:

```bash
git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
```

### 3. Install Dependencies
This command downloads all the required libraries:

```bash
npm install
```

### 4. Configuration (The Keys)
Mikky OS needs API keys to work.

**Create Settings File:**
```bash
cp .env.example .env
```
*(If that command fails on Windows, just manually rename the file `.env.example` to `.env`)*

**Add Your Keys:**
Open the `.env` file and paste your keys:

- **OPENROUTER_API_KEY**: Get it from [OpenRouter.ai](https://openrouter.ai/) (Required for AI Chat).
- **CLERK_PUBLISHABLE_KEY**: Get it from [Clerk.com](https://clerk.com/) (Required for Login).
- **CONVEX_DEPLOYMENT**: Run `npx convex dev` in the terminal to set this up automatically.

### 5. 🚀 Launch the System
Run this single command to start everything:

```bash
npm run dev:all
```
Wait until you see the link `http://localhost:5173`. Click it to open the app!

## 🚀 Features

### 🤖 Source Code Audit [NEW]
**AI-Driven SAST Engine.**

- **What it does**: Scans GitHub repositories for security flaws without downloading the whole history.
- **How to use**: Paste a GitHub URL (e.g., `https://github.com/owner/repo`) and click Scan.
- **Output**: A list of Critical/High vulnerabilities with exact file locations.

### 💬 AI Security Consultant [NEW]
**Interactive Remediation Chat.**

- **What it does**: Allows you to talk to your codebase.
- **Example**: Ask "How do I fix this SQL Injection?" and the AI will write the secure code for you.

### 🕸️ Network Recon
- **Active Surveillance**: Uses Nmap & Masscan to find open ports and attack surfaces.
- **Real-time**: Results stream directly to your dashboard.

## 🏗️ Tech Stack
- **Frontend**: React, Vite, TailwindCSS (Cyberpunk Theme)
- **Backend**: Node.js, Express
- **Orchestration**: Inngest (Event-Driven Architecture)
- **Database**: Convex (Real-time Sync)
- **AI**: OpenRouter (DeepSeek, Gemini, Claude)

## ❓ Troubleshooting
- **"Command not found: docker"**: Ensure Docker Desktop is running.
- **"Missing Environment Variables"**: Check your `.env` file.
- **"Port 5173 in use"**: Another app is using the port. The terminal will ask to use a different one—just type `y`.

---
*Built for the Vibeathon. Hacking the planet, one repo at a time.* 💀
