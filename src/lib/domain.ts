/**
 * domain.ts — Server-side domain resolution (SSR / ISR)
 *
 * Uses API_URL from config.ts as the single source of truth.
 * Both local dev (http://localhost:8000/api/v1) and production
 * (https://api.bibekenterprises.com/api/v1) are handled automatically
 * via NEXT_PUBLIC_API_URL in the appropriate .env file.
 *
 * Flow:
 *   1. Each domain's frontend is deployed as its own Next.js instance.
 *   2. DOMAIN_SLUG / DOMAIN_ID from config.ts identify the domain row.
 *   3. On every request the server calls the backend to fetch:
 *        - Domain metadata    (name, logo_url, primary_color …)
 *        - Domain SEO data    (meta_title, og_image_url, schema_json …)
 *        - Domain profile     (logo/favicon/banner, social, contact, about)
 *        - Domain services    (only services linked to this domain)
 *        - Domain categories
 *   4. The data is passed as props / read directly inside Server Components —
 *      no client-side waterfall, fully SSR'd for SEO.
 *
 * All fetches use Next's `fetch` with `next: { revalidate }` (ISR) so pages
 * stay fast while picking up Admin Dashboard changes within the window below.
 */

import {
  Domain,
  DomainSeo,
  DomainService,
  DomainCategory,
  DomainProfile,
  DomainServiceOverride,
  ServiceCityPrice,
  City,
} from "@/types";
import { slugify } from "@/lib/slug";
import { API_URL, DOMAIN_SLUG, DOMAIN_ID } from "@/lib/config";

// Revalidate window (seconds) — Admin Dashboard edits show up within this time.
const REVALIDATE = 60;

