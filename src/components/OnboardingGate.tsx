"use client";

/**
 * OnboardingGate — Non-dismissible multi-step onboarding modal for new customers.
 *
 * Steps:
 *   1. Profile (name required, email optional) — shown when name is missing/placeholder
 *   2. Address  — shown when no saved addresses after profile step
 *
 * Props:
 *   brand         — brand hex colour
 *   customer      — current customer from AuthContext
 *   mobile        — displayed as read-only confirmation
 *   onComplete    — called when all required steps are done (proceed to booking)
 *   skipAddress   — when true, skip the address step (customer bookings new-booking flow
 *                   can collect address inside the booking wizard instead)
 */

import { useState, useEffect, useCallback } from "react";
import * as auth from "@/lib/auth";
import * as customerLib from "@/lib/customer";
import { CustomerAddress } from "@/types";
import AddressModal from "@/app/services/AddressModal";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_NAMES = new Set(["new customer", "new user", "customer", "user", "new"]);

function isNamePlaceholder(name: string) {
  return !name || PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

interface Props {
  brand: string;
  mobile?: string;
  skipAddress?: boolean;
  onComplete: () => void;
}

type GateStep = "profile" | "address" | "done";

export default function OnboardingGate({ brand, mobile, skipAddress, onComplete }: Props) {
  const { customer, refreshCustomer, syncUserName } = useAuth();

  /* Determine which step to start on */
  const [step, setStep]               = useState<GateStep>("profile");
  const [initialized, setInitialized] = useState(false);

  /* Profile form */
  const [profileName,  setProfileName]  = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaving,setProfileSaving]= useState(false);
  const [profileError, setProfileError] = useState("");

  /* Address check */
  const [checkingAddr, setCheckingAddr] = useState(false);
  const [customerId,   setCustomerId]   = useState("");

  /* Initialize — determine starting step */
  useEffect(() => {
    if (initialized || !customer) return;
    setInitialized(true);
    setProfileName(customer.name && !isNamePlaceholder(customer.name) ? customer.name : "");
    setProfileEmail(customer.email ?? "");
    setCustomerId(customer.id ?? "");

    if (isNamePlaceholder(customer.name ?? "")) {
      setStep("profile");
    } else if (!skipAddress) {
      // Name is OK — check if address exists
      checkAddress(customer.id);
    } else {
      setStep("done");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, initialized, skipAddress]);

  const checkAddress = useCallback(async (cid: string) => {
    if (!cid) { setStep("done"); return; }
    setCheckingAddr(true);
    try {
      const list = await customerLib.getAddresses(cid);
      if (list.length === 0) {
        setStep("address");
      } else {
        setStep("done");
      }
    } catch {
      setStep("done"); // on error, don't block
    } finally {
      setCheckingAddr(false);
    }
  }, []);

  /* When step becomes "done", fire onComplete */
  useEffect(() => {
    if (step === "done") onComplete();
  }, [step, onComplete]);

  /* Profile save */
  const handleProfileSave = async () => {
    const trimmed = profileName.trim();
    if (!trimmed || trimmed.length < 2) {
      setProfileError("Please enter your full name (at least 2 characters).");
      return;
    }
    setProfileSaving(true); setProfileError("");
    try {
      await auth.updateCustomerProfile({ name: trimmed, email: profileEmail.trim() || undefined });
      const fresh = await refreshCustomer();
      syncUserName(trimmed);
      const cid = fresh?.id ?? customerId;
      setCustomerId(cid);
      if (!skipAddress) {
        await checkAddress(cid);
      } else {
        setStep("done");
      }
    } catch (e: any) {
      setProfileError(e?.response?.data?.message ?? "Could not save. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  /* Address saved */
  const handleAddressSaved = (_addr: CustomerAddress) => {
    setStep("done");
  };

  if (step === "done") return null;

  /* ── Backdrop ── */
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">

      {/* ── Profile Step ── */}
      {step === "profile" && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6 animate-fade-in-up">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{ background: `${brand}18` }}
            >
              👋
            </div>
            <h2 className="text-xl font-bold text-ink-900">Welcome! Tell us your name</h2>
            <p className="text-sm text-ink-400 mt-1">
              We need your name before you can book a service.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleProfileSave()}
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={{ "--tw-ring-color": `${brand}40` } as any}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Email <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleProfileSave()}
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={{ "--tw-ring-color": `${brand}40` } as any}
              />
            </div>
          </div>

          {profileError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileError}</p>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileSaving || !profileName.trim()}
            className="w-full text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: brand }}
          >
            {profileSaving ? "Saving…" : "Continue →"}
          </button>

          {mobile && (
            <p className="text-center text-xs text-ink-400">
              Logged in as +91 {mobile.replace(/\D/g, "")}
            </p>
          )}
        </div>
      )}

      {/* ── Address Step ── */}
      {step === "address" && !checkingAddr && customerId && (
        /* Re-use the existing full-featured AddressModal but make it non-closable */
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="bg-white rounded-t-2xl px-6 pt-6 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: `${brand}18` }}>📍</div>
              <div>
                <h2 className="text-base font-bold text-ink-900">Add your first address</h2>
                <p className="text-xs text-ink-400">Required to schedule a service visit.</p>
              </div>
            </div>
          </div>
          {/* Use AddressModal but override close to be a no-op (non-dismissible) */}
          <AddressModalNonDismissible
            brand={brand}
            customerId={customerId}
            onSaved={handleAddressSaved}
          />
        </div>
      )}

      {/* Checking address spinner */}
      {checkingAddr && (
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${brand} transparent ${brand} ${brand}` }} />
      )}
    </div>
  );
}

/* ── Inline non-dismissible address form ── */
import MapPickerModal, { MapPickerResult } from "@/components/MapPickerModal";
import { getCities } from "@/lib/domain";
import { api } from "@/lib/api";
import { CustomerAddressInput } from "@/types";

async function detectGPS(
  onCoords: (lat: number, lng: number) => void,
  onFill: (f: Partial<{ city: string; state: string; pincode: string; address_line1: string }>) => void,
  onError: (msg: string) => void,
) {
  if (!navigator.geolocation) { onError("Geolocation not supported."); return; }
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onCoords(lat, lng);
        try {
          const key = await customerLib.getGoogleMapsKey();
          if (!key) { resolve(); return; }
          const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
          const d = await r.json();
          const comps: any[] = d.results?.[0]?.address_components ?? [];
          const get = (t: string) => comps.find((c: any) => c.types.includes(t))?.long_name ?? "";
          onFill({
            city: get("locality") || get("administrative_area_level_2"),
            state: get("administrative_area_level_1"),
            pincode: get("postal_code"),
            address_line1: get("sublocality_level_1") || get("sublocality") || get("neighborhood"),
          });
        } catch {}
        resolve();
      },
      (err) => {
        onError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Could not detect location.");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

const FINPUT = "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition";

function AddressModalNonDismissible({
  brand, customerId, onSaved,
}: { brand: string; customerId: string; onSaved: (a: CustomerAddress) => void }) {
  const [form, setForm] = useState<CustomerAddressInput>({
    label: "Home", address_line1: "", address_line2: "",
    city: "", state: "", pincode: "", is_default: true,
    latitude: undefined, longitude: undefined, location_source: undefined,
  });
  const [saving, setSaving]     = useState(false);
  const [gpsLoad, setGpsLoad]   = useState(false);
  const [error, setError]       = useState("");
  const [cities, setCities]     = useState<any[]>([]);
  const [showMap, setShowMap]   = useState(false);

  useEffect(() => { getCities().then(setCities).catch(() => {}); }, []);

  const upd = (k: keyof CustomerAddressInput, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleGPS = async () => {
    setGpsLoad(true); setError("");
    await detectGPS(
      (lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng, location_source: "gps" })),
      (flds) => setForm((f) => ({
        ...f,
        city: flds.city || f.city, state: flds.state || f.state,
        pincode: flds.pincode || f.pincode,
        address_line1: flds.address_line1 && !f.address_line1 ? flds.address_line1 : f.address_line1,
      })),
      (msg) => setError(msg),
    );
    setGpsLoad(false);
  };

  const handleMapConfirm = (r: MapPickerResult) => {
    const mc = cities.find((c: any) => c.name.toLowerCase() === r.city.toLowerCase());
    setForm((f) => ({
      ...f, latitude: r.latitude, longitude: r.longitude, location_source: "map",
      address_line1: r.address_line1 || f.address_line1,
      address_line2: r.address_line2 || f.address_line2,
      city: mc ? mc.name : (r.city || f.city),
      state: mc ? (mc.state ?? r.state) : (r.state || f.state),
      pincode: r.pincode || f.pincode,
    }));
    if (!mc && r.city) setError(`Note: '${r.city}' may not be a serviced city.`);
    else setError("");
  };

  const handleSave = async () => {
    if (!form.address_line1.trim() || !form.city.trim() || !form.pincode.trim()) {
      setError("Address, city, and pincode are required."); return;
    }
    setSaving(true); setError("");
    const payload = { ...form };
    try {
      const res = await api.post(`/customers/${customerId}/addresses`, payload);
      const saved: CustomerAddress = {
        ...(form as any),
        id: res.data?.data?.id ?? res.data?.id ?? "",
        address_line2: form.address_line2 || null,
        is_default: form.is_default ?? true,
      };
      onSaved(saved);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Could not save address.");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-b-2xl shadow-2xl px-6 pb-6 pt-2 space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Label */}
      <div className="flex gap-2">
        {["Home", "Work", "Other"].map((l) => (
          <button key={l} type="button" onClick={() => upd("label", l)}
            className="flex-1 py-2 rounded-xl text-sm font-medium border transition-all"
            style={form.label === l
              ? { background: brand, borderColor: brand, color: "#fff" }
              : { borderColor: "#e5e5e8", color: "#4a4a54" }}>
            {l}
          </button>
        ))}
      </div>

      {/* GPS + Map */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleGPS} disabled={gpsLoad}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors">
          {gpsLoad ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-white" />Detecting…</> : <>📍 Use GPS</>}
        </button>
        <button type="button" onClick={() => setShowMap(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
          style={{ background: brand }}>
          🗺️ Pick on Map
        </button>
      </div>

      {form.latitude && form.longitude ? (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <span>✓ GPS captured</span>
          <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`} target="_blank" rel="noreferrer" className="ml-auto underline">Verify ↗</a>
        </div>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ Tap GPS or Map above to pin your location (optional but recommended).
        </p>
      )}

      <input className={FINPUT} placeholder="House/flat no., building, street *"
        value={form.address_line1} onChange={(e) => upd("address_line1", e.target.value)} />
      <input className={FINPUT} placeholder="Locality, landmark (optional)"
        value={form.address_line2 || ""} onChange={(e) => upd("address_line2", e.target.value)} />

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          {cities.length > 0 ? (
            <select value={form.city} className={FINPUT}
              onChange={(e) => { const c = cities.find((c: any) => c.name === e.target.value); upd("city", e.target.value); if (c) upd("state", c.state ?? ""); }}>
              <option value="">City *</option>
              {cities.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input className={FINPUT} placeholder="City *" value={form.city} onChange={(e) => upd("city", e.target.value)} />
          )}
        </div>
        <div className="col-span-1">
          <input className={FINPUT} placeholder="State" value={form.state}
            onChange={(e) => upd("state", e.target.value)}
            readOnly={!!form.city && cities.some((c: any) => c.name === form.city)} />
        </div>
        <div className="col-span-1">
          <input className={FINPUT} placeholder="Pincode *" value={form.pincode}
            onChange={(e) => upd("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <button onClick={handleSave} disabled={saving}
        className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        style={{ background: brand }}>
        {saving ? "Saving…" : "Save Address & Continue →"}
      </button>

      <MapPickerModal open={showMap} onClose={() => setShowMap(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.latitude} initialLng={form.longitude}
        servicedCities={cities.map((c: any) => c.name)} />
    </div>
  );
}
