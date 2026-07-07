// ── Domain types (from backend /api/v1/domains) ──────────────────────────────
export interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  primary_color: string;
  meta_title?: string;
  meta_desc?: string;
  sort_order: number;
  is_active: boolean;
  service_count: number;
  category_count: number;
  created_at: string;
}

export interface DomainSeo {
  id: string;
  domain_id: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  robots?: string;
  schema_json?: string;
}

/** Rich branding / contact / invoice data — from /domains/{id}/profile [Public] */
export interface DomainProfile {
  id: string;
  domain_id: string;
  // media
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  og_image_url?: string;
  banner_url?: string;
  // social
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  whatsapp_number?: string;
  // contact
  support_phone?: string;
  support_email?: string;
  office_address?: string;
  office_city?: string;
  office_state?: string;
  office_pincode?: string;
  office_country?: string;
  google_maps_url?: string;
  // invoice / business
  business_legal_name?: string;
  gstin?: string;
  pan_number?: string;
  invoice_prefix?: string;
  upi_id?: string;
  // about / footer
  tagline?: string;
  about_short?: string;
  copyright_text?: string;
  // ratings (Admin Dashboard → Domain → Profile → Reviews).
  // When absent, pages fall back to a sane generated rating so
  // AggregateRating schema is always present for SEO.
  avg_rating?: number;
  review_count?: number;
}

export interface DomainService {
  domain_service_id: string;
  service_id: string;
  name: string;
  description?: string;
  category_id: string;
  category_name: string;
  base_price: number;
  gst_percent: number;
  duration_mins: number;
  is_featured: boolean;
  is_visible: boolean;
  // Admin-uploaded, domain-specific override image (Domains → Services →
  // [service] → Image, in the Admin Dashboard). Null until an admin sets one.
  image_url?: string | null;
  thumbnail_url?: string | null;
}

export interface DomainCategory {
  domain_category_id: string;
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
}

/** Per-domain, per-service SEO + image + content override.
 *  From /domains/{domainId}/services/{domainServiceId}/override [Public GET] */
export interface DomainServiceOverride {
  id: string | null;
  domain_service_id: string;
  image_url?: string;
  thumbnail_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  includes: string[];
  excludes: string[];
  faqs: { q: string; a: string }[];
}

/** City-wise price override for a service. From /services/{id}/city-prices [Public] */
export interface ServiceCityPrice {
  id: string;
  service_id: string;
  city_id: string;
  city_name: string;
  city_state: string;
  price: number;
  is_available: boolean;
}

export interface City {
  id: string;
  name: string;
  state: string;
  is_active: boolean;
}

// ── Auth types (from backend /api/v1/auth) ────────────────────────────────────
/** Decoded shape of the access token's payload + login response, kept around
 *  client-side so the UI knows who's logged in without re-fetching /profile. */
export interface AuthUser {
  user_id: string;
  role: string;
  name: string;
  mobile: string;
}

export interface VerifyOtpResponseData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: string;
  name: string;
}

// ── Customer types (from backend /api/v1/customers) ───────────────────────────
/** GET/PUT /customers/me [Customer self-service] */
export interface CustomerProfile {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  alternate_mobile?: string | null;
  customer_code?: string | null;
  notes?: string | null;
  total_bookings?: string;
  created_at?: string;
  gst_number?: string | null;
  gst_name?: string | null;
  gst_address?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  alternate_mobile?: string;
  notes?: string;
  gst_number?: string;
  gst_name?: string;
  gst_address?: string;
}

/** GET/POST/PUT /customers/{id}/addresses */
export interface CustomerAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

export interface CustomerAddressInput {
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  location_source?: string; // 'gps' | 'geocoded' | 'manual'
}

// ── Booking types ─────────────────────────────────────────────────────────────
/** Row shape returned by GET /bookings (self-scoped to the logged-in customer) */
export interface Booking {
  id: string;
  booking_number: string;
  status: string;
  priority: string;
  source: string;
  scheduled_date: string | null;
  scheduled_slot: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  service_name: string;
  customer_name: string;
  customer_mobile: string;
  customer_code: string;
  technician_name?: string | null;
  technician_mobile?: string | null;
  appliance_brand?: string | null;
  appliance_model?: string | null;
  notes?: string | null;
  cancelled_reason?: string | null;
  city?: string | null;
  domain_name?: string | null;
  created_at: string;
}

export interface CreateBookingInput {
  service_id: string;
  address_id: string;
  scheduled_date: string;
  scheduled_slot?: string;
  notes?: string;
  appliance_brand?: string;
  appliance_model?: string;
  source?: string;
  domain_id?: string;
  city_id?: string;
  force_duplicate?: boolean;
  coupon_code?: string;
  coupon_id?: string;
  coupon_discount?: number;
  base_amount?: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
}
