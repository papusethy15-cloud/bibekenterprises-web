"use client";
import { fmtDateIST, fmtDateTimeIST, relativeTimeIST, todayIST } from "@/lib/tz";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as customerLib from "@/lib/customer";
import { Booking } from "@/types";
import { DOMAIN_ID } from "@/lib/config";

// ── Status helpers ────────────────────────────────────────────────────────────
const TERMINAL_AS_COMPLETED = ["PAID","CLOSED","SETTLED","INVOICE_GENERATED","PAYMENT_PENDING"];
function toCustomerStatus(s: string) { return TERMINAL_AS_COMPLETED.includes(s) ? "COMPLETED" : s; }

const STATUS_STYLES: Record<string, { bg:string; text:string; dot:string; label:string }> = {
  PENDING:     { bg:"bg-yellow-50",  text:"text-yellow-700",  dot:"bg-yellow-400",  label:"Pending" },
  CONFIRMED:   { bg:"bg-blue-50",    text:"text-blue-700",    dot:"bg-blue-500",    label:"Confirmed" },
  ASSIGNED:    { bg:"bg-indigo-50",  text:"text-indigo-700",  dot:"bg-indigo-500",  label:"Technician Assigned" },
  ACCEPTED:    { bg:"bg-purple-50",  text:"text-purple-700",  dot:"bg-purple-500",  label:"Accepted" },
  EN_ROUTE:    { bg:"bg-cyan-50",    text:"text-cyan-700",    dot:"bg-cyan-500",    label:"On the Way 🚗" },
  ARRIVED:     { bg:"bg-teal-50",    text:"text-teal-700",    dot:"bg-teal-500",    label:"Arrived" },
  INSPECTING:  { bg:"bg-orange-50",  text:"text-orange-600",  dot:"bg-orange-400",  label:"Inspecting" },
  IN_PROGRESS: { bg:"bg-orange-50",  text:"text-orange-700",  dot:"bg-orange-500",  label:"Work in Progress" },
  WORK_STARTED:{ bg:"bg-orange-50",  text:"text-orange-700",  dot:"bg-orange-400",  label:"Work Started" },
  COMPLETED:   { bg:"bg-green-50",   text:"text-green-700",   dot:"bg-green-500",   label:"Completed ✅" },
  CANCELLED:   { bg:"bg-red-50",     text:"text-red-700",     dot:"bg-red-400",     label:"Cancelled" },
  RESCHEDULED: { bg:"bg-blue-50",    text:"text-blue-700",    dot:"bg-orange-400",  label:"Rescheduled" },
  QUOTATION_APPROVED:{ bg:"bg-green-50", text:"text-green-700", dot:"bg-green-400", label:"Quotation Approved" },
};
function StatusBadge({ raw }: { raw: string }) {
  const d = toCustomerStatus(raw);
  const s = STATUS_STYLES[d] ?? { bg:"bg-gray-100", text:"text-gray-600", dot:"bg-gray-400", label: d.replace(/_/g," ") };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      {s.label}
    </span>
  );
}

const FILTERS = ["ALL","PENDING","CONFIRMED","ASSIGNED","IN_PROGRESS","COMPLETED","CANCELLED"];
function filterToApiStatus(f: string): string | undefined {
  if (f === "ALL") return undefined;
  if (f === "COMPLETED") return "COMPLETED,PAID,CLOSED,SETTLED,INVOICE_GENERATED,PAYMENT_PENDING";
  if (f === "IN_PROGRESS") return "IN_PROGRESS,WORK_PAUSED,WORK_STARTED,INSPECTING";
  if (f === "ASSIGNED") return "ASSIGNED,ACCEPTED,EN_ROUTE,ARRIVED";
  return f;
}

const ACTIVE_FOR_CANCEL = ["PENDING","CONFIRMED","ASSIGNED","ACCEPTED","EN_ROUTE","ARRIVED","INSPECTING","IN_PROGRESS","WORK_PAUSED","RESCHEDULED"];
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/^https/, "wss").replace(/^http(?!s)/, "ws").replace("/api/v1", "");

