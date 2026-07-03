"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuthUser, CustomerProfile } from "@/types";
import * as auth from "@/lib/auth";

interface AuthContextValue {
  /** True only after the initial localStorage read on mount — avoids a
   *  flash of "logged out" UI before we've checked for an existing session. */
  hydrated: boolean;
  user: AuthUser | null;
  customer: CustomerProfile | null;
  isLoggedIn: boolean;
  /** Re-fetches GET /customers/me and updates both context + cache —
   *  call after editing the profile or adding the first address. */
  refreshCustomer: () => Promise<CustomerProfile | null>;
  /** Called by the login page once verify-otp succeeds, so every
   *  component re-renders with the new session immediately. */
  setSession: (user: AuthUser, customer: CustomerProfile | null) => void;
  /** Sync the display name in both user state and localStorage after a profile save. */
  syncUserName: (name: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  // On mount: hydrate from localStorage (set by a previous login in this
  // browser). No network call here — instant, so the header doesn't flicker.
  //
  // IMPORTANT: The JWT-derived user.name comes from the token issued at
  // registration time and is NEVER refreshed by the token itself — so if the
  // customer later updates their name via the profile page, the token still
  // carries the old name (e.g. "New"). We fix this by preferring the
  // customer_profile cache (which IS updated by ensureCustomerProfile after
  // every profile save) over the token name whenever they differ.
  useEffect(() => {
    const cachedUser     = auth.getCachedUser();
    const cachedCustomer = auth.getCachedCustomer();

    if (cachedUser && cachedCustomer?.name && cachedCustomer.name !== cachedUser.name) {
      // Patch the in-memory user with the real name from the customer profile
      // and persist it so subsequent mounts don't flicker either.
      const patched = { ...cachedUser, name: cachedCustomer.name };
      auth.setCachedUser(patched);
      setUser(patched);
    } else {
      setUser(cachedUser);
    }

    setCustomer(cachedCustomer);
    setHydrated(true);
  }, []);

  const setSession = useCallback((u: AuthUser, c: CustomerProfile | null) => {
    setUser(u);
    setCustomer(c);
  }, []);

  const refreshCustomer = useCallback(async (): Promise<CustomerProfile | null> => {
    try {
      const fresh = await auth.ensureCustomerProfile();
      setCustomer(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  /** Patch the display name in user state + localStorage without a network call. */
  const syncUserName = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      auth.setCachedUser(updated);
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
    setCustomer(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ hydrated, user, customer, isLoggedIn: !!user, refreshCustomer, syncUserName, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Defensive fallback (e.g. isolated component tests) — behaves as "logged out".
    return {
      hydrated: true,
      user: null,
      customer: null,
      isLoggedIn: false,
      refreshCustomer: async () => null,
      syncUserName: () => {},
      setSession: () => {},
      logout: async () => {},
    };
  }
  return ctx;
}