// ── internal fetch helper ─────────────────────────────────────────────────────
async function apiFetch<T>(path: string, revalidate: number = REVALIDATE): Promise<T | null> {
  // During local `npm run build` the backend is typically not running.
  // Skip the fetch silently — pages render with null/empty fallbacks,
  // which is fine because data is fetched fresh at request time (ISR/SSR).
  if (process.env.NEXT_PHASE === "phase-production-build" && process.env.SKIP_API_DURING_BUILD === "true") {
    return null;
  }
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    // Backend unreachable at build time — return null, page uses fallback content.
    // Data will be populated correctly at runtime via ISR.
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Resolve the domain object — direct ID lookup when available (1 call),
 *  otherwise falls back to listing all domains and matching by slug. */
export async function getDomainBySlug(): Promise<Domain | null> {
  if (DOMAIN_ID) {
    const direct = await apiFetch<Domain>(`/domains/${DOMAIN_ID}`);
    if (direct) return direct;
  }
  const list = await apiFetch<{ items: Domain[] }>("/domains");
  if (!list?.items) return null;
  return list.items.find((d) => d.slug === DOMAIN_SLUG) ?? null;
}

/** Fetch SEO data for a domain (meta tags, OG tags, JSON-LD schema). */
export async function getDomainSeo(domainId: string): Promise<DomainSeo | null> {
  return apiFetch<DomainSeo>(`/domains/${domainId}/seo`);
}

/** Fetch rich branding/contact/about data for a domain. */
export async function getDomainProfile(domainId: string): Promise<DomainProfile | null> {
  return apiFetch<DomainProfile>(`/domains/${domainId}/profile`);
}

/** Fetch only the services linked to this domain. */
export async function getDomainServices(domainId: string): Promise<DomainService[]> {
  const data = await apiFetch<DomainService[]>(`/domains/${domainId}/services`);
  return data ?? [];
}

/** Fetch only the categories linked to this domain. */
export async function getDomainCategories(domainId: string): Promise<DomainCategory[]> {
  const data = await apiFetch<DomainCategory[]>(`/domains/${domainId}/categories`);
  return data ?? [];
}

/** Fetch the per-domain SEO/image/content override for one linked service. */
export async function getDomainServiceOverride(
  domainId: string,
  domainServiceId: string
): Promise<DomainServiceOverride | null> {
  return apiFetch<DomainServiceOverride>(
    `/domains/${domainId}/services/${domainServiceId}/override`
  );
}

/** Fetch city-wise price overrides for a service. Falls back to [] (use base_price). */
export async function getServiceCityPrices(serviceId: string): Promise<ServiceCityPrice[]> {
  const data = await apiFetch<ServiceCityPrice[]>(`/services/${serviceId}/city-prices`);
  return data ?? [];
}

/** Fetch all active cities (for the city picker). Not domain-scoped —
 *  prefer getDomainCities() so the site only offers cities the domain serves. */
export async function getCities(): Promise<City[]> {
  const data = await apiFetch<City[]>("/cities", 300);
  return data ?? [];
}

/** Fetch only the cities linked to this domain (website city scoping).
 *  The homepage city-select modal and per-service pricing both use this
 *  instead of getCities() so customers never pick/see a city this domain
 *  doesn't actually serve. */
export async function getDomainCities(domainId: string): Promise<City[]> {
  const data = await apiFetch<any[]>(`/domains/${domainId}/cities`, 300);
  if (!data) return [];
  return data.map((c) => ({
    id: c.city_id,
    name: c.name,
    state: c.state,
    is_active: c.is_serviceable !== false,
  }));
}

/** Resolve the effective price for a service in a given city.
 *  Falls back to base_price when no override exists for that city. */
export function resolveCityPrice(
  basePrice: number,
  cityPrices: ServiceCityPrice[],
  cityName?: string
): { price: number; isOverride: boolean; isAvailable: boolean } {
  if (!cityName) return { price: basePrice, isOverride: false, isAvailable: true };
  const match = cityPrices.find(
    (c) => c.city_name.toLowerCase() === cityName.toLowerCase()
  );
  if (!match) return { price: basePrice, isOverride: false, isAvailable: true };
  return { price: match.price, isOverride: true, isAvailable: match.is_available };
}

/** Convenience: fetch everything needed to render the homepage in one go. */
export interface DomainPageData {
  domain: Domain;
  seo: DomainSeo | null;
  profile: DomainProfile | null;
  services: DomainService[];
  categories: DomainCategory[];
  cities: City[];
}

export async function getDomainPageData(): Promise<DomainPageData | null> {
  const domain = await getDomainBySlug();
  if (!domain) return null;

  const [seo, profile, services, categories, cities] = await Promise.all([
    getDomainSeo(domain.id),
    getDomainProfile(domain.id),
    getDomainServices(domain.id),
    getDomainCategories(domain.id),
    getDomainCities(domain.id),
  ]);

  return { domain, seo, profile, services, categories, cities };
}

/** Convenience: fetch everything needed to render a single service detail page. */
export interface ServicePageData {
  domain: Domain;
  profile: DomainProfile | null;
  service: DomainService;
  override: DomainServiceOverride | null;
  cityPrices: ServiceCityPrice[];
  cities: City[];
}

export async function getServicePageData(
  slugOrId: string
): Promise<ServicePageData | null> {
  const domain = await getDomainBySlug();
  if (!domain) return null;

  const services = await getDomainServices(domain.id);
  // Primary lookup: SEO-friendly slug derived from the service name.
  // Fallback: legacy /services/{domain_service_id} links (old bookmarks,
  // shared URLs) still resolve — the page itself redirects these to the
  // canonical slug URL once resolved, so the slug becomes authoritative.
  const service =
    services.find((s) => slugify(s.name) === slugOrId) ??
    services.find((s) => s.domain_service_id === slugOrId);
  if (!service) return null;

  const [profile, override, cityPrices, cities] = await Promise.all([
    getDomainProfile(domain.id),
    getDomainServiceOverride(domain.id, service.domain_service_id),
    getServiceCityPrices(service.service_id),
    getDomainCities(domain.id),
  ]);

  return { domain, profile, service, override, cityPrices, cities };
}
