"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { City } from "@/types";
import CitySelectModal from "../app/CitySelectModal";

const STORAGE_KEY = "selected_city";

interface CityContextValue {
  cities: City[];
  selectedCity: City | null;
  setSelectedCity: (city: City) => void;
  openCityModal: () => void;
}

const CityContext = createContext<CityContextValue | null>(null);

interface Props {
  cities: City[];
  brand: string;
  children: React.ReactNode;
}

export default function CityProvider({ cities, brand, children }: Props) {
  const [selectedCity, setSelectedCityState] = useState<City | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // On mount: check localStorage for a previously saved city for this site.
  // If none is saved, open the city-select modal so the customer picks one.
  useEffect(() => {
    setHydrated(true);
    if (!cities.length) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as City;
        // Keep the saved city even if it temporarily falls outside the
        // domain-scoped list (e.g. cache lag) — only re-prompt if missing.
        setSelectedCityState(saved);
        return;
      }
    } catch {
      // Corrupted localStorage value — fall through to showing the modal.
    }
    setShowModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.length]);

  const setSelectedCity = useCallback((city: City) => {
    setSelectedCityState(city);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
    } catch {
      // localStorage unavailable (private browsing etc.) — selection still
      // works for this page load via React state.
    }
    setShowModal(false);
  }, []);

  const openCityModal = useCallback(() => setShowModal(true), []);
  const closeCityModal = useCallback(() => setShowModal(false), []);

  return (
    <CityContext.Provider value={{ cities, selectedCity, setSelectedCity, openCityModal }}>
      {children}
      {hydrated && showModal && cities.length > 0 && (
        <CitySelectModal
          cities={cities}
          brand={brand}
          onSelect={setSelectedCity}
          // Only offer a close (X) button once a city is already saved —
          // first-time visitors must pick one so pricing is accurate.
          onClose={selectedCity ? closeCityModal : undefined}
        />
      )}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) {
    // Defensive fallback so a component used outside the provider (e.g. in
    // isolated tests) doesn't crash — behaves as "no city selected".
    return { cities: [], selectedCity: null, setSelectedCity: () => {}, openCityModal: () => {} };
  }
  return ctx;
}
