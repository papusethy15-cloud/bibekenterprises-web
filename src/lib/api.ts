/**
 * api.ts — Axios client for client-side API calls (booking form, auth, etc.)
 *
 * Uses API_URL from config.ts as the single source of truth.
 * Domain context is passed via the X-Domain-Slug header so the backend
 * can scope responses (e.g. city prices) to the correct domain.
 *
 * Token lifecycle (rolling 30-day session):
 *   - access_token  : short-lived (15 min). Sent on every request.
 *   - refresh_token : long-lived (30 days), rotated on every refresh call.
 *     As long as the user uses the app at least once every 30 days, the
 *     refresh token keeps sliding forward and the session never expires.
 *   - On 401: interceptor silently calls POST /auth/refresh-token, saves
 *     the new pair, and replays the failed request. If refresh itself fails
 *     (true expiry / logout on another device), it clears storage and
 *     redirects to /login exactly as before.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL, DOMAIN_HEADER } from "@/lib/config";

// Extend config type to carry the retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Domain-Slug": DOMAIN_HEADER,
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Guard against a stampede of parallel refresh calls if several
// requests 401 at the same moment — one in-flight promise, shared by all.
let _refreshInFlight: Promise<string | null> | null = null;

async function _doRefresh(): Promise<string | null> {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null;
  if (!refreshToken) return null;
  try {
    // Use a plain axios call (not `api`) to avoid hitting this interceptor again
    const res = await axios.post(
      `${API_URL}/auth/refresh-token`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const data = res.data?.data;
    const newAccess: string | undefined = data?.access_token;
    const newRefresh: string | undefined = data?.refresh_token;
    if (!newAccess) return null;
    localStorage.setItem("access_token", newAccess);
    if (newRefresh) localStorage.setItem("refresh_token", newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

function _clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("customer_profile");
}

/** 401 interceptor — try silent refresh once, then fallback to /login */
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (
      err?.response?.status !== 401 ||
      typeof window === "undefined"
    ) {
      return Promise.reject(err);
    }

    const config = err.config as RetryableConfig | undefined;

    // Don't retry auth endpoints themselves (refresh, login, OTP verify)
    // — that would loop infinitely.
    const isAuthCall = config?.url?.includes("/auth/");
    if (isAuthCall || config?._retry) {
      _clearSession();
      const current = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
      return Promise.reject(err);
    }

    // Mark so the replayed request never retries again on a second 401
    if (config) config._retry = true;

    // One shared refresh promise — concurrent 401s coalesce here
    _refreshInFlight ??= _doRefresh();
    const newToken = await _refreshInFlight;
    _refreshInFlight = null;

    if (!newToken || !config) {
      // Refresh failed (true expiry or revocation) — log out cleanly
      _clearSession();
      const current = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
      return Promise.reject(err);
    }

    // Replay the original request with the fresh token
    config.headers.Authorization = `Bearer ${newToken}`;
    return api(config);
  }
);
