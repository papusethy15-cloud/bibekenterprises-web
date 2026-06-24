/**
 * api.ts — Axios client for client-side API calls (booking form, auth, etc.)
 *
 * Domain context is passed via the X-Domain-Slug header so the backend
 * can scope responses (e.g. city prices) to the correct domain.
 */
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
    "X-Domain-Slug": process.env.NEXT_PUBLIC_DOMAIN_SLUG || "bibekenterprises",
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
