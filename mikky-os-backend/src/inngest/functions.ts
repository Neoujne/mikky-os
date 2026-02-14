/**
 * Inngest Function Registry
 *
 * Pure registry file — all scan logic lives in individual agent modules.
 */

import { agentFunction } from './agent.js';
import { agent1InfoGathering } from './agents/agent1-info-gathering.js';
import { agent2PortEnum } from './agents/agent2-port-enum.js';
import { agent3VulnScan } from './agents/agent3-vuln-scan.js';
import { reportingStage } from './agents/reporting.js';
import { codeAuditAgent } from './agents/agent4-code-audit.js';

export const functions = [
    agentFunction,
    agent1InfoGathering,
    agent2PortEnum,
    agent3VulnScan,
    reportingStage,
    codeAuditAgent,
];
