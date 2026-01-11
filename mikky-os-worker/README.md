# MIKKY OS Worker Node

Dockerized Kali Linux security scanning runtime for MIKKY OS.

## Building the Image

```bash
docker build -t mikky-worker .
```

## Testing

```bash
# Test nmap
docker run --rm mikky-worker "nmap --version"

# Test whois
docker run --rm mikky-worker "whois --version"

# Test dig
docker run --rm mikky-worker "dig -v"

# Test curl
docker run --rm mikky-worker "curl --version"
```

## Installed Tools

- **nmap** - Network exploration and security auditing
- **whois** - Domain registration information
- **dnsutils** (dig, nslookup) - DNS queries
- **curl** - HTTP client
- **wget** - File retrieval
- **netcat** - Network debugging

## Security

- Runs as non-root user `scanner`
- Ephemeral containers (destroyed after each task)
- No persistent storage