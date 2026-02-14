// =============================================================================
// Command Center Data Types
// =============================================================================

export interface Target {
    _id: string;
    domain: string;
    riskScore?: number;
    safetyScore?: number; // New: 0-100 where 100 = Safe, 0 = Critical
    totalVulns: number;
    lastScanDate?: string;
    lastError?: string; // Error message from last failed scan
    status: 'active' | 'idle' | 'archived' | 'failed';
    createdAt: string;
}

export interface StageStatus {
    info_gathering: 'pending' | 'running' | 'done' | 'failed';
    live_recon: 'pending' | 'running' | 'done' | 'failed';
    port_inspection: 'pending' | 'running' | 'done' | 'failed';
    enumeration: 'pending' | 'running' | 'done' | 'failed';
    protection_headers: 'pending' | 'running' | 'done' | 'failed';
    paths_files: 'pending' | 'running' | 'done' | 'failed';
    tech_detection: 'pending' | 'running' | 'done' | 'failed';
    vuln_scanning: 'pending' | 'running' | 'done' | 'failed';
    reporting: 'pending' | 'running' | 'done' | 'failed';
}

export interface ActiveScan {
    _id: string;
    targetId: string;
    targetDomain: string;
    startedAt: string;
    currentStage: keyof StageStatus;
    progress: number; // 0-100
    stageStatus: StageStatus;
    status: 'queued' | 'scanning' | 'completed' | 'failed' | 'cancelled' | 'stopped';
    // Summary metrics (populated during scan)
    totalPorts?: number;
    hostCount?: number;
    riskScore?: number;
    safetyScore?: number; // New: 0-100 where 100 = Safe
    headerScore?: number;
    vulnCount?: number;
    // AI-generated report
    aiSummary?: string;
}

export interface Metrics {
    totalTargets: number;
    activeScans: number;
    criticalVulns: number;
}

export interface ScanLog {
    _id: string;
    scanRunId: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    message: string;
}

export interface WorkerStatus {
    status: 'online' | 'offline' | 'busy';
    version: string;
    uptime: string;
}

// =============================================================================
// Component Props
// =============================================================================

export interface CommandCenterProps {
    /** List of all targets for the management table */
    targets: Target[];
    /** List of currently running scans for the Live Operations panel */
    activeScans: ActiveScan[];
    /** High-level dashboard counters */
    metrics: Metrics;
    /** Current status of the Docker worker node */
    workerStatus: WorkerStatus;

    /** Called when user adds a new target and clicks ENGAGE */
    onEngageScan?: (domain: string, includeSubdomains: boolean) => void;
    /** Called when user clicks a specific active scan to filter logs */
    onSelectScan?: (scanId: string) => void;
    /** Called when user deletes a target */
    onDeleteTarget?: (targetId: string) => void;
}

export interface DashboardMetricsProps {
    metrics: Metrics;
}

export interface LiveOperationsProps {
    activeScans: ActiveScan[];
    onSelectScan?: (id: string) => void;
}

export interface TargetsTableProps {
    targets: Target[];
    onDelete?: (id: string) => void;
}
