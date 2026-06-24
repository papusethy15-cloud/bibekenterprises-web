"use client";

import { useCity } from "@/context/CityContext";

/** Small navbar control showing the customer's saved city.
 *  Clicking it reopens the city-select modal so they can change it. */
export default function CityPicker() {
  const { selectedCity, cities, openCityModal } = useCity();

  // Nothing to show until cities are linked to this domain in the Admin Dashboard.
  if (!cities.length) return null;

  return (
    <button
      onClick={openCityModal}
      className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand-600 transition-colors"
      title="Change your city"
    >
      <span>📍</span>
      {selectedCity ? selectedCity.name : "Select City"}
      <span className="text-xs text-ink-300">▾</span>
    </button>
  );
}
