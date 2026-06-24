/**
 * icons.ts — category -> emoji icon mapping.
 *
 * Shared between the homepage Services section and the service detail page
 * so both fall back to the same icon when a category has none configured
 * and/or a service has no admin-uploaded image yet.
 */
const CATEGORY_ICONS: Record<string, string> = {
  "AC Services": "❄️",
  "Air Conditioner": "❄️",
  Refrigeration: "🧊",
  Laundry: "🫧",
  "Water Heating": "🔥",
  Kitchen: "📡",
  Water: "💧",
  Cooling: "💨",
  Electrical: "⚡",
};

export function iconFor(cat: string, icon?: string): string {
  if (icon) return icon;
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "🔧";
}
