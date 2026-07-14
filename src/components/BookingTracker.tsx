"use client";

/**
 * BookingTracker
 * ══════════════
 * Shown after a booking is confirmed. Connects to the booking WebSocket room and
 * transitions through three phases:
 *
 *   WAITING   → auto-assign is trying to find a technician
 *   ACCEPTED  → technician accepted; shows name + phone + distance
 *   TRACKING  → technician is EN_ROUTE; shows live Google Maps
 *
 * Falls back gracefully when:
 *   • No technician is online at booking time (shows "we'll notify you" message)
 *   • Google Maps API key is not configured (shows text address instead)
 *   • WebSocket is unavailable (polls REST every 15s as fallback)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface TechnicianInfo {
  id: string;
  name: string;
  mobile: string;
  distance_km?: number;
  lat?: number;
  lng?: number;
}

interface TrackingState {
  status: string;
  technician: TechnicianInfo | null;
  destination: { latitude?: number; longitude?: number; city?: string } | null;
  techLat: number | null;
  techLng: number | null;
}

type Phase = "WAITING" | "ACCEPTED" | "TRACKING" | "NO_TECH" | "DONE";

interface Props {
  bookingId: string;
  bookingNumber: string;
  brand: string;
  onBack?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const WS_BASE  = API_BASE.replace(/^https/, "wss").replace(/^http(?!s)/, "ws").replace("/api/v1", "");

const ACCEPTED_STATUSES = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "INSPECTING", "IN_PROGRESS"];
const MOVING_STATUSES   = ["EN_ROUTE"];
const DONE_STATUSES     = ["COMPLETED", "PAID", "CLOSED", "SETTLED", "CANCELLED"];

function statusToPhase(status: string, tech: TechnicianInfo | null, noTechFlag: boolean): Phase {
  if (DONE_STATUSES.includes(status)) return "DONE";
  if (status === "ASSIGNED" || !ACCEPTED_STATUSES.includes(status)) {
    if (noTechFlag) return "NO_TECH";
    return "WAITING";
  }
  if (!tech) return "WAITING";
  if (MOVING_STATUSES.includes(status)) return "TRACKING";
  return "ACCEPTED";
}

// ── Declare google as ambient to avoid TS errors ──────────────────────────────
declare const google: any;

// ── Component ──────────────────────────────────────────────────────────────────
export default function BookingTracker({ bookingId, bookingNumber, brand, onBack }: Props) {
  const [phase,    setPhase]    = useState<Phase>("WAITING");
  const [tracking, setTracking] = useState<TrackingState>({
    status: "CONFIRMED", technician: null, destination: null, techLat: null, techLng: null,
  });
  const [mapsKey,  setMapsKey]  = useState<string | null>(null);
  const [noTech,   setNoTech]   = useState(false);
  const [wsError,  setWsError]  = useState(false);
  const [mapReady, setMapReady] = useState(false); // true once google.maps is loaded

  const wsRef     = useRef<WebSocket | null>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef    = useRef<HTMLDivElement>(null);
  const gmapRef   = useRef<any>(null);
  const markerRef = useRef<any>(null);
  // Keep a ref to latest tracking so map callbacks always see fresh values
  const trackingRef = useRef<TrackingState>(tracking);
  useEffect(() => { trackingRef.current = tracking; }, [tracking]);

  // ── Fetch Google Maps key ────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/settings/maps/public").then((r) => {
      const key = r.data?.data?.google_maps_api_key;
      if (key) setMapsKey(key);
    }).catch(() => {});
  }, []);

  // ── REST poll for tracking state ─────────────────────────────────────────────
  const fetchTrackingState = useCallback(async () => {
    try {
      const r = await api.get(`/tracking/booking/${bookingId}`);
      const d = r.data?.data;
      if (!d) return;
      const tech: TechnicianInfo | null = d.technician
        ? { id: d.technician.id, name: d.technician.name, mobile: d.technician.mobile }
        : null;
      const dest = d.destination ?? null;
      const loc  = d.current_location;
      setTracking(prev => ({
        status:      d.status ?? prev.status,
        technician:  tech ?? prev.technician,
        destination: dest ?? prev.destination,
        techLat:     loc?.latitude  ?? prev.techLat,
        techLng:     loc?.longitude ?? prev.techLng,
      }));
    } catch {}
  }, [bookingId]);

  useEffect(() => { fetchTrackingState(); }, [fetchTrackingState]);

  // ── Connect WebSocket ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) { setWsError(true); return; }

    const wsUrl = `${WS_BASE}/ws/booking/${bookingId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen  = () => setWsError(false);
    ws.onerror = () => setWsError(true);
    ws.onclose = () => setWsError(true);

    ws.onmessage = (evt) => {
      try {
        const msg  = JSON.parse(evt.data);
        const type = msg.type as string;
        const pl   = msg.payload ?? {};

        if (type === "BOOKING_STATUS_CHANGED") { fetchTrackingState(); }

        if (type === "ASSIGNMENT_ACCEPTED") {
          setTracking(prev => ({ ...prev, status: pl.status ?? prev.status }));
          fetchTrackingState();
        }
        if (type === "ASSIGNMENT_CREATED") {
          setTracking(prev => ({ ...prev, status: pl.status ?? prev.status }));
        }
        if (type === "TECHNICIAN_LOCATION_UPDATE") {
          const lat = pl.latitude  as number | null;
          const lng = pl.longitude as number | null;
          if (lat && lng) {
            setTracking(prev => ({ ...prev, techLat: lat, techLng: lng }));
          }
        }
        if (type === "ASSIGNMENT_REJECTED") {
          setTracking(prev => ({ ...prev, status: pl.status ?? prev.status, technician: null }));
        }
        if (type === "BOOKING_NEEDS_MANUAL_ASSIGN") { setNoTech(true); }
      } catch {}
    };

    return () => { ws.close(); };
  }, [bookingId, fetchTrackingState]);

  // ── REST fallback poll every 15s when WS unavailable ────────────────────────
  useEffect(() => {
    if (!wsError) return;
    pollRef.current = setInterval(fetchTrackingState, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [wsError, fetchTrackingState]);

  // ── Derive phase ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setPhase(statusToPhase(tracking.status, tracking.technician, noTech));
  }, [tracking.status, tracking.technician, noTech]);

  // ── Load Google Maps SDK once key is available ───────────────────────────────
  // We load the SDK early (not waiting for TRACKING phase) so it's ready by the
  // time the map div mounts. We set mapReady=true once google.maps is available.
  useEffect(() => {
    if (!mapsKey || typeof window === "undefined") return;
    const w = window as any;

    if (w.google?.maps) {
      setMapReady(true);
      return;
    }

    const scriptId = "gmap-tracker";
    if (document.getElementById(scriptId)) {
      // Script already injected — poll until ready
      const t = setInterval(() => {
        if (w.google?.maps) { clearInterval(t); setMapReady(true); }
      }, 150);
      return () => clearInterval(t);
    }

    const script = document.createElement("script");
    script.id  = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => console.warn("[BookingTracker] Google Maps failed to load");
    document.head.appendChild(script);
  }, [mapsKey]);

  // ── Initialize the map once: SDK ready + map div mounted + phase=TRACKING ────
  // Using a callback ref on mapRef so we know exactly when the div is in the DOM.
  const onMapDivMount = useCallback((node: HTMLDivElement | null) => {
    (mapRef as any).current = node;
    if (!node || !mapReady) return;
    if (gmapRef.current) return; // already initialized

    const w = window as any;
    const t = trackingRef.current;
    const center = (t.destination?.latitude && t.destination?.longitude)
      ? { lat: t.destination.latitude, lng: t.destination.longitude }
      : (t.techLat && t.techLng)
      ? { lat: t.techLat, lng: t.techLng }
      : { lat: 20.2961, lng: 85.8245 }; // Bhubaneswar fallback

    const map = new w.google.maps.Map(node, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
    });
    gmapRef.current = map;

    // Destination marker
    if (t.destination?.latitude && t.destination?.longitude) {
      new w.google.maps.Marker({
        map,
        position: { lat: t.destination.latitude, lng: t.destination.longitude },
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
        title: "Your address",
      });
    }

    // Technician marker (if location already known)
    if (t.techLat && t.techLng) {
      markerRef.current = new w.google.maps.Marker({
        map,
        position: { lat: t.techLat, lng: t.techLng },
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
          scaledSize: new w.google.maps.Size(40, 40),
        },
        title: t.technician?.name ?? "Technician",
      });
      map.setCenter({ lat: t.techLat, lng: t.techLng });
    }
  }, [mapReady]); // re-run if mapReady changes while div is already mounted

  // ── Move technician marker on location updates ────────────────────────────────
  useEffect(() => {
    if (!gmapRef.current) return;
    if (tracking.techLat == null || tracking.techLng == null) return;
    const w = window as any;
    if (!w.google?.maps) return;

    const pos = { lat: tracking.techLat, lng: tracking.techLng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new w.google.maps.Marker({
        map: gmapRef.current,
        position: pos,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
          scaledSize: new w.google.maps.Size(40, 40),
        },
        title: tracking.technician?.name ?? "Technician",
      });
    }
    gmapRef.current.panTo(pos);
  }, [tracking.techLat, tracking.techLng, tracking.technician]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="p-6 text-center" style={{ background: `${brand}10`, borderBottom: `2px solid ${brand}25` }}>
          <p className="text-sm text-ink-400 mb-1">Booking Number</p>
          <p className="text-2xl font-bold" style={{ color: brand }}>{bookingNumber}</p>
        </div>

        {/* Phase content */}
        <div className="p-6">

          {/* ── WAITING ── */}
          {phase === "WAITING" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl animate-pulse" style={{ background: `${brand}15` }}>🔍</div>
              <h2 className="text-xl font-bold text-ink-900 mb-2">Finding your technician…</h2>
              <p className="text-ink-400 text-sm mb-6">Our system is matching you with the best available technician. This usually takes under 2 minutes.</p>
              <div className="flex justify-center gap-2 mb-6">
                {[0,1,2].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ background: brand, animationDelay: `${i * 0.2}s`, animation: "pulse 1.2s ease-in-out infinite" }} />
                ))}
              </div>
              <p className="text-xs text-ink-300">You'll receive an SMS & WhatsApp notification once assigned. You can safely leave this page.</p>
            </div>
          )}

          {/* ── NO TECH ── */}
          {phase === "NO_TECH" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl" style={{ background: "#FFF7ED" }}>📋</div>
              <h2 className="text-xl font-bold text-ink-900 mb-2">We're on it!</h2>
              <p className="text-ink-400 text-sm mb-6">All technicians are currently busy. Our team will manually assign a technician to your booking and you'll be notified via SMS & WhatsApp.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                ⏰ You'll be contacted within 30 minutes to confirm your appointment.
              </div>
            </div>
          )}

          {/* ── ACCEPTED ── */}
          {phase === "ACCEPTED" && tracking.technician && (
            <div>
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl" style={{ background: "#F0FDF4" }}>✅</div>
                <h2 className="text-xl font-bold text-ink-900 mb-1">Technician Assigned!</h2>
                <p className="text-ink-400 text-sm">Your technician has accepted the booking and will be on their way soon.</p>
              </div>
              <div className="bg-ink-50 rounded-xl p-4 flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                     style={{ background: brand }}>
                  {tracking.technician.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-ink-900 text-lg">{tracking.technician.name}</p>
                  {tracking.technician.distance_km !== undefined && (
                    <p className="text-sm text-ink-400">📍 {tracking.technician.distance_km.toFixed(1)} km away</p>
                  )}
                </div>
                <a href={`tel:${tracking.technician.mobile}`}
                   className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                   style={{ background: "#22C55E" }}>📞</a>
              </div>
              <p className="text-xs text-ink-400 text-center">The map view will appear once your technician starts heading to you.</p>
            </div>
          )}

          {/* ── TRACKING ── */}
          {phase === "TRACKING" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                     style={{ background: brand }}>
                  {tracking.technician?.name.charAt(0).toUpperCase() ?? "T"}
                </div>
                <div>
                  <p className="font-bold text-ink-900">{tracking.technician?.name ?? "Technician"} is on the way</p>
                  {tracking.technician?.mobile && (
                    <a href={`tel:${tracking.technician.mobile}`} className="text-sm" style={{ color: brand }}>
                      📞 {tracking.technician.mobile}
                    </a>
                  )}
                </div>
              </div>

              {/* Map container — always rendered when phase=TRACKING so the ref mounts */}
              {mapsKey ? (
                <>
                  {/* Map div — uses callback ref so we know the exact moment it mounts */}
                  <div
                    ref={onMapDivMount}
                    className="w-full rounded-xl overflow-hidden mb-3"
                    style={{ height: 300 }}
                  />
                  {!tracking.techLat && (
                    <p className="text-xs text-center text-ink-400 mb-3 -mt-1">
                      🛰️ Waiting for technician location…
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-ink-50 rounded-xl p-4 text-center text-sm text-ink-400 mb-3"
                     style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div>
                    <div className="text-3xl mb-2">🗺️</div>
                    <p>Map not available</p>
                    <p className="text-xs mt-1">Configure Google Maps API key in Admin → Settings → Maps</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-ink-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ background: "#F26522" }} />
                Live location updates
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "DONE" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl" style={{ background: "#F0FDF4" }}>🎉</div>
              <h2 className="text-xl font-bold text-ink-900 mb-2">Service Complete!</h2>
              <p className="text-ink-400 text-sm">Thank you for choosing our service. We hope you had a great experience.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {onBack && (
            <button onClick={onBack} className="flex-1 border border-ink-200 text-ink-700 font-semibold py-3 rounded-xl hover:bg-ink-50 transition-colors text-sm">
              My Bookings
            </button>
          )}
          {phase === "WAITING" && (
            <button onClick={fetchTrackingState}
              className="flex-1 font-semibold py-3 rounded-xl text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: brand }}>
              Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
