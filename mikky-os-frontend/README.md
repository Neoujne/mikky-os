# Mikky OS Frontend 💻

Built with **React, Vite, TailwindCSS, and Shadcn UI**. The Cyberpunk interface for the modern hacker.

## 🔐 Auth & Identity (Clerk)
We use [Clerk](https://clerk.com/) for secure authentication. User sessions are persisted and synced with our backend for role-based access control.

## 🗄️ Real-time Database (Convex)
Data isn't fetched; it's **streamed**. Convex ensures that scan updates, agent chat logs, and vulnerability findings appear instantly on your dashboard without refreshing.

## 🎨 Theme Provider
The `ThemeProvider` allows hot-swapping between:
- **Cyberpunk Mode**: High-contrast Neon Cyan/Purple.
- **Stealth Mode**: Classic Terminal Green.
- **Vibe Mode**: The Vibeathon special.

## 🚀 Key Pages
- **Code Audit**: Input a repo URL, watch the terminal stream, and chat with findings.
- **Intel**: Network recon visualization.
- **Vulns**: Aggregated vulnerability database.
