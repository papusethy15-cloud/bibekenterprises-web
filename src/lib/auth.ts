/**
 * auth.ts — OTP-based authentication for the customer-facing site.
 *
 * Flow: sendOtp(mobile) -> verifyOtp(mobile, otp) -> tokens stored in
 * localStorage (read by the `api` axios interceptor in lib/api.ts) ->
 * ensureCustomerProfile() called once right after login to get-or-create
 * the Customer CRM row (GET /customers/me, self-service, auto-creates on
 * first call) so addresses/bookings can be attached to it immediately.
 *
 * Storage keys:
 *   access_token    — read by src/lib/api.ts's request interceptor
 *   refresh_token   — used by refreshAccessToken()
 *   auth_user       — cached { user_id, role, name, mobile } from verify-otp
 *   customer_profile — cached Customer row from GET /customers/me
 */
import { api } from "./api";
import { AuthUser, VerifyOtpResponseData, CustomerProfile, UpdateCustomerInput } from "@/types";

const ACCESS_TOKEN_KEY  = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY          = "auth_user";
const CUSTOMER_KEY      = "customer_profile";

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Wipe every auth-related key from localStorage.
 * Called at the start of verifyOtp so a new user never sees stale data
 * from the previous session, and also called by logout().
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
}

// ── OTP ──────────────────────────────────────────────────────────────────────

export async function sendOtp(mobile: string): Promise<{ otp?: string; expires_in?: string }> {
  const res = await api.post("/auth/send-otp", { mobile });
  // Dev-mode only: backend currently echoes the OTP back since no SMS gateway
  // is wired yet (see backend TODO in routes/auth.py). Safe to drop once it is.
  return res.data?.data ?? {};
}

export async function verifyOtp(
  mobile: string,
  otp: string
): Promise<{ user: AuthUser; customer: CustomerProfile | null }> {
  // ── CRITICAL: clear ALL stale session data before writing the new one ──
  // Without this, there is a window where getCachedUser() / getCachedCustomer()
  // return the PREVIOUS user's data (e.g. AuthContext hydrating on mount, or
  // LoginClient reading the cache right after this call returns).
  clearSession();

  const res = await api.post("/auth/verify-otp", { mobile, otp });
  const data: VerifyOtpResponseData = res.data.data;

  // SECURITY: This site is the customer portal only. Technicians and admins
  // share the same OTP flow but must be blocked here — their role causes the
  // bookings endpoint to return technician-assigned jobs, not customer bookings.
  if (data.role !== "CUSTOMER") {
    throw Object.assign(new Error("STAFF_ACCOUNT"), { isStaffAccount: true });
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  const user: AuthUser = {
    user_id: data.user_id,
    role: data.role,
    name: data.name,
    mobile,
  };
  setCachedUser(user);

  // Get-or-create the Customer CRM row right away so addresses/bookings
  // have somewhere to attach to from the very first authenticated request.
  let customer: CustomerProfile | null = null;
  try {
    customer = await ensureCustomerProfile();
    setCachedCustomer(customer);
  } catch {
    // Non-fatal — booking/address pages will retry and surface their own error.
  }

  // Return BOTH user and customer so the caller (LoginClient) can call
  // setSession() with the definitive fresh values rather than reading the
  // cache (which could theoretically race in edge cases).
  return { user, customer };
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Token may already be expired — still clear local state below regardless.
  }
  clearSession();
}

// ── Customer profile (Customer CRM row, distinct from the User auth identity) ─

export async function ensureCustomerProfile(): Promise<CustomerProfile> {
  const res = await api.get("/customers/me");
  const customer: CustomerProfile = res.data.data;
  setCachedCustomer(customer);
  return customer;
}

export async function updateCustomerProfile(payload: UpdateCustomerInput): Promise<void> {
  // Strip empty strings so optional backend fields (EmailStr etc.) don't get a 422
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== "" && v !== null && v !== undefined) {
      clean[k] = v;
    }
  }
  await api.put("/customers/me", clean);
  await ensureCustomerProfile(); // refresh cache with the saved values
}

// ── Local cache helpers (read synchronously by AuthContext on mount) ──────────

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setCachedUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCachedCustomer(): CustomerProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CUSTOMER_KEY);
  return raw ? (JSON.parse(raw) as CustomerProfile) : null;
}

export function setCachedCustomer(customer: CustomerProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
