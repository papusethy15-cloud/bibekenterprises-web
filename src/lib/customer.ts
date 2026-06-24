/**
 * customer.ts — Client-side calls for the logged-in customer's own data:
 * saved addresses, booking history, and (later) quotations/invoices/payments.
 *
 * All routes here require auth (the `api` interceptor in lib/api.ts attaches
 * the bearer token automatically) and are self-scoped server-side — a
 * CUSTOMER-role user can only ever see/touch their own rows, enforced by the
 * backend (see app/api/v1/routes/customers.py's _get_or_404_owned_customer).
 */
import { api } from "./api";
import { CustomerAddress, CustomerAddressInput, Booking, CreateBookingInput } from "@/types";

// ── Addresses ───────────────────────────────────────────────────────────────
export async function getAddresses(customerId: string): Promise<CustomerAddress[]> {
  const res = await api.get(`/customers/${customerId}/addresses`);
  return res.data?.data ?? [];
}

export async function addAddress(customerId: string, payload: CustomerAddressInput): Promise<{ id: string }> {
  const res = await api.post(`/customers/${customerId}/addresses`, payload);
  return res.data.data;
}

export async function updateAddress(customerId: string, addressId: string, payload: CustomerAddressInput): Promise<void> {
  await api.put(`/customers/${customerId}/addresses/${addressId}`, payload);
}

export async function deleteAddress(customerId: string, addressId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/addresses/${addressId}`);
}

// ── Bookings (self-scoped — backend filters to the logged-in customer) ────────
export interface BookingListResult {
  items: Booking[];
  total: number;
  page: number;
  pages: number;
}

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
