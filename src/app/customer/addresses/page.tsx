"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import * as customerLib from "@/lib/customer";
import { CustomerAddress, CustomerAddressInput } from "@/types";

const INPUT = "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition";

const BLANK: CustomerAddressInput = {
  label: "Home", address_line1: "", address_line2: "",
  city: "", state: "", pincode: "", is_default: false,
  latitude: undefined, longitude: undefined, location_source: undefined,
};

/** Use browser Geolocation + optional Google Geocoding reverse-fill */
async function detectGPS(
  onCoords: (lat: number, lng: number) => void,
  onAutofill: (fields: Partial<{ city: string; state: string; pincode: string; address_line1: string }>) => void,
  onError: (msg: string) => void,
) {
  if (!navigator.geolocation) { onError("Geolocation not supported by your browser."); return; }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      onCoords(lat, lng);
      // Try Google Geocoding reverse-fill
      try {
        const key = await customerLib.getGoogleMapsKey();
        if (!key) return;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
        );
        const data = await res.json();
        const comps: any[] = data.results?.[0]?.address_components ?? [];
        const get = (type: string) =>
          comps.find((c) => c.types.includes(type))?.long_name ?? "";
        onAutofill({
          city: get("locality") || get("administrative_area_level_2"),
          state: get("administrative_area_level_1"),
          pincode: get("postal_code"),
          address_line1: get("sublocality_level_1") || get("sublocality") || get("neighborhood"),
        });
      } catch {}
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED)
        onError("Location permission denied. Please allow location access and try again.");
      else
        onError("Could not detect location. Please enter manually.");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/** Geocode a text address using Google Geocoding API */
async function geocodeAddress(
  form: CustomerAddressInput,
  onCoords: (lat: number, lng: number) => void,
) {
  try {
    const key = await customerLib.getGoogleMapsKey();
    if (!key) return;
    const q = [form.address_line1, form.city, form.state, form.pincode]
      .filter(Boolean).join(", ");
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`
    );
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc) onCoords(loc.lat, loc.lng);
  } catch {}
}

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
  const [gpsLoading, setGpsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    try { setAddresses(await customerLib.getAddresses(customer.id)); }
    catch { setAddresses([]); }
    finally { setLoading(false); }
  }, [customer?.id]);

  useEffect(() => {
    setAddresses([]); setShowForm(false); setEditId(null); setError("");
    if (customer?.id && user?.user_id) { load(); }
    else { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, user?.user_id]);

  const set = (k: keyof CustomerAddressInput, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setForm({ ...BLANK, is_default: addresses.length === 0 });
    setEditId(null); setError(""); setSuccess(""); setShowForm(true);
  };
  const openEdit = (a: CustomerAddress) => {
    setForm({
      label: a.label, address_line1: a.address_line1,
      address_line2: a.address_line2 ?? "", city: a.city,
      state: a.state, pincode: a.pincode, is_default: a.is_default,
      latitude: a.latitude ?? undefined, longitude: a.longitude ?? undefined,
      location_source: undefined,
    });
    setEditId(a.id); setError(""); setSuccess(""); setShowForm(true);
  };

  const handleDetectGPS = () => {
    setGpsLoading(true);
    detectGPS(
      (lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng, location_source: "gps" })),
      (fields) => setForm((f) => ({
        ...f,
        city:         fields.city    || f.city,
        state:        fields.state   || f.state,
        pincode:      fields.pincode || f.pincode,
        address_line1: fields.address_line1 && !f.address_line1 ? fields.address_line1 : f.address_line1,
      })),
      (msg) => setError(msg),
    ).finally(() => setGpsLoading(false));
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

    let lat = form.latitude;
    let lng = form.longitude;

    // If no GPS yet, try geocoding from the typed address
    if ((!lat || !lng) && form.address_line1 && form.city) {
      await geocodeAddress(form, (la, ln) => { lat = la; lng = ln; });
    }

    const locSrc = form.location_source || (lat && lng ? "geocoded" : "manual");
    const payload: CustomerAddressInput = { ...form, latitude: lat, longitude: lng, location_source: locSrc };

    try {
      if (editId) await customerLib.updateAddress(customer.id, editId, payload);
      else        await customerLib.addAddress(customer.id, payload);
      setShowForm(false);
      await load();
      setSuccess(editId ? "Address updated successfully." : "Address added successfully.");
    } catch (e: any) {
      // Surface the real backend error
      const detail = e?.response?.data?.detail ?? e?.response?.data?.message ?? "";
      setError(detail || "Could not save address. Please try again.");
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

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">✅ {success}</p>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-ink-900">{editId ? "Edit Address" : "Add New Address"}</h3>

          {/* Label */}
          <div className="flex gap-2">
            {["Home", "Work", "Other"].map((l) => (
              <button key={l} type="button" onClick={() => set("label", l)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.label === l ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200"
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* GPS detect button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {gpsLoading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />Detecting location…</>
            ) : (
              <>📍 Use My Current Location (GPS)</>
            )}
          </button>

          {/* GPS status chip */}
          {form.latitude && form.longitude ? (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <span>✓</span>
              <span>GPS saved: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</span>
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank" rel="noreferrer"
                className="ml-auto text-brand-600 underline"
              >
                Verify ↗
              </a>
            </div>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ No GPS yet — tap "Use My Current Location" or we'll geocode from your address when you save.
            </p>
          )}

          <input type="text" placeholder="House / Flat / Street *" value={form.address_line1}
            onChange={(e) => set("address_line1", e.target.value)} className={INPUT} />
          <input type="text" placeholder="Landmark / Area (optional)" value={form.address_line2}
            onChange={(e) => set("address_line2", e.target.value)} className={INPUT} />

          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="City *" value={form.city}
              onChange={(e) => set("city", e.target.value)} className={INPUT} />
            <input type="text" placeholder="State *" value={form.state}
              onChange={(e) => set("state", e.target.value)} className={INPUT} />
          </div>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Pincode *"
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={INPUT} />

          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_default}
              onChange={(e) => set("is_default", e.target.checked)}
              className="w-4 h-4 accent-brand-600" />
            Set as default address
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setError(""); }}
              className="flex-1 border-2 border-ink-200 text-ink-600 font-medium py-2.5 rounded-xl text-sm hover:bg-ink-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-60">
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
                  {addr.latitude && addr.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full hover:underline"
                    >
                      📍 GPS saved
                    </a>
                  ) : (
                    <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">No GPS</span>
                  )}
                </div>
                <p className="text-sm text-ink-600">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                <p className="text-sm text-ink-400">{addr.city}, {addr.state} – {addr.pincode}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => openEdit(addr)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">Edit</button>
                <button onClick={() => handleDelete(addr.id)} disabled={deleting === addr.id}
                  className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
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
