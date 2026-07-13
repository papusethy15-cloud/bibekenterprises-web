"use client";

import { fmtDateIST, fmtDateTimeIST, relativeTimeIST, todayIST } from "@/lib/tz";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import * as auth from "@/lib/auth";
import { UpdateCustomerInput } from "@/types";

const INPUT =
  "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition";

export default function ProfilePage() {
  const { user, customer, refreshCustomer, syncUserName } = useAuth();

  const [form,    setForm]    = useState<UpdateCustomerInput>({});
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // KEY FIX: also depend on user?.user_id so that when a different customer
  // logs in the form resets to their data (not the previous user's).
  useEffect(() => {
    setSuccess(false);
    setError("");
    if (!customer) {
      setForm({});
      return;
    }
    setForm({
      name:             customer.name,
      email:            customer.email ?? "",
      alternate_mobile: customer.alternate_mobile ?? "",
    });
  }, [customer, user?.user_id]);

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(""); setSuccess(false);
    try {
      await auth.updateCustomerProfile(form);
      // 1. Refresh the customer context so all components (including this page) re-render
      await refreshCustomer();
      // 2. Sync the display name into the user/header context immediately
      if (form.name?.trim()) syncUserName(form.name.trim());
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-ink-900">My Profile</h2>

      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 space-y-5">
        {/* Read-only: mobile */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Mobile Number</label>
          <div className="flex items-center gap-2 px-4 py-3 bg-ink-50 rounded-xl border border-ink-100 text-sm text-ink-600">
            <span>📞</span> +91 {user?.mobile}
            <span className="ml-auto text-xs text-brand-600 font-medium">Verified ✓</span>
          </div>
        </div>

        {customer?.customer_code && (
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Customer ID</label>
            <div className="px-4 py-3 bg-ink-50 rounded-xl border border-ink-100 text-sm font-mono text-ink-600">
              {customer.customer_code}
            </div>
          </div>
        )}

        {/* Editable fields */}
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Full Name *</label>
          <input
            type="text"
            placeholder="Your full name"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Email Address</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Alternate Mobile</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile"
            value={form.alternate_mobile ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, alternate_mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
            }
            className={INPUT}
          />
        </div>

        {/* GST details (optional) */}
        <details className="group">
          <summary className="text-xs font-medium text-ink-500 cursor-pointer select-none hover:text-ink-700 transition-colors">
            GST Details <span className="text-ink-300 group-open:hidden">(click to expand)</span>
          </summary>
          <div className="mt-3 space-y-3">
            <input
              type="text"
              placeholder="GST Number"
              value={form.gst_number ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value.toUpperCase() }))}
              className={INPUT}
            />
            <input
              type="text"
              placeholder="GST Business Name"
              value={form.gst_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, gst_name: e.target.value }))}
              className={INPUT}
            />
            <input
              type="text"
              placeholder="GST Registered Address"
              value={form.gst_address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, gst_address: e.target.value }))}
              className={INPUT}
            />
          </div>
        </details>

        {error   && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✅ Profile updated successfully.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full text-white font-semibold py-3 rounded-xl bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Account stats */}
      {customer && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <h3 className="font-semibold text-ink-900 mb-4 text-sm">Account Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-ink-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brand-600">{customer.total_bookings ?? "0"}</p>
              <p className="text-ink-400 mt-1 text-xs">Total Bookings</p>
            </div>
            <div className="bg-ink-50 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-ink-700">
                {customer.created_at
                  ? new Date(customer.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
              <p className="text-ink-400 mt-1 text-xs">Member Since</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
