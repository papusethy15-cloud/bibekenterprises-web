"use client";

/**
 * MapPickerModal — Uber-style "drop a pin" map picker for the website.
 *
 * Usage:
 *   <MapPickerModal
 *     open={showMap}
 *     onClose={() => setShowMap(false)}
 *     onConfirm={(result) => { /* fill form fields *\/ }}
 *     initialLat={lat}   // optional — falls back to GPS then Bhubaneswar
 *     initialLng={lng}
 *     servicedCities={cities.map(c => c.name)}
 *   />
 *
 * onConfirm receives MapPickerResult with all reverse-geocoded fields.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getGoogleMapsKey } from "@/lib/customer";

export interface MapPickerResult {
  latitude: number;
  longitude: number;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  formatted_address: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: MapPickerResult) => void;
  initialLat?: number;
  initialLng?: number;
  servicedCities?: string[];
}

// Bhubaneswar default
const DEFAULT_LAT = 20.2961;
const DEFAULT_LNG = 85.8245;

declare global {
  interface Window {
    google: any;
    __mapsLoaded?: boolean;
    __mapsLoading?: boolean;
    __mapsCallbacks?: Array<() => void>;
  }
}

/** Load Google Maps JS SDK once — idempotent */
async function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.__mapsLoaded) return;
  if (window.__mapsLoading) {
    return new Promise((resolve) => {
      window.__mapsCallbacks = window.__mapsCallbacks ?? [];
      window.__mapsCallbacks.push(resolve);
    });
  }
  window.__mapsLoading = true;
  window.__mapsCallbacks = [];
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      window.__mapsLoaded = true;
      window.__mapsLoading = false;
      resolve();
      (window.__mapsCallbacks ?? []).forEach((cb) => cb());
      window.__mapsCallbacks = [];
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** Reverse-geocode lat/lng using Google Geocoding REST API (no SDK needed) */
async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string
): Promise<Partial<MapPickerResult>> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return {};
    const comps: any[] = result.address_components ?? [];
    const get = (type: string) =>
      comps.find((c) => c.types.includes(type))?.long_name ?? "";
    const getShort = (type: string) =>
      comps.find((c) => c.types.includes(type))?.short_name ?? "";

    const sublocality =
      get("sublocality_level_1") || get("sublocality") || get("neighborhood");
    const premise = get("premise") || get("establishment");
    const route = get("route");
    const line1 = [premise, sublocality || route].filter(Boolean).join(", ");
    const line2 = sublocality && route ? route : "";

    return {
      address_line1: line1,
      address_line2: line2,
      city: get("locality") || get("administrative_area_level_2"),
      state: get("administrative_area_level_1"),
      pincode: get("postal_code"),
      formatted_address: result.formatted_address ?? "",
    };
  } catch {
    return {};
  }
}

