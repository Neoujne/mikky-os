/**
 * Cron Jobs - Scheduled tasks for Mikky OS
 * 
 * Note: Convex crons run in the cloud and execute actions/mutations on schedule.
 * The worker health check runs every minute to monitor Docker status.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check worker health every minute
crons.interval(
    "worker-health-check",
    { minutes: 1 },
    internal.system.checkWorkerHealth,
);

export default crons;
