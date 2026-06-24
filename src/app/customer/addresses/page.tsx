"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import * as customerLib from "@/lib/customer";
import { CustomerAddress, CustomerAddressInput } from "@/types";

const INPUT = "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition";

const BLANK: CustomerAddressInput = { label: "Home", address_line1: "", address_line2: "", city: "", state: "", pincode: "", is_default: false };

export default function AddressesPage() {
  const { customer, user } = useAuth();

  const [addresses, setAddresses]   = useState<CustomerAddress[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [showForm,  setShowForm]    = useState(false);
  const [editId,    setEditId]      = useState<string | null>(null);
  const [form,      setForm]        = useState<CustomerAddressInput>(BLANK);
  const [saving,    setSaving]      = useState(false);
  const [deleting,  setDeleting]    = useState<string | null>(null);
  const [error,     setError]       = useState("");
  const [success,   setSuccess]     = useState("");

  const load = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try { setAddresses(await customerLib.getAddresses(customer.id)); }
    catch { setAddresses([]); }
    finally { setLoading(false); }
  };

  // KEY FIX: depend on BOTH customer?.id AND user?.user_id.
  // customer?.id alone catches profile changes within a session; user?.user_id
  // guarantees a full reset when a completely different person logs in even if
  // their customer.id somehow matched (shouldn't happen, but belt-and-braces).
  useEffect(() => {
    // Reset UI state immediately when identity changes to prevent stale data flash.
    setAddresses([]);
    setShowForm(false);
    setEditId(null);
    setError("");
    if (customer?.id && user?.user_id) {
      load();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, user?.user_id]);

  const openAdd = () => { setForm({ ...BLANK, is_default: addresses.length === 0 }); setEditId(null); setError(""); setSuccess(""); setShowForm(true); };
  const openEdit = (a: CustomerAddress) => {
    setForm({ label: a.label, address_line1: a.address_line1, address_line2: a.address_line2 ?? "", city: a.city, state: a.state, pincode: a.pincode, is_default: a.is_default });
    setEditId(a.id); setError(""); setSuccess(""); setShowForm(true);
  };

  const validate = () => {
    if (!form.address_line1.trim()) return "Address line 1 is required.";
    if (!form.city.trim())          return "City is required.";
    if (!form.state.trim())         return "State is required.";
    if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit pincode.";
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!customer?.id) return;
    setSaving(true); setError("");
    try {
      if (editId) await customerLib.updateAddress(customer.id, editId, form);
      else        await customerLib.addAddress(customer.id, form);
      setShowForm(false);
      await load();
      setSuccess(editId ? "Address updated successfully." : "Address added successfully.");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Could not save address.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    if (!customer?.id) return;
    setDeleting(id); setSuccess("");
    try { await customerLib.deleteAddress(customer.id, id); await load(); setSuccess("Address deleted."); }
    catch { setError("Could not delete address."); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">My Addresses</h2>
        {!showForm && (
          <button onClick={openAdd} className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors">
            + Add Address
          </button>
        )}
      </div>

      {/* Success / error banners */}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          ✅ {success}
        </p>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-ink-900">{editId ? "Edit Address" : "Add New Address"}</h3>

          <div className="flex gap-2">
            {["Home", "Work", "Other"].map((l) => (
              <button key={l} type="button" onClick={() => setForm((f) => ({ ...f, label: l }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.label === l ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200"
                }`}>
                {l}
              </button>
            ))}
          </div>

          <input type="text" placeholder="House / Flat / Street *" value={form.address_line1} onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))} className={INPUT} />
          <input type="text" placeholder="Landmark / Area (optional)" value={form.address_line2} onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))} className={INPUT} />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="City *" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={INPUT} />
            <input type="text" placeholder="State *" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={INPUT} />
          </div>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Pincode *" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={INPUT} />

          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
            Set as default address
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setError(""); }} className="flex-1 border-2 border-ink-200 text-ink-600 font-medium py-2.5 rounded-xl text-sm hover:bg-ink-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-60">
              {saving ? "Saving…" : editId ? "Update Address" : "Save Address"}
            </button>
          </div>
        </div>
      )}

      {/* Address list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-4 border-t-transparent animate-spin border-brand-500" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 p-10 text-center">
          <p className="text-3xl mb-3">📍</p>
          <p className="text-ink-700 font-semibold mb-1">No addresses saved</p>
          <p className="text-ink-400 text-sm">Add a service address to make booking faster.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 flex gap-4 items-start">
              <span className="text-2xl shrink-0">📍</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-ink-900 text-sm">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <p className="text-sm text-ink-600">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                <p className="text-sm text-ink-400">{addr.city}, {addr.state} – {addr.pincode}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => openEdit(addr)} className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">Edit</button>
                <button onClick={() => handleDelete(addr.id)} disabled={deleting === addr.id} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                  {deleting === addr.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
