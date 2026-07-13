"use client";

import { useState, useEffect } from "react";
import { CustomerAddress, CustomerAddressInput } from "@/types";
import { api } from "@/lib/api";
import * as customerLib from "@/lib/customer";
import { getCities } from "@/lib/domain";
import MapPickerModal, { MapPickerResult } from "@/components/MapPickerModal";

interface Props {
  brand: string;
  customerId: string;
  existing?: CustomerAddress;
  onClose: () => void;
  onSaved: (addr: CustomerAddress) => void;
}

const INPUT =
  "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition";

/** Browser Geolocation + optional Google Geocoding reverse-fill */
async function detectGPS(
  onCoords: (lat: number, lng: number) => void,
  onAutofill: (fields: Partial<{ city: string; state: string; pincode: string; address_line1: string }>) => void,
  onError: (msg: string) => void,
) {
  if (!navigator.geolocation) { onError("Geolocation not supported by your browser."); return; }
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onCoords(lat, lng);
        try {
          const key = await customerLib.getGoogleMapsKey();
          if (!key) { resolve(); return; }
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
        resolve();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          onError("Location permission denied. Please allow location access and try again.");
        else
          onError("Could not detect location. Please enter your address manually.");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/** Geocode a typed address into coordinates (fallback if no GPS) */
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

export default function AddressModal({ brand, customerId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CustomerAddressInput>({
    label: existing?.label || "Home",
    address_line1: existing?.address_line1 || "",
    address_line2: existing?.address_line2 || "",
    city: existing?.city || "",
    state: existing?.state || "",
    pincode: existing?.pincode || "",
    is_default: existing?.is_default ?? false,
    latitude: existing?.latitude ?? undefined,
    longitude: existing?.longitude ?? undefined,
    location_source: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<any[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  const update = (k: keyof CustomerAddressInput, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleDetectGPS = async () => {
    setGpsLoading(true);
    setError("");
    await detectGPS(
      (lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng, location_source: "gps" })),
      (fields) => setForm((f) => ({
        ...f,
        city:          fields.city    || f.city,
        state:         fields.state   || f.state,
        pincode:       fields.pincode || f.pincode,
        address_line1: fields.address_line1 && !f.address_line1 ? fields.address_line1 : f.address_line1,
      })),
      (msg) => setError(msg),
    );
    setGpsLoading(false);
  };

  const handleMapConfirm = (result: MapPickerResult) => {
    const matchedCity = cities.find(
      (c: any) => c.name.toLowerCase() === result.city.toLowerCase()
    );
    setForm((f) => ({
      ...f,
      latitude: result.latitude,
      longitude: result.longitude,
      location_source: "map",
      address_line1: result.address_line1 || f.address_line1,
      address_line2: result.address_line2 || f.address_line2,
      city: matchedCity ? matchedCity.name : (result.city || f.city),
      state: matchedCity ? (matchedCity.state ?? result.state) : (result.state || f.state),
      pincode: result.pincode || f.pincode,
    }));
    if (!matchedCity && result.city) {
      setError(`Note: '${result.city}' is not a serviced city. Please select from the city list.`);
    } else {
      setError("");
    }
  };

  const handleSave = async () => {
    if (!form.address_line1.trim() || !form.city.trim() || !form.pincode.trim()) {
      setError("Address line 1, city, and pincode are required.");
      return;
    }
    setSaving(true);
    setError("");

    let lat = form.latitude;
    let lng = form.longitude;
    let locSrc = form.location_source;

    // If no GPS yet, try geocoding from the typed address
    if ((!lat || !lng) && form.address_line1 && form.city) {
      await geocodeAddress(form, (la, ln) => { lat = la; lng = ln; });
      if (lat && lng && !locSrc) locSrc = "geocoded";
    }
    if (!locSrc) locSrc = lat && lng ? "gps" : "manual";

    const payload: CustomerAddressInput = { ...form, latitude: lat, longitude: lng, location_source: locSrc };

    try {
      let res;
      if (existing) {
        res = await api.put(`/customers/${customerId}/addresses/${existing.id}`, payload);
      } else {
        res = await api.post(`/customers/${customerId}/addresses`, payload);
      }
      // Backend returns {data: {id: ...}} for POST, or success for PUT
      const saved: CustomerAddress = res.data?.data ?? existing ?? { ...form, id: res.data?.data?.id ?? "" } as any;
      onSaved(saved);
    } catch (e: any) {
      // Backend returns `detail` (FastAPI), not `message`
      const detail = e?.response?.data?.detail ?? e?.response?.data?.message ?? "";
      setError(detail || "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
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
          {/* Label */}
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
            </div>
          </div>

          {/* Location: GPS + Map picker */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={gpsLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {gpsLoading ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-white" />Detecting…</>
              ) : (
                <>📍 Use GPS</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
              🗺️ Pick on Map
            </button>
          </div>

          {/* GPS status */}
          {form.latitude && form.longitude ? (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <span>✓</span>
              <span>GPS: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</span>
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank" rel="noreferrer"
                className="ml-auto underline"
              >
                Verify ↗
              </a>
            </div>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ No GPS yet — tap above or coordinates will be geocoded from your address when saving.
            </p>
          )}

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
              {cities.length > 0 ? (
                <select
                  value={form.city}
                  onChange={(e) => {
                    const c = cities.find((c: any) => c.name === e.target.value);
                    update("city", e.target.value);
                    if (c) update("state", c.state ?? "");
                  }}
                  className={INPUT}
                >
                  <option value="">Select city</option>
                  {cities.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input className={INPUT} placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">State</label>
              <input className={INPUT} placeholder="State" value={form.state} onChange={(e) => update("state", e.target.value)} readOnly={!!form.city && cities.some((c: any) => c.name === form.city)} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Pincode *</label>
              <input className={INPUT} placeholder="Pincode" value={form.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
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
      <MapPickerModal
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.latitude}
        initialLng={form.longitude}
        servicedCities={cities.map((c: any) => c.name)}
      />
    </div>
  );
}
