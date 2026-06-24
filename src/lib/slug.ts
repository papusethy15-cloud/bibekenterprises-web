/**
 * slug.ts — SEO-friendly URL slugs for service detail pages.
 *
 * Service detail pages used to live at /services/{domain_service_id}, a raw
 * UUID with zero SEO value. This derives a clean, keyword-rich slug from the
 * service name instead, e.g. "Air Conditioner Repair" -> "air-conditioner-repair".
 *
 * Note: slugs are derived purely from the service name (no DB column), so two
 * services sharing an identical name would collide on the same slug. That's
 * an acceptable trade-off for a curated service catalog like this one; if it
 * ever becomes a real issue, the fix is a dedicated `slug` column in the
 * `services` table rather than disambiguating client-side.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Canonical, SEO-friendly path for a service's detail page. */
export function serviceHref(service: { name: string }): string {
  return `/services/${slugify(service.name)}`;
}
