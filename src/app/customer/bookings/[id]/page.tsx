"use client";

/**
 * /customer/bookings/[id]
 * ═══════════════════════
 * Full booking detail page for customers. Sections:
 *   1. Status header + live tracking button (EN_ROUTE)
 *   2. Timeline / status history
 *   3. Quotation card (if any) — customer can APPROVE or REJECT
 *   4. Invoice card (if any) — with online payment via Razorpay
 *   5. Apply coupon (active bookings only)
 *   6. Cancel booking with reason modal (sends to admin)
 */

import { fmtDateIST, fmtDateTimeIST, relativeTimeIST, todayIST } from "@/lib/tz";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as customerLib from "@/lib/customer";
import BookingTracker from "@/components/BookingTracker";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BookingDetail {
  id: string;
  booking_number: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_slot: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  discount_amount?: number;
  coupon_code?: string | null;
  service_name: string;
  customer_name: string;
  customer_mobile: string;
  technician_name?: string | null;
  technician_mobile?: string | null;
  appliance_brand?: string | null;
  appliance_model?: string | null;
  notes?: string | null;
  cancelled_reason?: string | null;
  city?: string | null;
  address?: string | null;
  created_at: string;
  domain_name?: string | null;
}

// ── Status helpers ────────────────────────────────────────────────────────────
const CUSTOMER_STATUS_MAP: Record<string, string> = {
  PAID: "COMPLETED", CLOSED: "COMPLETED", SETTLED: "COMPLETED",
  INVOICE_GENERATED: "COMPLETED", PAYMENT_PENDING: "COMPLETED",
};
function toCustomerStatus(s: string) { return CUSTOMER_STATUS_MAP[s] ?? s; }

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING:     { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-400",  label: "Pending" },
  CONFIRMED:   { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Confirmed" },
  ASSIGNED:    { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  label: "Technician Assigned" },
  ACCEPTED:    { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500",  label: "Technician Accepted" },
  EN_ROUTE:    { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-500",    label: "On the Way" },
  ARRIVED:     { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500",    label: "Arrived" },
  INSPECTING:  { bg: "bg-orange-50",  text: "text-orange-600",  dot: "bg-orange-400",  label: "Inspecting" },
  IN_PROGRESS: { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500",  label: "Work in Progress" },
  COMPLETED:   { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",   label: "Completed" },
  CANCELLED:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400",     label: "Cancelled" },
  RESCHEDULED: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-orange-400",  label: "Rescheduled" },
};

function StatusBadge({ rawStatus }: { rawStatus: string }) {
  const display = toCustomerStatus(rawStatus);
  const s = STATUS_STYLES[display] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: display.replace(/_/g, " ") };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Quotation Status ──────────────────────────────────────────────────────────
const Q_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: "Draft",    color: "text-gray-500" },
  SUBMITTED:{ label: "Awaiting Your Approval", color: "text-blue-600" },
  APPROVED: { label: "Approved", color: "text-green-600" },
  REJECTED: { label: "Rejected", color: "text-red-500" },
  REVISED:  { label: "Revised",  color: "text-orange-500" },
};

// ── Cancel Modal ──────────────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const PRESETS = ["Scheduled at wrong time", "Found another service provider", "Problem resolved on its own", "Other"];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-ink-900">Request Cancellation</h3>
        <p className="text-sm text-ink-500">Your cancellation request will be sent to our team for review. We may contact you before processing.</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p} onClick={() => setReason(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${reason === p ? "bg-brand-600 text-white border-brand-600" : "border-ink-200 text-ink-600 hover:border-ink-400"}`}>
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Tell us why you'd like to cancel…"
          rows={3}
          className="w-full border border-ink-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors">
            Keep Booking
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Requesting…" : "Request Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coupon Modal ──────────────────────────────────────────────────────────────
function CouponModal({ bookingId, bookingAmount, onApplied, onClose }: {
  bookingId: string;
  bookingAmount: number;
  onApplied: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await customerLib.validateCoupon(code.trim().toUpperCase(), bookingAmount);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Invalid coupon code.");
    } finally { setLoading(false); }
  };

  const apply = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await customerLib.applyCouponToBooking(bookingId, code.trim().toUpperCase());
      onApplied();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not apply coupon.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-ink-900">Apply Coupon</h3>
        <div className="flex gap-2">
          <input
            value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); setError(""); }}
            placeholder="Enter coupon code"
            className="flex-1 border border-ink-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 uppercase"
          />
          <button onClick={validate} disabled={!code.trim() || loading}
            className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading ? "…" : "Check"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
            <p className="text-green-700 font-semibold text-sm">✅ {result.coupon_name ?? code}</p>
            <p className="text-green-600 text-sm">Discount: ₹{Math.round(result.discount_amount ?? 0).toString()}</p>
            {result.description && <p className="text-green-600 text-xs">{result.description}</p>}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors">Cancel</button>
          {result && (
            <button onClick={apply} disabled={loading}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {loading ? "Applying…" : "Apply Discount"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quotation Card ─────────────────────────────────────────────────────────────
function QuotationCard({ bookingId, bookingStatus, onUpdate }: {
  bookingId: string;
  bookingStatus: string;
  onUpdate: () => void;
}) {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  // Map of quotation id → full detail (with services+parts) once fetched
  const [details, setDetails] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    customerLib.getBookingQuotations(bookingId)
      .then(setQuotations)
      .finally(() => setLoading(false));
  }, [bookingId]);

  /** Fetch full detail (with line items) for a quotation, lazily on expand */
  const fetchDetail = async (qId: string) => {
    if (details[qId] || detailLoading[qId]) return;
    setDetailLoading(prev => ({ ...prev, [qId]: true }));
    try {
      const detail = await customerLib.getQuotationDetails(qId);
      setDetails(prev => ({ ...prev, [qId]: detail }));
    } catch { /* silent — summary still visible */ }
    finally { setDetailLoading(prev => ({ ...prev, [qId]: false })); }
  };

  const handleToggle = (qId: string) => {
    const isOpen = expanded === qId;
    if (!isOpen) fetchDetail(qId);
    setExpanded(isOpen ? null : qId);
  };

  const act = async (qId: string, action: "approve" | "reject") => {
    setActing(qId + action);
    try {
      if (action === "approve") {
        await customerLib.approveQuotation(qId);
      } else {
        const reason = prompt("Reason for rejection (optional):");
        await customerLib.rejectQuotation(qId, reason ?? "Rejected by customer");
      }
      const updated = await customerLib.getBookingQuotations(bookingId);
      setQuotations(updated);
      onUpdate();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? `Could not ${action} quotation.`);
    } finally { setActing(null); }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-ink-100 p-5">
      <div className="h-4 bg-ink-100 rounded animate-pulse w-32 mb-3" />
      <div className="h-20 bg-ink-50 rounded-xl animate-pulse" />
    </div>
  );

  if (!quotations.length) return null;

  const sorted = [...quotations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
        <span className="text-lg">📋</span>
        <h3 className="font-bold text-ink-900">Quotation{quotations.length > 1 ? "s" : ""}</h3>
        <span className="text-xs text-ink-400 ml-auto">{quotations.length} quotation{quotations.length > 1 ? "s" : ""}</span>
      </div>

      <div className="divide-y divide-ink-50">
        {sorted.map((q) => {
          const isOpen = expanded === q.id;
          const qs = Q_STATUS[q.status] ?? { label: q.status, color: "text-gray-500" };
          const awaitingApproval = q.status === "SUBMITTED";
          const detail = details[q.id];
          const isLoadingDetail = detailLoading[q.id];
          const services: any[] = detail?.services ?? [];
          const parts: any[] = detail?.parts ?? [];
          const hasItems = services.length > 0 || parts.length > 0;

          return (
            <div key={q.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900 text-sm">#{q.quotation_number ?? q.id.slice(0, 8).toUpperCase()}</p>
                  <p className={`text-xs font-medium mt-0.5 ${qs.color}`}>{qs.label}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink-900">₹{Math.round(Number(q.total_amount ?? 0)).toString()}</p>
                  <p className="text-xs text-ink-400">{new Date(q.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                </div>
              </div>

              {/* Summary amounts */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                {[
                  { label: "Subtotal", val: q.subtotal_amount },
                  { label: "Tax", val: q.tax_amount },
                  { label: "Total", val: q.total_amount },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-ink-50 rounded-xl p-2">
                    <p className="text-ink-400">{label}</p>
                    <p className="font-semibold text-ink-800">₹{Math.round(Number(val ?? 0)).toString()}</p>
                  </div>
                ))}
              </div>

              {/* Toggle line items */}
              <button onClick={() => handleToggle(q.id)}
                className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                {isOpen ? "▲ Hide" : "▼ View"} line items
              </button>

              {isOpen && (
                <div className="mt-3">
                  {isLoadingDetail ? (
                    <div className="flex items-center gap-2 text-xs text-ink-400 py-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-brand-400" />
                      Loading items…
                    </div>
                  ) : !hasItems ? (
                    <p className="text-xs text-ink-400 py-2 italic">No line items recorded for this quotation.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Services</p>
                          <div className="border border-ink-100 rounded-xl overflow-hidden">
                            {services.map((s: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center text-xs px-3 py-2.5 gap-2 ${i < services.length - 1 ? "border-b border-ink-50" : ""}`}>
                                <div className="min-w-0">
                                  <span className="text-ink-800 font-medium">{s.service_name ?? s.name}</span>
                                  {s.appliance_label && <span className="text-ink-400 ml-1">({s.appliance_label})</span>}
                                  {s.quantity > 1 && <span className="text-ink-400 ml-1">× {s.quantity}</span>}
                                  {s.is_repeat_complaint && <span className="ml-1 text-green-600 font-medium">(Warranty)</span>}
                                </div>
                                <span className="font-semibold text-ink-900 shrink-0">
                                  {s.is_repeat_complaint ? "₹0" : `₹${Math.round(Number(s.total_price ?? 0)).toLocaleString("en-IN")}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {parts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Spare Parts</p>
                          <div className="border border-ink-100 rounded-xl overflow-hidden">
                            {parts.map((p: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center text-xs px-3 py-2.5 gap-2 ${i < parts.length - 1 ? "border-b border-ink-50" : ""}`}>
                                <div className="min-w-0">
                                  <span className="text-ink-800 font-medium">{p.part_name ?? p.name}</span>
                                  {p.appliance_label && <span className="text-ink-400 ml-1">({p.appliance_label})</span>}
                                  {p.quantity > 1 && <span className="text-ink-400 ml-1">× {p.quantity}</span>}
                                </div>
                                <span className="font-semibold text-ink-900 shrink-0">₹{Math.round(Number(Number(p.total_price ?? 0))).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {detail?.remarks && (
                        <p className="text-xs text-ink-400 italic">Remarks: {detail.remarks}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer can approve/reject SUBMITTED quotations */}
              {awaitingApproval && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => act(q.id, "reject")}
                    disabled={!!acting}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {acting === q.id + "reject" ? "…" : "✕ Reject"}
                  </button>
                  <button
                    onClick={() => act(q.id, "approve")}
                    disabled={!!acting}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {acting === q.id + "approve" ? "…" : "✓ Approve"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────────────
function InvoiceCard({ bookingId }: { bookingId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  // Full invoice details (with services+parts) keyed by invoice id
  const [details, setDetails] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    customerLib.getBookingInvoices(bookingId)
      .then(async (list) => {
        setInvoices(list);
        // Eagerly fetch detail for the first (most recent) invoice
        if (list.length > 0) {
          const first = list[list.length - 1]; // usually just one
          fetchDetail(first.id, list);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchDetail = async (invId: string, currentList?: any[]) => {
    const list = currentList ?? invoices;
    if (details[invId] || detailLoading[invId]) return;
    setDetailLoading(prev => ({ ...prev, [invId]: true }));
    try {
      const detail = await customerLib.getInvoiceDetails(invId);
      setDetails(prev => ({ ...prev, [invId]: detail }));
      // Auto-expand first invoice
      setExpanded(prev => prev === null && list.length > 0 && list[list.length - 1].id === invId ? invId : prev);
    } catch {}
    finally { setDetailLoading(prev => ({ ...prev, [invId]: false })); }
  };

  const handleToggle = (invId: string) => {
    const isOpen = expanded === invId;
    if (!isOpen) fetchDetail(invId);
    setExpanded(isOpen ? null : invId);
  };

  const payOnline = async (invoice: any) => {
    setPaying(invoice.id);
    try {
      const order = await customerLib.createPaymentOrder(invoice.id, invoice.balance_due ?? invoice.total_amount);
      const rpKey = order.razorpay_key_id;
      if (!rpKey) { alert("Online payment is not configured. Please contact support."); return; }

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          document.head.appendChild(s);
        });
      }

      const options: any = {
        key: rpKey,
        amount: order.amount,
        currency: order.currency ?? "INR",
        name: "Palei Solutions",
        description: `Invoice ${invoice.invoice_number}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            await customerLib.verifyPayment(order.transaction_id, response.razorpay_payment_id, response.razorpay_signature ?? "");
            alert("✅ Payment successful! Thank you.");
            const updated = await customerLib.getBookingInvoices(bookingId);
            setInvoices(updated);
          } catch { alert("Payment verification failed. Please contact support."); }
        },
        prefill: {},
        theme: { color: "#2563eb" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not initiate payment.");
    } finally { setPaying(null); }
  };

  const downloadPdf = async (invoiceId: string, invoiceNumber?: string) => {
    try {
      await customerLib.downloadInvoicePdf(invoiceId, invoiceNumber);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not download invoice PDF.");
    }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-ink-100 p-5">
      <div className="h-4 bg-ink-100 rounded animate-pulse w-24 mb-3" />
      <div className="h-16 bg-ink-50 rounded-xl animate-pulse" />
    </div>
  );

  if (!invoices.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
        <span className="text-lg">🧾</span>
        <h3 className="font-bold text-ink-900">Invoice{invoices.length > 1 ? "s" : ""}</h3>
      </div>
      <div className="divide-y divide-ink-50">
        {invoices.map((inv) => {
          const isPaid = inv.payment_status === "PAID";
          const balanceDue = Number(inv.balance_due ?? inv.total_amount ?? 0);
          const isOpen = expanded === inv.id;
          const detail = details[inv.id];
          const isLoadingDetail = detailLoading[inv.id];
          const services: any[] = detail?.services ?? [];
          const parts: any[] = detail?.parts ?? [];
          const hasItems = services.length > 0 || parts.length > 0;

          return (
            <div key={inv.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900 text-sm">{inv.invoice_number}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPaid ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                    {isPaid ? "✅ Paid" : "⏳ Payment Pending"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink-900">₹{Math.round(Number(Number(inv.total_amount ?? 0))).toLocaleString("en-IN")}</p>
                  {!isPaid && balanceDue > 0 && (
                    <p className="text-xs text-orange-600">Due: ₹{Math.round(Number(balanceDue)).toLocaleString("en-IN")}</p>
                  )}
                </div>
              </div>

              {/* Amount summary */}
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                {[
                  { label: "Subtotal", val: detail?.subtotal_amount ?? inv.subtotal_amount },
                  { label: "Tax", val: detail?.tax_amount ?? inv.gst_amount ?? inv.tax_amount },
                  { label: "Discount", val: inv.discount_amount },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-ink-50 rounded-xl p-2">
                    <p className="text-ink-400">{label}</p>
                    <p className="font-semibold text-ink-800">₹{Math.round(Number(val ?? 0)).toString()}</p>
                  </div>
                ))}
              </div>

              {/* Toggle line items */}
              <button onClick={() => handleToggle(inv.id)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                {isOpen ? "▲ Hide" : "▼ View"} line items
              </button>

              {isOpen && (
                <div>
                  {isLoadingDetail ? (
                    <div className="flex items-center gap-2 text-xs text-ink-400 py-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin border-brand-400" />
                      Loading items…
                    </div>
                  ) : !hasItems ? (
                    <p className="text-xs text-ink-400 py-2 italic">No line items recorded for this invoice.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Services</p>
                          <div className="border border-ink-100 rounded-xl overflow-hidden">
                            {services.map((s: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center text-xs px-3 py-2.5 gap-2 ${i < services.length - 1 ? "border-b border-ink-50" : ""}`}>
                                <div className="min-w-0">
                                  <span className="text-ink-800 font-medium">{s.service_name ?? s.name}</span>
                                  {s.appliance_label && <span className="text-ink-400 ml-1">({s.appliance_label})</span>}
                                  {(s.quantity ?? 1) > 1 && <span className="text-ink-400 ml-1">× {s.quantity}</span>}
                                </div>
                                <span className="font-semibold text-ink-900 shrink-0">₹{Math.round(Number(Number(s.total_price ?? 0))).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {parts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Spare Parts</p>
                          <div className="border border-ink-100 rounded-xl overflow-hidden">
                            {parts.map((p: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center text-xs px-3 py-2.5 gap-2 ${i < parts.length - 1 ? "border-b border-ink-50" : ""}`}>
                                <div className="min-w-0">
                                  <span className="text-ink-800 font-medium">{p.part_name ?? p.name}</span>
                                  {(p.quantity ?? 1) > 1 && <span className="text-ink-400 ml-1">× {p.quantity}</span>}
                                </div>
                                <span className="font-semibold text-ink-900 shrink-0">₹{Math.round(Number(Number(p.total_price ?? 0))).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                  className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors flex items-center justify-center gap-1.5">
                  ⬇️ Download PDF
                </button>
                {!isPaid && balanceDue > 0 && (
                  <button onClick={() => payOnline(inv)} disabled={paying === inv.id}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {paying === inv.id ? "Opening…" : "💳 Pay Online"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;

  const [booking,       setBooking]       = useState<BookingDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [showTracker,   setShowTracker]   = useState(false);
  const [showCancel,    setShowCancel]    = useState(false);
  const [showCoupon,    setShowCoupon]    = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // brand color from CSS var fallback

  const loadBooking = useCallback(async () => {
    try {
      const data = await customerLib.getBookingById(id);
      setBooking(data);
    } catch { /* redirect if 404 */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadBooking(); }, [loadBooking]);

  const handleCancelRequest = async (reason: string) => {
    setCancelling(true);
    try {
      await customerLib.requestCancelBooking(id, reason);
      setCancelSuccess(true);
      setShowCancel(false);
      loadBooking();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not submit cancellation request.");
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-brand-500" />
    </div>
  );

  if (!booking) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold text-ink-700">Booking not found</p>
      <Link href="/customer/bookings" className="text-brand-600 text-sm hover:underline mt-2 inline-block">← Back to bookings</Link>
    </div>
  );

  const customerStatus = toCustomerStatus(booking.status);
  const isActive = ["PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "INSPECTING", "IN_PROGRESS", "WORK_PAUSED", "RESCHEDULED"].includes(booking.status);
  const isEnRoute = ["ASSIGNED", "ACCEPTED", "EN_ROUTE"].includes(booking.status);
  const isCompleted = customerStatus === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";

  // Can apply coupon only on PENDING or CONFIRMED bookings where no coupon yet applied
  const canApplyCoupon = ["PENDING", "CONFIRMED"].includes(booking.status) && !booking.coupon_code;

  const dateStr = booking.scheduled_date
    ? new Date(booking.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })
    : "—";

  if (showTracker) return (
    <div className="space-y-4">
      <button onClick={() => setShowTracker(false)} className="text-sm text-ink-500 hover:text-ink-700 flex items-center gap-1.5 transition-colors">
        ← Back to booking details
      </button>
      <BookingTracker
        bookingId={booking.id}
        bookingNumber={booking.booking_number}
        brand="#2563eb"
        onBack={() => setShowTracker(false)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <Link href="/customer/bookings" className="hover:text-brand-600 transition-colors">My Bookings</Link>
        <span>/</span>
        <span className="text-ink-700 font-medium">{booking.booking_number}</span>
      </div>

      {/* Cancel success banner */}
      {cancelSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-green-500 text-lg mt-0.5">✅</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">Cancellation request submitted</p>
            <p className="text-xs text-green-600 mt-0.5">Our team will review your request and contact you if needed.</p>
          </div>
        </div>
      )}

      {/* Status header card */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="font-bold text-ink-900 text-lg">{booking.service_name}</h2>
              <StatusBadge rawStatus={booking.status} />
            </div>
            <p className="text-xs text-ink-400 font-mono">{booking.booking_number}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-ink-900">₹{Math.round(Number(Number(booking.total_amount))).toLocaleString("en-IN")}</p>
            {booking.discount_amount && booking.discount_amount > 0 ? (
              <p className="text-xs text-green-600">-₹{Math.round(Number(Number(booking.discount_amount))).toLocaleString("en-IN")} saved</p>
            ) : null}
          </div>
        </div>

        {/* Key details grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <InfoRow icon="📅" label="Date" value={dateStr} />
          {booking.scheduled_slot && booking.scheduled_slot !== "—" && (
            <InfoRow icon="🕐" label="Slot" value={booking.scheduled_slot} />
          )}
          {booking.technician_name && (
            <InfoRow icon="👷" label="Technician" value={booking.technician_name} />
          )}
          {booking.technician_mobile && (
            <InfoRow icon="📞" label="Contact" value={
              <a href={`tel:${booking.technician_mobile}`} className="text-brand-600 hover:underline">
                {booking.technician_mobile}
              </a>
            } />
          )}
          {booking.appliance_brand && (
            <InfoRow icon="🔧" label="Appliance" value={`${booking.appliance_brand}${booking.appliance_model ? ` ${booking.appliance_model}` : ""}`} />
          )}
          {booking.city && <InfoRow icon="📍" label="City" value={booking.city} />}
          {booking.coupon_code && (
            <InfoRow icon="🏷️" label="Coupon" value={booking.coupon_code} />
          )}
        </div>

        {booking.notes && (
          <div className="mt-3 pt-3 border-t border-ink-100 text-sm text-ink-500">
            <span className="text-ink-400">📝 Notes: </span>{booking.notes}
          </div>
        )}

        {isCancelled && booking.cancelled_reason && (
          <div className="mt-3 pt-3 border-t border-red-100 text-sm text-red-500">
            <span className="font-medium">Cancelled: </span>{booking.cancelled_reason}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {isEnRoute && (
            <button onClick={() => setShowTracker(true)}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2">
              {booking.status === "EN_ROUTE" ? "🗺️ Track Technician Live" : "🔍 Track Booking Status"}
            </button>
          )}
          {canApplyCoupon && (
            <button onClick={() => setShowCoupon(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors">
              🏷️ Apply Coupon
            </button>
          )}
          {isActive && !cancelSuccess && (
            <button onClick={() => setShowCancel(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
              ✕ Cancel Booking
            </button>
          )}
        </div>

        {isCompleted && (
          <div className="mt-3 pt-3 border-t border-green-100 flex items-center gap-2 text-sm text-green-700">
            <span>✅</span>
            <span>Service completed. Thank you for choosing us!</span>
          </div>
        )}
      </div>

      {/* Pricing breakdown */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
        <h3 className="font-bold text-ink-900 mb-3 flex items-center gap-2"><span>💰</span> Price Breakdown</h3>
        <div className="space-y-2 text-sm">
          <PriceRow label="Base Amount" value={booking.base_amount} />
          <PriceRow label="GST" value={booking.gst_amount} />
          {booking.discount_amount && booking.discount_amount > 0 ? (
            <PriceRow label={`Coupon Discount${booking.coupon_code ? ` (${booking.coupon_code})` : ""}`} value={-booking.discount_amount} isDiscount />
          ) : null}
          <div className="border-t border-ink-100 pt-2 flex justify-between font-bold text-ink-900">
            <span>Total</span>
            <span>₹{Math.round(Number(Number(booking.total_amount))).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Quotation */}
      <QuotationCard bookingId={id} bookingStatus={booking.status} onUpdate={loadBooking} />

      {/* Invoice */}
      <InvoiceCard bookingId={id} />

      {/* Modals */}
      {showCancel && (
        <CancelModal onConfirm={handleCancelRequest} onClose={() => setShowCancel(false)} loading={cancelling} />
      )}
      {showCoupon && (
        <CouponModal
          bookingId={id}
          bookingAmount={booking.base_amount}
          onApplied={() => { setShowCoupon(false); loadBooking(); }}
          onClose={() => setShowCoupon(false)}
        />
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <div className="text-ink-800 font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function PriceRow({ label, value, isDiscount }: { label: string; value: number; isDiscount?: boolean }) {
  return (
    <div className="flex justify-between text-ink-600">
      <span>{label}</span>
      <span className={isDiscount ? "text-green-600" : ""}>
        {isDiscount ? "-" : ""}₹{Math.round(Number(Math.abs(Number(value)))).toLocaleString("en-IN")}
      </span>
    </div>
  );
}
