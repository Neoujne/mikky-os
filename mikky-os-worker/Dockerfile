# ============================================================================
# MIKKY OS Worker Node - The Armory (Production)
# ============================================================================
# A comprehensive Kali Linux environment for advanced security operations.
# Includes top-tier tools for reconnaissance, fuzzing, exploitation, and AI scripting.
# ============================================================================

FROM kalilinux/kali-rolling

LABEL maintainer="mikky-os"
LABEL description="MIKKY OS Security Scanning Worker (The Armory)"
LABEL version="2.0"

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# ============================================================================
# SYSTEM CORE & RUNTIMES
# ============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core Utilities
    curl \
    wget \
    git \
    unzip \
    tar \
    p7zip-full \
    jq \
    vim \
    net-tools \
    iputils-ping \
    netcat-openbsd \
    # Runtimes
    python3-full \
    python3-pip \
    golang \
    # DNS Utils
    bind9-host \
    dnsutils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ============================================================================
# PYTHON ENVIRONMENT & AI LIBRARIES
# ============================================================================
# Install shared AI dependencies to avoid runtime installation overhead
RUN pip3 install --no-cache-dir --break-system-packages \
    requests \
    pandas \
    numpy \
    beautifulsoup4 \
    openai \
    google-generativeai \
    langchain \
    scikit-learn

# ============================================================================
# SECURITY ARSENAL ("The Heavy Hitters")
# ============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Network Recon & Discovery
    nmap \
    masscan \
    whois \
    amass \
    theharvester \
    # Web Assessment & Fuzzing
    whatweb \
    wafw00f \
    nikto \
    gobuster \
    ffuf \
    feroxbuster \
    dirsearch \
    # Modern Go-based Tools
    httpx-toolkit \
    subfinder \
    nuclei \
    # Password Attacks & Brute Force
    hydra \
    medusa \
    john \
    # Database Assessment
    sqlmap \
    # Exploitation Frameworks
    metasploit-framework \
    exploitdb \
    # Clean up
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ============================================================================
# WORDLISTS (SecLists)
# ============================================================================
# Install SecLists and other wordlists
RUN apt-get update && apt-get install -y --no-install-recommends \
    wordlists \
    seclists \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure wordlists are accessible and decompressed if necessary
# Note: Kali's seclists packages sometimes need unzipping or linking
RUN [ -d "/usr/share/wordlists/seclists" ] || \
    ln -s /usr/share/seclists /usr/share/wordlists/seclists

# ============================================================================
# CONFIGURATION & USER SETUP
# ============================================================================

# Create a non-root user for running scans
RUN useradd -m -s /bin/bash scanner

# Grant scanner user access to wordlists
RUN chown -R root:scanner /usr/share/wordlists && \
    chmod -R g+r /usr/share/wordlists

# Set working directory
WORKDIR /home/scanner

# Switch to non-root user
USER scanner

# Initialize Metasploit database (client-side only init)
# RUN msfdb init || true

# Set environment variables for tools
ENV PATH="/home/scanner/.local/bin:${PATH}"

# Default entrypoint - execute bash command
ENTRYPOINT ["/bin/bash", "-c"]

# Default command
CMD ["echo 'MIKKY OS Armory Ready'"]
