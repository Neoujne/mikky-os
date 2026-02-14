/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as codeAudits from "../codeAudits.js";
import type * as crons from "../crons.js";
import type * as intel from "../intel.js";
import type * as scanLogs from "../scanLogs.js";
import type * as scans from "../scans.js";
import type * as settings from "../settings.js";
import type * as status from "../status.js";
import type * as system from "../system.js";
import type * as targets from "../targets.js";
import type * as terminal from "../terminal.js";
import type * as users from "../users.js";
import type * as vulnerabilities from "../vulnerabilities.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  codeAudits: typeof codeAudits;
  crons: typeof crons;
  intel: typeof intel;
  scanLogs: typeof scanLogs;
  scans: typeof scans;
  settings: typeof settings;
  status: typeof status;
  system: typeof system;
  targets: typeof targets;
  terminal: typeof terminal;
  users: typeof users;
  vulnerabilities: typeof vulnerabilities;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