export default function MyBookingsPage() {
  const { isLoggedIn, user } = useAuth();

  // List state
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [filter, setFilter]       = useState("ALL");
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  // Detail panel state
  const [selectedId, setSelectedId]         = useState<string|null>(null);
  const [detail, setDetail]                 = useState<any>(null);
  const [detailTab, setDetailTab]           = useState<"info"|"quotation"|"invoice"|"payment"|"track">("info");
  const [detailLoading, setDetailLoading]   = useState(false);
  const [quotations, setQuotations]         = useState<any[]>([]);
  const [invoices, setInvoices]             = useState<any[]>([]);
  const [quotItems, setQuotItems]           = useState<any>(null);
  const [invItems, setInvItems]             = useState<any>(null);

  // Cancel with reason modal
  const [cancelModal, setCancelModal]       = useState<{id:string;bnum:string}|null>(null);
  const [cancelReason, setCancelReason]     = useState("");
  const [cancelling, setCancelling]         = useState(false);

  // Coupon
  const [couponCode, setCouponCode]         = useState("");
  const [couponResult, setCouponResult]     = useState<any>(null);
  const [couponLoading, setCouponLoading]   = useState(false);
  const [couponError, setCouponError]       = useState("");

  // Payment
  const [payLoading, setPayLoading]         = useState(false);

  // Live tracking (EN_ROUTE)
  const wsRef   = useRef<WebSocket|null>(null);
  const mapRef  = useRef<HTMLDivElement>(null);
  const gmapRef = useRef<any>(null);
  const mrkRef  = useRef<any>(null);
  const [techPos, setTechPos]     = useState<{lat:number;lng:number}|null>(null);
  const [mapsKey, setMapsKey]     = useState<string|null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>("");

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchList = useCallback(async (p = 1, f = filter, q = search) => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const statusParam = filterToApiStatus(f);
      const params: any = { page: p, per_page: 10 };
      if (statusParam) params.status = statusParam;
      if (q.trim()) params.search = q.trim();
      const result = await customerLib.getMyBookings(params);
      setBookings(result.items ?? []);
      setTotal(result.total ?? 0);
      setPages(result.pages ?? 1);
      setPage(p);
    } catch { setBookings([]); } finally { setLoading(false); }
  }, [isLoggedIn, filter, search]);

  useEffect(() => {
    if (!isLoggedIn || !user?.user_id) { setBookings([]); return; }
    setFilter("ALL"); setPage(1); fetchList(1, "ALL", "");
  }, [isLoggedIn, user?.user_id]); // eslint-disable-line

  // ── Open booking detail ────────────────────────────────────────────────────
  const openDetail = async (id: string) => {
    setSelectedId(id); setDetailLoading(true); setDetail(null);
    setQuotations([]); setInvoices([]); setQuotItems(null); setInvItems(null);
    setDetailTab("info"); setCouponCode(""); setCouponResult(null); setCouponError("");
    try {
      const [det, quots, invs] = await Promise.all([
        customerLib.getBookingById(id),
        customerLib.getBookingQuotations(id).catch(()=>[]),
        customerLib.getBookingInvoices(id).catch(()=>[]),
      ]);
      setDetail(det); setQuotations(quots); setInvoices(invs);
      setTrackingStatus(det?.status ?? "");
    } catch {} finally { setDetailLoading(false); }
    // Fetch Google Maps key for tracking
    customerLib.getGoogleMapsKey().then(k => { if(k) setMapsKey(k); });
  };

  const closeDetail = () => {
    setSelectedId(null); setDetail(null);
    wsRef.current?.close(); wsRef.current = null;
  };

  // ── WebSocket for live tracking (EN_ROUTE only) ───────────────────────────
  useEffect(() => {
    if (!selectedId || trackingStatus !== "EN_ROUTE") {
      wsRef.current?.close(); wsRef.current = null; return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/booking/${selectedId}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "TECHNICIAN_LOCATION_UPDATE") {
          const { latitude: lat, longitude: lng } = msg.payload ?? {};
          if (lat && lng) setTechPos({ lat, lng });
        }
        if (msg.type === "BOOKING_STATUS_CHANGED") {
          setTrackingStatus(msg.payload?.status ?? trackingStatus);
          openDetail(selectedId); // refresh detail
        }
      } catch {}
    };
    ws.onerror = () => ws.close();
    return () => { ws.close(); };
  }, [selectedId, trackingStatus]); // eslint-disable-line

  // ── Google Map render ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapsKey || !mapRef.current || detailTab !== "track") return;
    const w = window as any;
    const dest = detail?.destination ?? detail?.address_coords;
    const center = dest ? { lat: dest.latitude ?? 20.29, lng: dest.longitude ?? 85.82 } : { lat: 20.29, lng: 85.82 };

    const buildMap = () => {
      if (!mapRef.current) return;
      const map = new w.google.maps.Map(mapRef.current, { center, zoom: 14, disableDefaultUI: true, zoomControl: true });
      gmapRef.current = map;
      if (dest?.latitude) new w.google.maps.Marker({ map, position: { lat: dest.latitude, lng: dest.longitude }, title: "Your address", icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" });
      if (techPos) {
        mrkRef.current = new w.google.maps.Marker({ map, position: techPos, title: "Technician", icon: { url: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png", scaledSize: new w.google.maps.Size(40,40) } });
        map.setCenter(techPos);
      }
    };
    if (w.google?.maps) buildMap();
    else {
      const id = "gmap-booking";
      if (!document.getElementById(id)) {
        const s = document.createElement("script");
        s.id = id; s.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;
        s.async = true; s.onload = buildMap;
        document.head.appendChild(s);
      } else { const t = setInterval(()=>{ if(w.google?.maps){clearInterval(t);buildMap();} },200); }
    }
  }, [mapsKey, detailTab, detail]); // eslint-disable-line

  useEffect(() => {
    const w = window as any;
    if (!w.google?.maps || !gmapRef.current || !techPos) return;
    if (mrkRef.current) mrkRef.current.setPosition(techPos);
    else mrkRef.current = new w.google.maps.Marker({ map: gmapRef.current, position: techPos, icon: { url:"https://maps.google.com/mapfiles/ms/icons/orange-dot.png", scaledSize: new w.google.maps.Size(40,40) }, title:"Technician" });
    gmapRef.current.panTo(techPos);
  }, [techPos]);

  // ── Coupon validation ──────────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!couponCode.trim() || !detail) return;
    setCouponLoading(true); setCouponError(""); setCouponResult(null);
    try {
      const res = await customerLib.validateCoupon(couponCode.trim(), detail.total_amount ?? detail.base_amount ?? 0);
      setCouponResult(res);
    } catch (e: any) { setCouponError(e?.response?.data?.detail ?? "Invalid coupon"); }
    finally { setCouponLoading(false); }
  };

  const applyCoupon = async () => {
    if (!couponResult || !selectedId) return;
    setCouponLoading(true);
    try {
      await customerLib.applyCouponToBooking(selectedId, couponCode.trim());
      await openDetail(selectedId);
    } catch (e: any) { setCouponError(e?.response?.data?.detail ?? "Could not apply coupon"); }
    finally { setCouponLoading(false); }
  };

  // ── Cancel with reason ────────────────────────────────────────────────────
  const doCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await customerLib.cancelBooking(cancelModal.id, cancelReason.trim());
      setCancelModal(null); setCancelReason("");
      await fetchList(page, filter, search);
      if (selectedId === cancelModal.id) closeDetail();
    } catch (e: any) { alert(e?.response?.data?.detail ?? "Could not submit cancellation request."); }
    finally { setCancelling(false); }
  };

  // ── Payment (Razorpay) ────────────────────────────────────────────────────
  const initiatePayment = async (invoiceId: string, amount: number) => {
    setPayLoading(true);
    try {
      const order = await customerLib.createPaymentOrder(invoiceId);
      const key = order.razorpay_key_id;
      if (!key) {
        alert("Online payment is not configured. Please contact support.");
        return;
      }
      if (!(window as any).Razorpay) {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        document.head.appendChild(s);
        await new Promise(r => s.onload = r);
      }
      const rzp = new (window as any).Razorpay({
        key, order_id: order.order_id, amount: Math.round(amount * 100),
        currency: "INR", name: "Palei Solutions",
        description: `Payment for ${detail?.booking_number}`,
        handler: async (resp: any) => {
          try {
            await customerLib.verifyPayment(order.transaction_id, resp.razorpay_payment_id, resp.razorpay_signature);
            alert("✅ Payment successful!");
            await openDetail(selectedId!);
          } catch { alert("Payment verification failed. Please contact support."); }
        },
      });
      rzp.open();
    } catch (e: any) { alert(e?.response?.data?.detail ?? "Payment initiation failed."); }
    finally { setPayLoading(false); }
  };

  // ── Load quotation items ──────────────────────────────────────────────────
  const loadQuotItems = async (quotId: string) => {
    try { const d = await customerLib.getQuotationDetails(quotId); setQuotItems(d); } catch {}
  };
  const loadInvItems = async (invId: string) => {
    try { const d = await customerLib.getInvoiceDetails(invId); setInvItems(d); } catch {}
  };
  const downloadInvPdf = async (invId: string, invNumber?: string) => {
    try { await customerLib.downloadInvoicePdf(invId, invNumber); }
    catch (e: any) { alert(e?.response?.data?.detail ?? "Could not download PDF."); }
  };

  const fmt = (n?: number) => n != null ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  const isEnRoute = detail?.status === "EN_ROUTE";
  const hasInvoice = invoices.length > 0;
  const latestInvoice = invoices[0];
  const latestQuot = quotations[0];
  const quotApproved = latestQuot?.status === "APPROVED" || latestQuot?.status === "CONVERTED_TO_INVOICE";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-ink-900">
          My Bookings <span className="text-ink-400 font-normal text-base">({total})</span>
        </h2>
        <Link href="/booking" className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors">
          + New Booking
        </Link>
      </div>

      {/* Search */}
      <input
        type="text" placeholder="Search by booking number or service…" value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === "Enter" && fetchList(1, filter, search)}
        className="w-full border border-ink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); fetchList(1, f, search); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter===f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-ink-400"}`}>
            {f==="IN_PROGRESS"?"In Progress":f==="ALL"?"All":f.replace(/_/g," ")}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-brand-500"/></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-100 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-ink-700 font-semibold mb-1">No bookings found</p>
          <p className="text-ink-400 text-sm mb-5">{filter==="ALL"?"You haven't made any bookings yet.":  `No ${filter.toLowerCase().replace(/_/g," ")} bookings.`}</p>
          <Link href="/booking" className="inline-block text-sm font-semibold text-white px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 transition-colors">Book a Service</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const cs = toCustomerStatus(b.status);
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetail(b.id)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-ink-900 text-sm">{b.service_name}</span>
                      <StatusBadge raw={b.status}/>
                    </div>
                    <p className="text-xs text-ink-400 font-mono">{b.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink-900">{fmt(b.total_amount)}</p>
                    <p className="text-xs text-ink-400">{fmtDate(b.scheduled_date ?? b.created_at)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-ink-400">
                    {b.technician_name && <span>👷 {b.technician_name}</span>}
                    {b.scheduled_slot && b.scheduled_slot !== "—" && <span>🕐 {b.scheduled_slot}</span>}
                  </div>
                  <span className="text-xs text-brand-600 font-medium">View details →</span>
                </div>
                {b.status === "EN_ROUTE" && (
                  <div className="mt-2 pt-2 border-t border-cyan-100 flex items-center gap-2 text-xs text-cyan-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"/> Technician is on the way — tap to track live
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button onClick={() => fetchList(page-1, filter, search)} disabled={page===1} className="px-3 py-1.5 rounded-lg text-sm border border-ink-200 disabled:opacity-40 hover:border-ink-400">←</button>
          <span className="text-sm text-ink-500">Page {page} of {pages} · {total} total</span>
          <button onClick={() => fetchList(page+1, filter, search)} disabled={page===pages} className="px-3 py-1.5 rounded-lg text-sm border border-ink-200 disabled:opacity-40 hover:border-ink-400">→</button>
        </div>
      )}

      {/* ── Detail Side Panel ──────────────────────────────────────────── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail}/>
          <div className="relative ml-auto w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Panel header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 bg-white sticky top-0 z-10">
              <button onClick={closeDetail} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-50 text-ink-500">✕</button>
              <div className="flex-1">
                <p className="text-xs text-ink-400 font-mono">{detail?.booking_number ?? "…"}</p>
                <p className="font-bold text-ink-900 text-sm">{detail?.service_name ?? "Loading…"}</p>
              </div>
              {detail && <StatusBadge raw={detail.status}/>}
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-brand-500"/></div>
            ) : detail ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-ink-100 overflow-x-auto shrink-0">
                  {(["info","quotation","invoice","payment","track"] as const).map(t => (
                    <button key={t} onClick={() => { setDetailTab(t); if(t==="quotation"&&latestQuot&&!quotItems) loadQuotItems(latestQuot.id); if(t==="invoice"&&latestInvoice&&!invItems) loadInvItems(latestInvoice.id); }}
                      className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${detailTab===t?"border-brand-600 text-brand-700":"border-transparent text-ink-500 hover:text-ink-700"}`}>
                      {t==="info"?"Details":t==="quotation"?"Quotation":t==="invoice"?"Invoice":t==="payment"?"Payment":"Track"}
                      {t==="track"&&isEnRoute&&<span className="ml-1 w-2 h-2 rounded-full bg-cyan-500 animate-pulse inline-block"/>}
                      {t==="quotation"&&quotations.length>0&&<span className="ml-1 bg-brand-100 text-brand-700 text-xs rounded-full px-1.5">{quotations.length}</span>}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-5 space-y-4">
                  {/* ── INFO TAB ─────────────────────────────────────── */}
                  {detailTab === "info" && (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          ["Service",       detail.service_name],
                          ["Booking #",     detail.booking_number],
                          ["Date",          fmtDate(detail.scheduled_date)],
                          ["Slot",          detail.scheduled_slot || "—"],
                          ["Status",        toCustomerStatus(detail.status).replace(/_/g," ")],
                          ["Technician",    detail.technician_name || "Being assigned…"],
                          ["Base Amount",   fmt(detail.base_amount)],
                          ["GST",           fmt(detail.gst_amount)],
                          ["Coupon Disc.",  detail.coupon_discount > 0 ? fmt(detail.coupon_discount) : "—"],
                          ["Total Amount",  fmt(detail.total_amount)],
                        ].map(([l,v]) => (
                          <div key={l}><p className="text-xs text-ink-400">{l}</p><p className="font-semibold text-ink-900">{v}</p></div>
                        ))}
                      </div>
                      {/* Full service address */}
                      {(detail.address_str || detail.city) && (
                        <div className="bg-ink-50 rounded-xl p-3 text-sm text-ink-700">
                          <span className="font-medium text-ink-500 block mb-0.5">
                            📍 Service Address{detail.address_label ? ` · ${detail.address_label}` : ""}
                          </span>
                          {detail.address_str && detail.address_str !== "—" ? detail.address_str : detail.city || "—"}
                        </div>
                      )}
                      {detail.notes && <div className="bg-ink-50 rounded-xl p-3 text-sm text-ink-600"><span className="font-medium">Notes: </span>{detail.notes}</div>}
                      {detail.cancelled_reason && <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700"><span className="font-medium">Cancellation reason: </span>{detail.cancelled_reason}</div>}

                      {/* Coupon for active booking */}
                      {ACTIVE_FOR_CANCEL.includes(detail.status) && (
                        <div className="border border-ink-200 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-semibold text-ink-800">🏷️ Apply Coupon</p>
                          {detail.coupon_code ? (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                              ✅ Coupon <strong>{detail.coupon_code}</strong> applied — saved {fmt(detail.coupon_discount)}
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <input value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());setCouponResult(null);setCouponError("");}}
                                  placeholder="Enter coupon code" className="flex-1 border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"/>
                                <button onClick={validateCoupon} disabled={couponLoading||!couponCode.trim()} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                  {couponLoading?"…":"Check"}
                                </button>
                              </div>
                              {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                              {couponResult && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <p className="text-sm text-green-700">✅ <strong>{couponResult.code}</strong> — save {fmt(couponResult.discount_amount)}</p>
                                  <p className="text-xs text-green-600 mt-1">{couponResult.description}</p>
                                  <button onClick={applyCoupon} disabled={couponLoading} className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                                    {couponLoading?"Applying…":"Apply Coupon"}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Cancel button */}
                      {ACTIVE_FOR_CANCEL.includes(detail.status) && (
                        <button onClick={() => { setCancelModal({id:detail.id,bnum:detail.booking_number}); setCancelReason(""); }}
                          className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                          Request Cancellation
                        </button>
                      )}
                    </>
                  )}

                  {/* ── QUOTATION TAB ───────────────────────────────── */}
                  {detailTab === "quotation" && (
                    <div className="space-y-4">
                      {quotations.length === 0 ? (
                        <div className="text-center py-10 text-ink-400">
                          <p className="text-3xl mb-2">📄</p>
                          <p>No quotation yet</p>
                          <p className="text-xs mt-1">A quotation will appear here once the technician has inspected your appliance.</p>
                        </div>
                      ) : quotations.map(q => (
                        <div key={q.id} className="border border-ink-200 rounded-2xl overflow-hidden">
                          {/* Header */}
                          <div className={`px-4 py-3 flex items-center justify-between ${
                            q.status==="APPROVED"||q.status==="CONVERTED_TO_INVOICE"
                              ?"bg-green-50 border-b border-green-200"
                              :q.status==="REJECTED"
                              ?"bg-red-50 border-b border-red-100"
                              :q.status==="SUBMITTED"
                              ?"bg-blue-50 border-b border-blue-100"
                              :"bg-ink-50 border-b border-ink-200"
                          }`}>
                            <div>
                              <p className="text-sm font-bold text-ink-900">{q.quotation_number}</p>
                              <p className="text-xs text-ink-400">
                                v{q.version} · {new Date(q.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              q.status==="APPROVED"||q.status==="CONVERTED_TO_INVOICE"?"bg-green-100 text-green-700"
                              :q.status==="REJECTED"?"bg-red-100 text-red-700"
                              :q.status==="SUBMITTED"?"bg-blue-100 text-blue-700"
                              :q.status==="REVISED"?"bg-orange-100 text-orange-700"
                              :"bg-gray-100 text-gray-600"
                            }`}>
                              {q.status==="CONVERTED_TO_INVOICE"?"Converted to Invoice"
                               :q.status==="APPROVED"?"Approved ✅"
                               :q.status==="SUBMITTED"?"Awaiting Your Approval"
                               :q.status==="REJECTED"?"Rejected"
                               :q.status==="REVISED"?"Revised"
                               :q.status==="DRAFT"?"Draft"
                               :q.status}
                            </span>
                          </div>

                          {/* Line items — fetched lazily via getQuotationDetails */}
                          {quotItems?.id === q.id && (
                            <div className="px-4 pt-3 pb-1 space-y-1">
                              {(quotItems.services ?? []).length > 0 && (
                                <>
                                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Services</p>
                                  {(quotItems.services ?? []).map((si: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs py-1 border-b border-ink-50 last:border-0">
                                      <span className="text-ink-700 flex-1 pr-2">{si.service_name ?? si.name}{si.quantity > 1 ? ` ×${si.quantity}` : ""}</span>
                                      <span className="font-medium text-ink-900 shrink-0">{fmt(si.total_price)}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                              {(quotItems.parts ?? []).length > 0 && (
                                <>
                                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mt-2 mb-1">Parts & Materials</p>
                                  {(quotItems.parts ?? []).map((pi: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs py-1 border-b border-ink-50 last:border-0">
                                      <span className="text-ink-700 flex-1 pr-2">🔩 {pi.part_name ?? pi.name}{pi.quantity > 1 ? ` ×${pi.quantity}` : ""}</span>
                                      <span className="font-medium text-ink-900 shrink-0">{fmt(pi.total_price)}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}

                          {/* Totals breakdown */}
                          <div className="px-4 py-3 space-y-1.5 text-sm border-t border-ink-100 mt-1">
                            {(q.labour_charges ?? 0) > 0 && (
                              <div className="flex justify-between text-ink-600">
                                <span>Labour</span><span>{fmt(q.labour_charges)}</span>
                              </div>
                            )}
                            {(q.services_total ?? 0) > 0 && (
                              <div className="flex justify-between text-ink-600">
                                <span>Services</span><span>{fmt(q.services_total)}</span>
                              </div>
                            )}
                            {(q.parts_total ?? 0) > 0 && (
                              <div className="flex justify-between text-ink-600">
                                <span>Parts</span><span>{fmt(q.parts_total)}</span>
                              </div>
                            )}
                            {((q.discount_amount ?? 0) + (q.coupon_discount ?? 0)) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount{q.coupon_code ? ` (${q.coupon_code})` : ""}</span>
                                <span>-{fmt((q.discount_amount ?? 0) + (q.coupon_discount ?? 0))}</span>
                              </div>
                            )}
                            {(q.tax_amount ?? 0) > 0 && (
                              <div className="flex justify-between text-ink-600">
                                <span>GST ({q.tax_percent ?? 0}%)</span><span>{fmt(q.tax_amount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-ink-900 border-t border-ink-200 pt-2 mt-1 text-base">
                              <span>Total</span><span>{fmt(q.total_amount)}</span>
                            </div>
                          </div>

                          {q.remarks && (
                            <div className="px-4 pb-3 text-xs text-ink-500 italic border-t border-ink-50">
                              📝 {q.remarks}
                            </div>
                          )}
                          {q.rejection_reason && (
                            <div className="px-4 pb-3 text-xs text-red-600 bg-red-50 border-t border-red-100">
                              ✕ Rejected: {q.rejection_reason}
                            </div>
                          )}
                          {(q.status==="APPROVED"||q.status==="CONVERTED_TO_INVOICE") && (
                            <div className="px-4 py-3 bg-green-50 border-t border-green-100">
                              <p className="text-xs text-green-700 font-medium">
                                ✅ {q.status==="CONVERTED_TO_INVOICE"
                                  ?"Quotation approved and invoice generated."
                                  :`Approved on ${fmtDate(q.approved_at)} — work is proceeding.`}
                              </p>
                            </div>
                          )}
                          {q.status==="SUBMITTED" && (
                            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 font-medium">
                              👆 Please review and approve this quotation to proceed.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── INVOICE TAB ─────────────────────────────────── */}
                  {detailTab === "invoice" && (
                    <div className="space-y-4">
                      {!hasInvoice ? (
                        <div className="text-center py-10 text-ink-400">
                          <p className="text-3xl mb-2">🧾</p>
                          <p>Invoice not generated yet</p>
                          <p className="text-xs mt-1">Invoice appears after the work is completed.</p>
                        </div>
                      ) : invoices.map(inv => (
                        <div key={inv.id} className="border border-ink-200 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-ink-900">{inv.invoice_number}</p>
                              <p className="text-xs text-ink-400">{fmtDate(inv.created_at)}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${inv.status==="PAID"?"bg-green-100 text-green-700":inv.balance_amount>0?"bg-yellow-100 text-yellow-700":"bg-gray-100 text-gray-600"}`}>
                              {inv.status === "PAID" ? "PAID" : inv.balance_amount > 0 ? `Balance: ${fmt(inv.balance_amount)}` : inv.status}
                            </span>
                          </div>
                          {/* Line items — fetched lazily via getInvoiceDetails */}
                          {invItems?.id === inv.id && (
                            <div className="px-4 pt-3 pb-1 space-y-1 border-b border-ink-100">
                              {(invItems.services ?? []).length > 0 && (
                                <>
                                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Services</p>
                                  {(invItems.services ?? []).map((si: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs py-1 border-b border-ink-50 last:border-0">
                                      <span className="text-ink-700 flex-1 pr-2">{si.service_name ?? si.name}{si.quantity > 1 ? ` ×${si.quantity}` : ""}</span>
                                      <span className="font-medium text-ink-900 shrink-0">{fmt(si.total_price)}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                              {(invItems.parts ?? []).length > 0 && (
                                <>
                                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mt-2 mb-1">Parts & Materials</p>
                                  {(invItems.parts ?? []).map((pi: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs py-1 border-b border-ink-50 last:border-0">
                                      <span className="text-ink-700 flex-1 pr-2">🔩 {pi.part_name ?? pi.name}{pi.quantity > 1 ? ` ×${pi.quantity}` : ""}</span>
                                      <span className="font-medium text-ink-900 shrink-0">{fmt(pi.total_price)}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                          <div className="px-4 py-3 grid grid-cols-2 gap-y-2 text-sm">
                            <div><p className="text-xs text-ink-400">Taxable</p><p className="font-semibold">{fmt(inv.taxable_amount)}</p></div>
                            <div><p className="text-xs text-ink-400">GST</p><p className="font-semibold">{fmt(inv.gst_amount)}</p></div>
                            <div className="col-span-2 border-t border-ink-100 pt-2 mt-1"><p className="text-xs text-ink-400">Total</p><p className="font-bold text-xl text-ink-900">{fmt(inv.total_amount)}</p></div>
                          </div>
                          {inv.notes && <div className="px-4 pb-3 text-xs text-ink-500">{inv.notes}</div>}
                          <div className="px-4 pb-4 flex gap-2">
                            <button onClick={() => downloadInvPdf(inv.id, inv.invoice_number)}
                              className="flex-1 py-2 border border-ink-200 text-ink-700 rounded-lg text-xs font-semibold text-center hover:bg-ink-50">
                              📥 Download PDF
                            </button>
                            {inv.balance_amount > 0 && inv.status !== "PAID" && (
                              <button onClick={() => initiatePayment(inv.id, inv.balance_amount)}
                                disabled={payLoading}
                                className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-50">
                                {payLoading ? "Processing…" : `Pay ${fmt(inv.balance_amount)}`}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── PAYMENT TAB ─────────────────────────────────── */}
                  {detailTab === "payment" && (
                    <div className="space-y-4">
                      {!hasInvoice ? (
                        <div className="text-center py-10 text-ink-400">
                          <p className="text-3xl mb-2">💳</p><p>No payment due yet</p>
                        </div>
                      ) : (
                        <>
                          {latestInvoice?.status === "PAID" ? (
                            <div className="flex flex-col items-center py-10">
                              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mb-4">✅</div>
                              <p className="text-xl font-bold text-ink-900">Payment Complete</p>
                              <p className="text-ink-400 text-sm mt-1">Paid on {fmtDate(latestInvoice.paid_at)}</p>
                              <p className="text-2xl font-bold text-green-600 mt-3">{fmt(latestInvoice.total_amount)}</p>
                            </div>
                          ) : (
                            <div className="border border-ink-200 rounded-2xl p-5 space-y-4">
                              <div className="text-center">
                                <p className="text-xs text-ink-400 mb-1">Amount Due</p>
                                <p className="text-3xl font-bold text-ink-900">{fmt(latestInvoice.balance_amount)}</p>
                                <p className="text-xs text-ink-400 mt-1">Invoice {latestInvoice.invoice_number}</p>
                              </div>
                              <button onClick={() => initiatePayment(latestInvoice.id, latestInvoice.balance_amount)}
                                disabled={payLoading}
                                className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors">
                                {payLoading ? "Processing…" : "💳 Pay with Razorpay"}
                              </button>
                              <p className="text-xs text-ink-400 text-center">Secured by Razorpay · UPI, Cards, Net Banking accepted</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── TRACK TAB ───────────────────────────────────── */}
                  {detailTab === "track" && (
                    <div className="space-y-4">
                      {!isEnRoute ? (
                        <div className="text-center py-10">
                          <p className="text-4xl mb-3">🗺️</p>
                          <p className="text-ink-700 font-semibold">Live tracking not active</p>
                          <p className="text-ink-400 text-sm mt-1">
                            {detail.status==="EN_ROUTE"?"Loading map…":detail.status==="ACCEPTED"?"Technician will appear here once they start heading to you.":detail.status==="ASSIGNED"?"Waiting for technician to accept the job.":"Tracking is only available when the technician is en route."}
                          </p>
                          <div className="mt-4 bg-ink-50 rounded-xl p-4 text-sm space-y-2 text-left max-w-xs mx-auto">
                            {(["CONFIRMED","ASSIGNED","ACCEPTED","EN_ROUTE","ARRIVED","INSPECTING","IN_PROGRESS","COMPLETED"] as const).map(s => {
                              const done = ["CONFIRMED","ASSIGNED","ACCEPTED","EN_ROUTE","ARRIVED","INSPECTING","IN_PROGRESS","COMPLETED"].indexOf(toCustomerStatus(detail.status)) >= ["CONFIRMED","ASSIGNED","ACCEPTED","EN_ROUTE","ARRIVED","INSPECTING","IN_PROGRESS","COMPLETED"].indexOf(s);
                              return (
                                <div key={s} className={`flex items-center gap-3 text-xs ${done?"text-green-700":"text-ink-400"}`}>
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done?"bg-green-500 text-white":"bg-ink-200 text-ink-400"}`}>{done?"✓":"○"}</span>
                                  {s.replace(/_/g," ")}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                            <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"/>
                            <div>
                              <p className="text-sm font-semibold text-cyan-800">🚗 {detail.technician_name} is on the way</p>
                              {detail.technician_mobile && <a href={`tel:${detail.technician_mobile}`} className="text-xs text-cyan-600">📞 {detail.technician_mobile}</a>}
                            </div>
                          </div>
                          {mapsKey ? (
                            <div ref={mapRef} className="w-full rounded-xl overflow-hidden" style={{height:300}}/>
                          ) : (
                            <div className="bg-ink-50 rounded-xl flex items-center justify-center text-ink-400 text-sm" style={{height:160}}>
                              <div className="text-center"><p className="text-3xl mb-2">🗺️</p><p>Map key not configured</p></div>
                            </div>
                          )}
                          {!techPos && <p className="text-xs text-center text-ink-400">Waiting for technician location…</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Cancel Reason Modal ──────────────────────────────────────── */}
      {cancelModal && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelModal(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink-900">Request Cancellation</h3>
            <p className="text-sm text-ink-500">Booking <strong>{cancelModal.bnum}</strong> — your request will be reviewed by our team.</p>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Reason for cancellation</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={3}
                placeholder="E.g. Technician not reachable, service no longer needed…"
                className="w-full border border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 border border-ink-200 text-ink-700 rounded-xl text-sm font-semibold hover:bg-ink-50">Keep Booking</button>
              <button onClick={doCancel} disabled={!cancelReason.trim()||cancelling}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {cancelling?"Submitting…":"Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
