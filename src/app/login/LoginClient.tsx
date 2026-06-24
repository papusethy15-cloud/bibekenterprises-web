"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as auth from "@/lib/auth";

interface Props {
  siteName: string;
  logoUrl: string | null;
  brand: string;
}

type Step = "mobile" | "otp";

const INPUT = "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition focus:ring-2";

export default function LoginClient({ siteName, logoUrl, brand }: Props) {
  const router      = useRouter();
  const params      = useSearchParams();
  const redirect    = params.get("redirect") || "/customer/bookings";
  const { isLoggedIn, setSession } = useAuth();

  const [step,       setStep]      = useState<Step>("mobile");
  const [mobile,     setMobile]    = useState("");
  const [otp,        setOtp]       = useState("");
  const [devOtp,     setDevOtp]    = useState<string | null>(null);
  const [resendTick, setResendTick] = useState(0);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState("");

  /* Already logged in → skip straight to destination */
  useEffect(() => {
    if (isLoggedIn) router.replace(redirect);
  }, [isLoggedIn, redirect, router]);

  /* Resend countdown */
  useEffect(() => {
    if (resendTick <= 0) return;
    const t = setInterval(() => setResendTick((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTick]);

  /* ── Step 1: Send OTP ─────────────────────────────────────────────────── */
  const handleSendOtp = async () => {
    setError("");
    const clean = mobile.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setLoading(true);
    try {
      const data = await auth.sendOtp(clean);
      /* Dev-mode: backend echoes OTP until SMS gateway is wired */
      setDevOtp((data as any)?.otp ?? null);
      setStep("otp");
      setResendTick(30);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ───────────────────────────────────────────────── */
  const handleVerifyOtp = async () => {
    setError("");
    if (otp.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const clean = mobile.replace(/\D/g, "");
      // verifyOtp now returns { user, customer } with FRESH data — never read
      // from getCachedCustomer() here because clearSession() is called inside
      // verifyOtp before writing, which would return null if read too early.
      const { user, customer } = await auth.verifyOtp(clean, otp.trim());

      setSession(user, customer);
      router.replace(redirect);
    } catch (e: any) {
      if ((e as any)?.isStaffAccount) {
        setError(
          "This number is registered as a staff account and cannot log in here. " +
          "Please use the staff portal or contact support."
        );
      } else {
        const msg = e?.response?.data?.message ?? "";
        setError(msg || "Incorrect OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-12 object-contain mx-auto mb-4" />
            ) : (
              <span style={{ color: brand }} className="text-3xl font-extrabold">{siteName}</span>
            )}
          </Link>
          <h1 className="text-2xl font-bold text-ink-900 mt-3">
            {step === "mobile" ? "Login to your account" : "Verify your number"}
          </h1>
          <p className="text-ink-400 text-sm mt-1">
            {step === "mobile"
              ? "Enter your mobile number to receive a one-time password"
              : `We sent a 6-digit OTP to +91 ${mobile.replace(/\D/g, "")}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-8">
          {step === "mobile" ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Mobile Number</label>
                <div className="flex rounded-xl overflow-hidden border border-ink-200 focus-within:ring-2 transition"
                     style={{ "--tw-ring-color": `${brand}40` } as any}>
                  <span className="px-3 flex items-center bg-ink-50 text-ink-500 text-sm border-r border-ink-200 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="flex-1 px-4 py-3 text-sm outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: brand }}
              >
                {loading ? "Sending…" : "Send OTP →"}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Dev-mode OTP hint — remove once SMS gateway is wired */}
              {devOtp && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-amber-700">🛠 Dev mode</span>
                  <span className="text-amber-600"> — OTP: </span>
                  <span className="font-mono font-bold text-amber-800 tracking-widest">{devOtp}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className={INPUT + " text-center text-2xl tracking-[0.4em] font-bold"}
                  style={{ letterSpacing: "0.4em" }}
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.replace(/\D/g, "").length !== 6}
                className="w-full text-white font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: brand }}
              >
                {loading ? "Verifying…" : "Verify & Login"}
              </button>

              <div className="flex justify-between items-center text-sm pt-1">
                <button
                  onClick={() => { setStep("mobile"); setOtp(""); setError(""); setDevOtp(null); }}
                  className="text-ink-400 hover:text-ink-700 transition-colors"
                >
                  ← Change number
                </button>
                {resendTick > 0 ? (
                  <span className="text-ink-400">Resend in {resendTick}s</span>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="font-medium transition-colors"
                    style={{ color: brand }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-ink-700">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-ink-700">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
