/**
 * config.ts — Single source of truth for environment-aware configuration.
 *
 * ALL API URL construction in the project must import from here.
 * Never hardcode "localhost:8000", "api.bibekenterprises.com", or "/api/v1"
 * anywhere else in application code.
 *
 * Environment matrix:
 * ┌─────────────────┬───────────────────────────────────────────────┐
 * │ Environment     │ NEXT_PUBLIC_API_URL value                     │
 * ├─────────────────┼───────────────────────────────────────────────┤
 * │ Local dev       │ http://localhost:8000/api/v1  (from .env.local)│
 * │ VPS production  │ https://api.bibekenterprises.com/api/v1 (.env) │
 * └─────────────────┴───────────────────────────────────────────────┘
 *
 * Both browser-side (Axios) and server-side (Next.js SSR/ISR fetch) use
 * API_URL directly — no proxy rewrites, no relative paths, no ambiguity.
 */

/** Full base URL for all API calls, including trailing path segment /api/v1. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Domain slug identifying this deployment's tenant row in the DB. */
export const DOMAIN_SLUG =
  process.env.NEXT_PUBLIC_DOMAIN_SLUG || "bibekenterprises";

/** Optional domain UUID — used for direct ID lookups (faster than slug scan). */
export const DOMAIN_ID = process.env.NEXT_PUBLIC_DOMAIN_ID || "";

/** X-Domain-Slug header value sent on every API request. */
export const DOMAIN_HEADER = DOMAIN_SLUG;
