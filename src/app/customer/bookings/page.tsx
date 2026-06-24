"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as customerLib from "@/lib/customer";
import { Booking } from "@/types";

// ── Status display mapping ────────────────────────────────────────────────────
// Internal admin/settlement statuses (PAID, CLOSED, SETTLED, INVOICE_GENERATED,
// PAYMENT_PENDING) are implementation details of the technician commission
// workflow. Customers should see these as "COMPLETED" — their service is done.
const CUSTOMER_STATUS_MAP: Record<string, string> = {
  PAID:               "COMPLETED",
  CLOSED:             "COMPLETED",
  SETTLED:            "COMPLETED",
  INVOICE_GENERATED:  "COMPLETED",
  PAYMENT_PENDING:    "COMPLETED",
};

function toCustomerStatus(rawStatus: string): string {
  return CUSTOMER_STATUS_MAP[rawStatus] ?? rawStatus;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING:     { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-400",  label: "Pending" },
  CONFIRMED:   { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Confirmed" },
  ASSIGNED:    { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  label: "Technician Assigned" },
  ACCEPTED:    { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500",  label: "Technician Accepted" },
  EN_ROUTE:    { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-500",    label: "On the Way" },
  ARRIVED:     { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500",    label: "Technician Arrived" },
  INSPECTING:  { bg: "bg-orange-50",  text: "text-orange-600",  dot: "bg-orange-400",  label: "Inspecting" },
  IN_PROGRESS: { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500",  label: "Work in Progress" },
  COMPLETED:   { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",   label: "Completed" },
  CANCELLED:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400",     label: "Cancelled" },
  RESCHEDULED: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Rescheduled" },
};

function StatusBadge({ rawStatus }: { rawStatus: string }) {
  const displayStatus = toCustomerStatus(rawStatus);
  const s = STATUS_STYLES[displayStatus] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: displayStatus.replace(/_/g, " ") };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// Customer-facing filter tabs — only show statuses that are meaningful to customers.
// "COMPLETED" tab will match all terminal states (PAID, CLOSED, SETTLED, etc.)
const FILTERS = ["ALL", "PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

// When fetching for a customer filter, map back to raw API statuses.
// "COMPLETED" in customer view = COMPLETED + PAID + CLOSED + SETTLED + INVOICE_GENERATED + PAYMENT_PENDING
function filterToApiStatuses(customerFilter: string): string | string[] | undefined {
  if (customerFilter === "ALL") return undefined;
  if (customerFilter === "COMPLETED") return ["COMPLETED", "PAID", "CLOSED", "SETTLED", "INVOICE_GENERATED", "PAYMENT_PENDING"];
  if (customerFilter === "IN_PROGRESS") return ["IN_PROGRESS", "WORK_PAUSED", "WORK_STARTED"];
  if (customerFilter === "ASSIGNED") return ["ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "INSPECTING"];
  return customerFilter;
}

export default function MyBookingsPage() {
  const { isLoggedIn, user } = useAuth();

  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [filter,     setFilter]     = useState("ALL");
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async (p = 1, customerFilter = filter) => {
    setLoading(true);
    try {
      const apiStatus = filterToApiStatuses(customerFilter);
      // If apiStatus is an array (multi-status mapping), send comma-joined as status param
      // Backend /bookings supports single status= param; for multi-status, fetch all and filter client-side.
      // Simple approach: no status param for COMPLETED filter — backend returns all, we filter client-side.
      const params: any = { page: p, per_page: 10 };
      if (typeof apiStatus === "string") {
        params.status = apiStatus;
      }
      // For array statuses (COMPLETED/IN_PROGRESS/ASSIGNED groups) — fetch without status filter,
      // get more results, and filter client-side.
      if (Array.isArray(apiStatus)) {
        params.per_page = 50; // fetch more, filter locally
      }

      const result = await customerLib.getMyBookings(params);
      let items: Booking[] = result.items ?? [];

      // Client-side filter for multi-status groups
      if (Array.isArray(apiStatus)) {
        items = items.filter((b) => apiStatus.includes(b.status));
      }

      setBookings(items);
      setTotal(Array.isArray(apiStatus) ? items.length : result.total);
      setPages(Array.isArray(apiStatus) ? 1 : result.pages);
      setPage(p);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fire whenever user identity changes (session isolation fix)
  useEffect(() => {
    if (!isLoggedIn || !user?.user_id) {
      setBookings([]);
      setTotal(0);
      setPage(1);
      setPages(1);
      setFilter("ALL");
      return;
    }
    setFilter("ALL");
    setPage(1);
    fetchBookings(1, "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.user_id]);

  // Separate effect for filter changes
  useEffect(() => {
    if (!isLoggedIn || !user?.user_id) return;
    fetchBookings(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      await customerLib.cancelBooking(id, "Cancelled by customer");
      fetchBookings(page, filter);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not cancel booking.");
    } finally {
      setCancelling(null);
    }
  };

  // A booking can be cancelled only while it is still active (not yet done or already cancelled)
  const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "INSPECTING", "IN_PROGRESS", "WORK_PAUSED", "RESCHEDULED"];
  const canCancel = (status: string) => ACTIVE_STATUSES.includes(status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">
          My Bookings <span className="text-ink-400 font-normal text-base">({total})</span>
        </h2>
        <Link
          href="/booking"
          className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors"
        >
          + New Booking
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink-600 border-ink-200 hover:border-ink-400"
            }`}
          >
            {f === "IN_PROGRESS" ? "In Progress" : f === "ALL" ? "All" : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-brand-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-ink-700 font-semibold mb-1">No bookings found</p>
          <p className="text-ink-400 text-sm mb-5">
            {filter === "ALL"
              ? "You haven't made any bookings yet."
              : `No ${filter.toLowerCase().replace(/_/g, " ")} bookings.`}
          </p>
          <Link
            href="/booking"
            className="inline-block text-sm font-semibold text-white px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Book a Service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const customerStatus = toCustomerStatus(b.status);
            const dateStr = b.scheduled_date
              ? new Date(b.scheduled_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—";
            const isCompleted = customerStatus === "COMPLETED";
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-ink-900 text-sm">{b.service_name}</span>
                      <StatusBadge rawStatus={b.status} />
                    </div>
                    <p className="text-xs text-ink-400 font-mono">{b.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink-900">₹{b.total_amount}</p>
                    <p className="text-xs text-ink-400">{dateStr}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-ink-500">
                  {b.scheduled_slot && b.scheduled_slot !== "—" && (
                    <span>🕐 {b.scheduled_slot}</span>
                  )}
                  {b.technician_name && (
                    <span>👷 {b.technician_name}</span>
                  )}
                  {b.appliance_brand && (
                    <span>🔧 {b.appliance_brand}{b.appliance_model ? ` ${b.appliance_model}` : ""}</span>
                  )}
                </div>

                {/* Completed confirmation message */}
                {isCompleted && (
                  <div className="mt-3 pt-3 border-t border-ink-100 flex items-center gap-2 text-xs text-green-700">
                    <span>✅</span>
                    <span>Service completed. Thank you for choosing us!</span>
                  </div>
                )}

                {/* Cancel button — only for active bookings */}
                {canCancel(b.status) && (
                  <div className="mt-3 pt-3 border-t border-ink-100 flex justify-end">
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {cancelling === b.id ? "Cancelling…" : "Cancel Booking"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchBookings(p, filter)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                page === p
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-ink-200 text-ink-600 hover:border-ink-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