export default function MapPickerModal({
  open,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  servicedCities = [],
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [center, setCenter] = useState({ lat: initialLat ?? DEFAULT_LAT, lng: initialLng ?? DEFAULT_LNG });
  const [preview, setPreview] = useState<Partial<MapPickerResult>>({});
  const [resolving, setResolving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [cityWarning, setCityWarning] = useState("");

  // Load API key once
  useEffect(() => {
    if (!open) return;
    getGoogleMapsKey().then(setApiKey).catch(() => {});
  }, [open]);

  // Auto-detect GPS on open if no initial coords
  useEffect(() => {
    if (!open || initialLat != null) return;
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        // Permission denied or error → keep Bhubaneswar default
        setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [open, initialLat]);

  // Initialize or update map when apiKey + center are ready
  useEffect(() => {
    if (!open || !apiKey || !mapRef.current) return;

    (async () => {
      await loadGoogleMaps(apiKey);

      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });

        // Fixed center pin — listen to camera idle
        map.addListener("idle", () => {
          const c = map.getCenter();
          const lat = c.lat();
          const lng = c.lng();
          setCenter({ lat, lng });

          // Debounce reverse geocode
          if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
          geocodeTimerRef.current = setTimeout(async () => {
            setResolving(true);
            const result = await reverseGeocode(lat, lng, apiKey);
            setPreview({ ...result, latitude: lat, longitude: lng });
            // City warning
            if (result.city && servicedCities.length > 0) {
              const matched = servicedCities.some(
                (c) => c.toLowerCase() === result.city!.toLowerCase()
              );
              setCityWarning(matched ? "" : `'${result.city}' is outside our service area.`);
            } else {
              setCityWarning("");
            }
            setResolving(false);
          }, 600);
        });

        mapInstanceRef.current = map;
        setMapReady(true);

        // Initial reverse geocode
        setResolving(true);
        const init = await reverseGeocode(center.lat, center.lng, apiKey);
        setPreview({ ...init, latitude: center.lat, longitude: center.lng });
        setResolving(false);
      } else {
        // Pan to new center if changed
        mapInstanceRef.current.panTo(center);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiKey, center.lat, center.lng]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      mapInstanceRef.current = null;
      setMapReady(false);
      setPreview({});
      setCityWarning("");
    }
  }, [open]);

  const handleUseCurrentLocation = useCallback(() => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat, lng });
          mapInstanceRef.current.setZoom(17);
        }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleConfirm = () => {
    const result: MapPickerResult = {
      latitude: center.lat,
      longitude: center.lng,
      address_line1: preview.address_line1 ?? "",
      address_line2: preview.address_line2 ?? "",
      city: preview.city ?? "",
      state: preview.state ?? "",
      pincode: preview.pincode ?? "",
      formatted_address: preview.formatted_address ?? "",
    };
    onConfirm(result);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50">
      <div className="relative flex flex-col w-full max-w-lg bg-white shadow-2xl md:my-6 md:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="font-bold text-ink-900 text-base">Drop Pin on Your Location</h3>
            <p className="text-xs text-ink-400 mt-0.5">Move the map to position the pin accurately</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-ink-400 hover:text-ink-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Map container */}
        <div className="relative flex-1 min-h-[340px]">
          {/* GPS loading overlay */}
          {gpsLoading && (
            <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-t-transparent border-brand-500 animate-spin" />
              <p className="text-sm text-ink-600 font-medium">Getting your location…</p>
            </div>
          )}

          {/* Map div */}
          <div ref={mapRef} className="w-full h-full min-h-[340px]" />

          {/* Fixed center pin */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative" style={{ marginTop: "-40px" }}>
              <div className="text-4xl drop-shadow-lg select-none">📍</div>
              <div className="w-2 h-2 bg-orange-500 rounded-full mx-auto -mt-1 opacity-60" />
            </div>
          </div>

          {/* GPS FAB */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={gpsLoading}
            className="absolute bottom-4 right-4 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-brand-600 hover:bg-brand-50 transition disabled:opacity-50 border border-ink-100"
            title="Use current location"
          >
            {gpsLoading ? (
              <span className="w-5 h-5 border-2 border-t-transparent border-brand-500 rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v4m0 12v-4m10-6h-4M6 12H2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>

        {/* Bottom confirm card */}
        <div className="bg-white border-t border-ink-100 px-5 py-4 space-y-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          {/* Address preview */}
          <div className="flex items-start gap-2 min-h-[40px]">
            <span className="text-brand-500 mt-0.5 text-sm shrink-0">📍</span>
            <div className="flex-1">
              {resolving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent border-brand-400 rounded-full animate-spin" />
                  <span className="text-sm text-ink-400">Finding address…</span>
                </div>
              ) : preview.formatted_address ? (
                <p className="text-sm font-medium text-ink-800 leading-snug">{preview.formatted_address}</p>
              ) : (
                <p className="text-sm text-ink-400">Move the map to position the pin</p>
              )}
            </div>
          </div>

          {/* City warning */}
          {cityWarning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-amber-800">
                {cityWarning}{" "}
                {servicedCities.length > 0 && (
                  <span>We serve: {servicedCities.slice(0, 3).join(", ")}{servicedCities.length > 3 ? " & more" : ""}.</span>
                )}
              </p>
            </div>
          )}

          {/* Field preview chips */}
          {(preview.city || preview.pincode) && (
            <div className="flex flex-wrap gap-2">
              {preview.city && (
                <span className="text-xs bg-ink-50 border border-ink-200 rounded-full px-3 py-1 text-ink-600 font-medium">
                  🏙 {preview.city}
                </span>
              )}
              {preview.state && (
                <span className="text-xs bg-ink-50 border border-ink-200 rounded-full px-3 py-1 text-ink-600 font-medium">
                  {preview.state}
                </span>
              )}
              {preview.pincode && (
                <span className="text-xs bg-ink-50 border border-ink-200 rounded-full px-3 py-1 text-ink-600 font-medium">
                  📮 {preview.pincode}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={resolving}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            ✓ Confirm This Location
          </button>
        </div>
      </div>
    </div>
  );
}
