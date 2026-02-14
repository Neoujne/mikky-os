MIKKY OS 🛡️
AI-Powered Offensive Security Operations Center

"The Matrix has you... unless you hack it first." 🕶️

⚡ TL;DR (For Pro Developers)
If you already have Node, Docker, and standard dev tools:

Bash
# 1. Clone & Install
git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
npm install

# 2. Setup Env
cp .env.example .env
# Fill in: OPENROUTER_API_KEY, CONVEX_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# 3. Launch
npm run dev:all
🔰 Absolute Beginner's Guide (Start Here)
New to development? No problem. Follow these steps to get Mikky OS running on your machine in 5 minutes.

1. Install Prerequisites
Before you start, you need these tools installed on your computer.

Node.js (Version 18 or higher): The engine that runs the code.

👉 Download Node.js Here (Choose "LTS" version).

Verify: Open your terminal and type node -v.

Git: To download the code.

👉 Download Git Here.

Docker Desktop: Required for the security scanning worker nodes.

👉 Download Docker Desktop.

Important: Install it and start the app so it's running in the background.

2. Get the Code
Open your terminal (Command Prompt on Windows, Terminal on Mac) and run:

Bash
git clone https://github.com/Neoujne/mikky-os.git
cd mikky-os
3. Install Dependencies
This downloads all the libraries Mikky OS needs to run.

Bash
npm install
(This might take a minute. If you see warnings, don't worry, just wait for it to finish.)

4. The Keys to the Kingdom (Configuration)
Mikky OS uses powerful AI and Database tools. You need to give it access keys.

Create the Environment File:

Copy the example file to a real settings file.

Bash
cp .env.example .env
(On Windows, you might need to manually rename .env.example to .env in your folder).

Get Your Free Keys:
Open the .env file in any text editor (Notepad, VS Code) and fill in these values:

OPENROUTER_API_KEY: Sign up at OpenRouter.ai. This powers the AI Consultant.

CLERK_PUBLISHABLE_KEY & SECRET_KEY: Sign up at Clerk.com. Create a new app (select "Email/Password" login). Copy the keys from the dashboard.

CONVEX_DEPLOYMENT: Run npx convex dev in your terminal once. It will guide you through logging in and automatically configure this for you!

5. 🚀 Launch System
This is the magic moment. Run this single command to start the Frontend, Backend, Database, and AI Agents all at once:

Bash
npm run dev:all
Wait until you see: ➜  Local:   http://localhost:5173/

Open that link in your browser.

Welcome to the Future.

🌆 The Vibe
Mikky OS isn't just a tool; it's an experience.

Cyberpunk Mode: Neon Cyan/Purple, Matrix rain aesthetics. (Default)

Stealth Mode: Green/Black terminal vibes.

Toggle: Go to Settings to switch vibes instantly.

🚀 Features (The "Meat")
🕸️ Network Recon & Surveillance
Active monitoring engine that orchestrates Nmap, Masscan, and Subfinder to map attack surfaces in real-time. Results are streamed live to your dashboard via WebSockets.

🧪 Vulnerability Lab
Integrated Nuclei engine capabilities. Detects CVEs, misconfigurations, and exposed panels. The system automatically categorizes findings by severity (CRITICAL to INFO).

🤖 Source Code Audit [NEW]
AI-Driven SAST Engine. Paste a GitHub URL, and Mikky OS will:

Fetch the repository structure (no git clone required).

Identify high-risk files (Auth logic, API configs, Cryptography).

"Read" the code using Large Language Models (LLMs).

Produce a detailed vulnerability report with fixed code snippets.

💬 AI Security Consultant [NEW]
Interactive Remediation Chat. Found a vulnerability? Don't just stare at it.

Ask: "How do I fix this SQL Injection?"

Ask: "Why is this regex dangerous?"

Result: The AI analyzes your specific codebase and writes a secure patch for you live.

🏗️ Architecture
Built on a robust Event-Driven Architecture for maximum reliability:

Orchestration: Inngest (Manages the AI Agents workflow).

Real-time DB: Convex (Syncs data between backend and UI instantly).

Frontend: React + Vite + TailwindCSS + Shadcn UI.

AI: OpenRouter (DeepSeek, Gemini, Claude).

Containerization: Docker (For safe execution of scanning tools).

❓ Troubleshooting
"Command not found: docker": Make sure Docker Desktop is installed and running.

"Missing Environment Variables": Double-check your .env file. Did you save it?

"Port 5173 already in use": You might have another app running. The terminal will usually ask to try a different port (type y).

Built for the Vibeathon. Hacking the planet, one repo at a time. 💀
