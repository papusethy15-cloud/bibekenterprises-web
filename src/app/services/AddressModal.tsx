"use client";

import { useState } from "react";
import { CustomerAddress, CustomerAddressInput } from "@/types";
import { api } from "@/lib/api";

interface Props {
  brand: string;
  customerId: string;
  existing?: CustomerAddress;
  onClose: () => void;
  onSaved: (addr: CustomerAddress) => void;
}

const INPUT =
  "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition";

export default function AddressModal({ brand, customerId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CustomerAddressInput>({
    label: existing?.label || "Home",
    address_line1: existing?.address_line1 || "",
    address_line2: existing?.address_line2 || "",
    city: existing?.city || "",
    state: existing?.state || "",
    pincode: existing?.pincode || "",
    is_default: existing?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof CustomerAddressInput, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.address_line1.trim() || !form.city.trim() || !form.pincode.trim()) {
      setError("Address line 1, city, and pincode are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let res;
      if (existing) {
        res = await api.put(`/customers/${customerId}/addresses/${existing.id}`, form);
      } else {
        res = await api.post(`/customers/${customerId}/addresses`, form);
      }
      onSaved(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-400 hover:text-ink-700 text-xl font-bold"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-ink-900 mb-5">
          {existing ? "Edit Address" : "Add New Address"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Label</label>
            <div className="flex gap-2 flex-wrap">
              {["Home", "Work", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => update("label", l)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                  style={
                    form.label === l
                      ? { background: brand, borderColor: brand, color: "#fff" }
                      : { borderColor: "#e5e5e8", color: "#4a4a54", background: "#fff" }
                  }
                >
                  {l}
                </button>
              ))}
              {form.label && !["Home", "Work", "Other"].includes(form.label) && (
                <input
                  className={INPUT + " flex-1 py-1.5"}
                  value={form.label}
                  onChange={(e) => update("label", e.target.value)}
                  placeholder="Custom label"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Address Line 1 *</label>
            <input
              className={INPUT}
              placeholder="House/flat no., building, street"
              value={form.address_line1}
              onChange={(e) => update("address_line1", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Address Line 2</label>
            <input
              className={INPUT}
              placeholder="Locality, landmark (optional)"
              value={form.address_line2 || ""}
              onChange={(e) => update("address_line2", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">City *</label>
              <input className={INPUT} placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">State</label>
              <input className={INPUT} placeholder="State" value={form.state} onChange={(e) => update("state", e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Pincode *</label>
              <input className={INPUT} placeholder="Pincode" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} maxLength={6} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_default ?? false}
              onChange={(e) => update("is_default", e.target.checked)}
              className="rounded"
            />
            Set as default address
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: brand }}
          >
            {saving ? "Saving…" : existing ? "Update Address" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}
