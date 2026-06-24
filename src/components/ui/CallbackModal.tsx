"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const SHOW_AFTER_MS = 30_000;            // show 30s after page load
const SKIP_STORAGE_KEY = "callback_modal_skipped_until";
const SKIP_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

interface Props {
  brand: string;
  siteName: string;
  defaultPhone?: string;
}

/**
 * CallbackModal — a "Request a Callback" popup shown 30s after the page
 * finishes loading, once per visitor per day (Skip persists via
 * localStorage for 24h). Submits to POST /chatbot/callback, the same
 * endpoint the chatbot's "Request Callback" flow uses, with `source:
 * "WEBSITE_MODAL"` and the current page URL so admins can tell where the
 * lead came from. The backend looks the mobile number up against existing
 * customers; if it's not a known customer, it also stores best-effort
 * IP/location/user-agent context (server-side) so the admin has something
 * to go on before calling an unknown lead.
 */
export default function CallbackModal({ brand, siteName, defaultPhone }: Props) {
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const skippedUntil = localStorage.getItem(SKIP_STORAGE_KEY);
      if (skippedUntil && Date.now() < Number(skippedUntil)) return; // still within skip window
    } catch {
      /* localStorage unavailable — show anyway */
    }

    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleSkip() {
    try {
      localStorage.setItem(SKIP_STORAGE_KEY, String(Date.now() + SKIP_DURATION_MS));
    } catch {
      /* ignore — worst case the modal reappears on next visit */
    }
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await api.post("/chatbot/callback", {
        mobile: digits,
        name: name.trim() || undefined,
        message: "Requested via website callback popup",
        source: "WEBSITE_MODAL",
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
      });
      setStatus("done");
      // Auto-close a couple seconds after success, and don't show again today.
      try {
        localStorage.setItem(SKIP_STORAGE_KEY, String(Date.now() + SKIP_DURATION_MS));
      } catch {}
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again, or call us directly.");
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a callback"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 sm:p-7 relative shadow-2xl animate-fade-in-up">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          aria-label="Skip for today"
          className="absolute top-4 right-4 text-ink-400 hover:text-ink-700 transition-colors text-sm font-semibold"
        >
          Skip ✕
        </button>

        {status === "done" ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-ink-900 mb-1">Thanks, we&apos;ve got it!</h2>
            <p className="text-sm text-ink-500">
              Our team will call you at <span className="font-semibold text-ink-700">{mobile}</span> shortly.
            </p>
          </div>
        ) : (
          <>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4"
              style={{ background: `${brand}15` }}
            >
              📞
            </div>
            <h2 className="text-lg font-bold text-ink-900 mb-1">Want us to call you?</h2>
            <p className="text-sm text-ink-500 mb-5 leading-relaxed">
              Leave your number and our {siteName} team will call you back — usually within a few minutes.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                  Mobile number<span style={{ color: brand }}> *</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                  style={{ borderColor: mobile ? brand : undefined }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">Name (optional)</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full text-white font-bold text-sm py-3 rounded-xl transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ background: brand }}
              >
                {status === "submitting" ? "Requesting…" : "Request Callback"}
              </button>

              {defaultPhone && (
                <p className="text-[11px] text-ink-300 text-center pt-1">
                  Or call us directly at{" "}
                  <a href={`tel:${defaultPhone.replace(/\s/g, "")}`} className="font-semibold" style={{ color: brand }}>
                    {defaultPhone}
                  </a>
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
