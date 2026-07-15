/**
 * customer.ts — All client-side API calls for the logged-in customer.
 */
import { api } from "./api";
import { CustomerAddress, CustomerAddressInput, Booking, CreateBookingInput } from "@/types";
import { DOMAIN_ID } from "./config";

// ── Addresses ────────────────────────────────────────────────────────────────
export async function getAddresses(_customerId: string): Promise<CustomerAddress[]> {
  // Use self-service endpoint so the JWT user_id check is always satisfied
  const res = await api.get(`/customers/me/addresses`);
  return res.data?.data ?? [];
}
export async function addAddress(_customerId: string, payload: CustomerAddressInput) {
  const res = await api.post(`/customers/me/addresses`, payload);
  return res.data.data;
}
export async function updateAddress(_customerId: string, addressId: string, payload: CustomerAddressInput) {
  await api.put(`/customers/me/addresses/${addressId}`, payload);
}
export async function deleteAddress(_customerId: string, addressId: string) {
  await api.delete(`/customers/me/addresses/${addressId}`);
}
export async function geocodeAndUpdateAddresses(customerId: string, addresses: CustomerAddress[]) {
  // For each address missing lat/lng, attempt browser Geolocation or Geocoding API
  // This is a best-effort update — never blocks the UI
  for (const addr of addresses) {
    if (addr.latitude && addr.longitude) continue;
    try {
      const q = [addr.address_line1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
      const mapsKey = await getGoogleMapsKey();
      if (!mapsKey) return;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${mapsKey}`
      );
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        await updateAddress(customerId, addr.id, {
          label: addr.label, address_line1: addr.address_line1,
          address_line2: addr.address_line2 ?? "", city: addr.city,
          state: addr.state, pincode: addr.pincode, is_default: addr.is_default,
          latitude: lat, longitude: lng,
        });
      }
    } catch {}
  }
}

// ── Bookings ─────────────────────────────────────────────────────────────────
export interface BookingListResult { items: Booking[]; total: number; page: number; pages: number; }
export async function getMyBookings(params?: { status?: string; page?: number; per_page?: number; search?: string }): Promise<BookingListResult> {
  const res = await api.get("/bookings", { params });
  return res.data?.data ?? { items: [], total: 0, page: 1, pages: 1 };
}
export async function getBookingById(id: string): Promise<any> {
  const res = await api.get(`/bookings/${id}`);
  return res.data?.data;
}
export async function createBooking(payload: CreateBookingInput): Promise<{ id: string; booking_number: string }> {
  const res = await api.post("/bookings", payload);
  return res.data.data;
}
export async function cancelBooking(id: string, reason: string): Promise<void> {
  await api.post(`/bookings/${id}/cancel`, { reason });
}
export async function requestCancelBooking(id: string, reason: string): Promise<void> {
  // Sends cancellation request to admin instead of immediate cancel
  await api.post(`/bookings/${id}/cancel`, { reason, requested_by_customer: true });
}
export async function applyCouponToBooking(bookingId: string, couponCode: string): Promise<any> {
  const res = await api.post(`/bookings/${bookingId}/apply-coupon`, { coupon_code: couponCode });
  return res.data?.data;
}

// ── Quotations ────────────────────────────────────────────────────────────────
export async function getBookingQuotations(bookingId: string): Promise<any[]> {
  const res = await api.get("/quotations", { params: { booking_id: bookingId, per_page: 10 } });
  return res.data?.data?.items ?? [];
}
export async function getQuotationDetails(quotationId: string): Promise<any> {
  const res = await api.get(`/quotations/${quotationId}`);
  return res.data?.data;
}
export async function getQuotationItems(quotationId: string): Promise<any> {
  const res = await api.get(`/quotations/${quotationId}/items`);
  return res.data?.data;
}

export async function approveQuotation(quotationId: string): Promise<void> {
  await api.post(`/quotations/${quotationId}/approve`, { notes: "Approved by customer" });
}
export async function rejectQuotation(quotationId: string, reason: string): Promise<void> {
  await api.post(`/quotations/${quotationId}/reject`, { notes: reason });
}

// ── Invoices ─────────────────────────────────────────────────────────────────
export async function getBookingInvoices(bookingId: string): Promise<any[]> {
  const res = await api.get("/invoices", { params: { booking_id: bookingId } });
  return res.data?.data?.items ?? [];
}
export async function getInvoiceDetails(invoiceId: string): Promise<any> {
  const res = await api.get(`/invoices/${invoiceId}`);
  return res.data?.data;
}
export async function downloadInvoicePdf(invoiceId: string, invoiceNumber?: string): Promise<void> {
  // Fetch with auth header (the endpoint requires authentication)
  const response = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber ?? invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Payments ─────────────────────────────────────────────────────────────────
export async function createPaymentOrder(invoiceId: string, amount?: number): Promise<any> {
  const res = await api.post("/payments/create-order", { invoice_id: invoiceId, amount });
  return res.data?.data;
}
export async function verifyPayment(transactionId: string, providerId: string, signature: string): Promise<any> {
  const res = await api.post("/payments/verify", {
    transaction_id: transactionId, provider_payment_id: providerId, provider_signature: signature,
  });
  return res.data?.data;
}

// ── Coupons ───────────────────────────────────────────────────────────────────
export async function validateCoupon(
  code: string,
  orderAmount: number,
  opts?: {
    customerMobile?: string;
    serviceIds?: string[];
    categoryIds?: string[];
  }
): Promise<any> {
  const res = await api.post("/coupons/validate", {
    code,
    order_amount: orderAmount,
    domain_id: DOMAIN_ID || undefined,
    customer_mobile: opts?.customerMobile || undefined,
    service_ids: opts?.serviceIds?.length ? opts.serviceIds : undefined,
    category_ids: opts?.categoryIds?.length ? opts.categoryIds : undefined,
  });
  return res.data?.data;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function getNotifications(page = 1, perPage = 20): Promise<any> {
  const res = await api.get("/notifications", { params: { page, per_page: perPage } });
  return res.data?.data ?? { items: [], total: 0, unread: 0 };
}
export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}
export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
export async function registerPushToken(token: string): Promise<void> {
  await api.post("/notifications/register-push-token", { token, platform: "web" });
}

// ── Settings (public) ─────────────────────────────────────────────────────────
let _mapsKey: string | null = null;
export async function getGoogleMapsKey(): Promise<string | null> {
  if (_mapsKey) return _mapsKey;
  try {
    const res = await api.get("/settings/maps/public");
    _mapsKey = res.data?.data?.google_maps_api_key ?? null;
    return _mapsKey;
  } catch { return null; }
}
export async function getRazorpayKey(): Promise<string | null> {
  try {
    const res = await api.get("/settings/payment/public");
    return res.data?.data?.razorpay_key_id ?? null;
  } catch { return null; }
}

// ── Appliances ────────────────────────────────────────────────────────────────
export async function getMyAppliances(): Promise<any[]> {
  try {
    const res = await api.get("/appliances/me");
    return res.data?.data ?? [];
  } catch { return []; }
}
export async function addMyAppliance(payload: {
  brand_id?: string; type_id?: string; appliance_category_id?: string;
  category?: string; model?: string; serial_number?: string; notes?: string;
}): Promise<any> {
  const res = await api.post("/appliances/me", payload);
  return res.data?.data;
}
