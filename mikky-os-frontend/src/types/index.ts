/**
 * MIKKY OS - Data Model Types
 * TypeScript interfaces for all entities in the pentest operation system.
 * 
 * @see product-plan/data-model/README.md for entity relationships
 */

// =====================================================
// Stage Status Types
// =====================================================

/** Pipeline stage names */
export type StageName =
    | 'subdomain_enum'
    | 'live_recon'
    | 'port_inspection'
    | 'tech_detection'
    | 'vuln_scanning'
    | 'deep_crawl'
    | 'param_discovery'
    | 'fuzzing'
    | 'nuclei_scan';

/** Status for each pipeline stage */
export type StageStatusValue = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/** Stage status object - tracks all 9 stages */
export type StageStatus = Record<StageName, StageStatusValue>;

// =====================================================
// Core Entities
// =====================================================

/**
 * Target
 * The root scope or primary domain being audited (e.g., `tesla.com`).
 * This is the parent entity for all scan operations.
 * 
 * Note: This interface is compatible with Convex Doc<"targets">
 */
export interface Target {
    _id: string;
    domain: string;
    safetyScore?: number;     // NEW: 100 = Safe, 0 = Critical
    riskScore?: number;       // DEPRECATED: Keep for backward compatibility
    totalVulns: number;
    lastScanDate?: string;
    status: 'active' | 'idle' | 'archived';
    createdAt: string;
    userId?: string;
    isArchived?: boolean;
}

/**
 * ScanRun
 * Represents a single execution session of the audit pipeline.
 * Contains a `stage_status` JSON object to atomically track the state of all 9 stages.
 */
export interface ScanRun {
    id: string;
    targetId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    stageStatus: StageStatus;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    // Scan configuration
    config?: ScanConfig;
    // Computed/aggregated fields
    subdomainCount?: number;
    vulnerabilityCount?: number;
    duration?: number; // in seconds
}

/** Configuration options for a scan run */
export interface ScanConfig {
    skipStages?: StageName[];
    maxThreads?: number;
    timeout?: number; // in seconds
    customNucleiTemplates?: string[];
    wordlists?: string[];
}

/**
 * Subdomain
 * A specific discoverable endpoint found during the audit.
 * Tracks DNS details, HTTP status codes, and includes screenshots.
 */
export interface Subdomain {
    id: string;
    scanRunId: string;
    hostname: string;
    ipAddress?: string;
    httpStatus?: number;
    title?: string;
    screenshotUrl?: string;
    contentLength?: number;
    responseTime?: number; // in ms
    isAlive: boolean;
    discoveredAt: Date;
    // DNS details
    cname?: string;
    dnsRecords?: string[];
}

/**
 * Port
 * A network port discovered on a specific Subdomain.
 * Tracks the port number, service name, and version information.
 */
export interface Port {
    id: string;
    subdomainId: string;
    portNumber: number;
    protocol: 'tcp' | 'udp';
    state: 'open' | 'closed' | 'filtered';
    serviceName?: string;
    serviceVersion?: string;
    banner?: string;
    discoveredAt: Date;
}

/**
 * Technology
 * A specific technology stack or framework detected on a Subdomain.
 */
export interface Technology {
    id: string;
    subdomainId: string;
    name: string;
    category: string; // e.g., 'CMS', 'Framework', 'Server', 'CDN'
    version?: string;
    confidence: number; // 0-100
    icon?: string;
    website?: string;
    discoveredAt: Date;
}

/** Severity levels for vulnerabilities */
export type VulnerabilitySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Vulnerability
 * A security issue or weakness discovered during the scan.
 * Tracks severity, source tool, and proof of concept.
 */
export interface Vulnerability {
    id: string;
    subdomainId: string;
    scanRunId: string;
    name: string;
    description?: string;
    severity: VulnerabilitySeverity;
    cvss?: number; // CVSS score 0-10
    cve?: string; // CVE identifier
    cwe?: string; // CWE identifier
    sourceTool: string; // e.g., 'nuclei', 'ffuf', 'custom'
    templateId?: string; // Nuclei template ID
    matchedAt: string; // URL or endpoint where found
    proofOfConcept?: string; // Raw request/response or payload
    remediation?: string;
    references?: string[];
    isVerified: boolean;
    isFalsePositive: boolean;
    discoveredAt: Date;
}

/** Log level for scan logs */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ScanLog
 * A granular log entry generated during the scanning process.
 * The source of truth for the "Matrix-style" real-time console.
 */
export interface ScanLog {
    id: string;
    scanRunId: string;
    stage: StageName;
    level: LogLevel;
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

// =====================================================
// Navigation & UI Types
// =====================================================

/** Navigation item for the main menu */
export interface NavigationItem {
    label: string;
    href: string;
    icon?: React.ReactNode;
}

/** User information for the shell */
export interface User {
    name: string;
    email?: string;
    avatarUrl?: string;
}

/** Worker node status */
export type WorkerStatus = 'online' | 'offline' | 'busy';

// =====================================================
// API Response Types
// =====================================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
    message?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
