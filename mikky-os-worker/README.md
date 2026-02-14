# Mikky OS Worker (The Armory) 🛡️

**"Where the rubber meets the road."**

This module manages the **Docker Containers** that execute the actual security tools. 

## 🐳 Why Docker?
Security tools like `nmap` and `nuclei` can be dangerous or unstable. Running them directly on the host is risky.
Mikky OS spins up ephemeral containers for every job, ensuring:
1.  **Isolation**: Crashes don't affect the main OS.
2.  **Security**: Malformed payloads can't escape the container.
3.  **Clean State**: Every scan starts fresh.

## 🛠️ The Toolkit
The worker image includes:
- `nmap`
- `masscan`
- `nuclei`
- `subfinder`
- Python & Node.js runtimes

*Note: Requires Docker Daemon to be running.*