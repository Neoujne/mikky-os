/**
 * Input Sanitization & Domain Validation
 * 
 * Triple-layer validation to prevent shell injection and SSRF attacks:
 * 1. Format validation (DOMAIN_REGEX)
 * 2. Blocked target check (localhost, internal IPs)
 * 3. Shell metacharacter rejection
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Valid domain format:
 * - Labels separated by dots
 * - Each label: 1-63 chars, alphanumeric + hyphens (no leading/trailing hyphen)
 * - 2-63 char TLD
 * - Total max 253 chars
 */
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

/**
 * Targets that must never be scanned (SSRF prevention)
 */
const BLOCKED_TARGETS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    // Private IPv4 ranges
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    // Link-local
    /^169\.254\./,
    // Metadata endpoints (cloud SSRF)
    /^metadata\./,
    /^169\.254\.169\.254$/,
];

/**
 * Shell metacharacters that indicate injection attempts
 */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]!<>\\'"#\n\r\t]/;

// ============================================================================
// VALIDATION FUNCTION
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    sanitized?: string;
    error?: string;
}

/**
 * Triple-layer domain validation:
 * 1. Format check (regex)
 * 2. Blocked target check (SSRF prevention)
 * 3. Shell metacharacter rejection (injection prevention)
 */
export function validateDomain(input: unknown): ValidationResult {
    // Type check
    if (typeof input !== 'string') {
        return { valid: false, error: 'Target must be a string' };
    }

    // Trim and lowercase
    const domain = input.trim().toLowerCase();

    // Empty check
    if (!domain) {
        return { valid: false, error: 'Target domain cannot be empty' };
    }

    // Length check (DNS max is 253 characters)
    if (domain.length > 253) {
        return { valid: false, error: 'Target domain exceeds maximum length (253 chars)' };
    }

    // Layer 1: Shell metacharacter rejection (highest priority)
    if (SHELL_METACHARACTERS.test(domain)) {
        return { valid: false, error: 'Invalid characters detected in target' };
    }

    // Layer 2: Domain format validation
    if (!DOMAIN_REGEX.test(domain)) {
        return { valid: false, error: 'Invalid domain format. Expected: example.com' };
    }

    // Layer 3: Blocked target check (SSRF prevention)
    for (const blocked of BLOCKED_TARGETS) {
        if (typeof blocked === 'string') {
            if (domain === blocked || domain.endsWith('.' + blocked)) {
                return { valid: false, error: `Scanning ${blocked} is not permitted` };
            }
        } else if (blocked instanceof RegExp) {
            if (blocked.test(domain)) {
                return { valid: false, error: 'Scanning internal/private targets is not permitted' };
            }
        }
    }

    return { valid: true, sanitized: domain };
}

/**
 * Sanitize a string for safe use in shell commands.
 * Used as a defense-in-depth check inside docker.ts.
 * Strips any character that isn't alphanumeric, dot, or hyphen.
 */
export function sanitizeForShell(input: string): string {
    return input.replace(/[^a-zA-Z0-9.\-]/g, '');
}
