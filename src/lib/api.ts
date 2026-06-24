/**
 * api.ts — Axios client for client-side API calls (booking form, auth, etc.)
 *
 * Uses API_URL from config.ts as the single source of truth.
 * Domain context is passed via the X-Domain-Slug header so the backend
 * can scope responses (e.g. city prices) to the correct domain.
 */
import axios from "axios";
import { API_URL, DOMAIN_HEADER } from "@/lib/config";

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

/** 401 interceptor — clear stale tokens and bounce to /login */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("customer_profile");
      const current = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
    }
    return Promise.reject(err);
  }
);
