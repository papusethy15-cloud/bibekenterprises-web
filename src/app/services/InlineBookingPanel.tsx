"use client";

import { todayIST, currentHourIST } from "@/lib/tz";
import { useState, useEffect, useCallback } from "react";
import { DomainService, CustomerAddress, CustomerProfile, City, ServiceCityPrice } from "@/types";
import { api } from "@/lib/api";
import { resolveCityPrice } from "@/lib/domain";
import { useCity } from "@/context/CityContext";
import AddressModal from "./AddressModal";

// Canonical slot values stored in DB — HH:MM-HH:MM (24h)
const TIME_SLOTS = [
  { value: '08:00-10:00', label: '8:00 – 10:00 AM'    },
  { value: '10:00-12:00', label: '10:00 AM – 12:00 PM' },
  { value: '12:00-14:00', label: '12:00 – 2:00 PM'    },
  { value: '14:00-16:00', label: '2:00 – 4:00 PM'     },
  { value: '16:00-18:00', label: '4:00 – 6:00 PM'     },
  { value: '18:00-20:00', label: '6:00 – 8:00 PM'     },
];

function getSlotStartHour(s: string): number {
  const m = s.match(/^(\d{2}):(\d{2})-/);
  if (!m) return 0;
  return parseInt(m[1], 10);
}
function isSlotPastForToday(s: string, selectedDate: string): boolean {
  if (!selectedDate) return false;
  if (selectedDate !== todayIST()) return false;
  return getSlotStartHour(s) <= currentHourIST();
}

interface Props {
  brand: string;
  service: DomainService;
  customer: CustomerProfile;
  cityPrices: ServiceCityPrice[];
  cities: City[];
  domainId?: string;
  onBookingDone: (bookingNumber: string) => void;
}

type PanelStep = "address" | "schedule" | "confirm" | "done";

export default function InlineBookingPanel({
  brand, service, customer, cityPrices, cities, domainId, onBookingDone,
}: Props) {
  const { selectedCity } = useCity();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAddress, setEditAddress] = useState<CustomerAddress | undefined>();
  const [selectedAddr, setSelectedAddr] = useState<CustomerAddress | null>(null);

  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (slot && isSlotPastForToday(slot, newDate)) setSlot("");
  };
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<PanelStep>("address");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [duplicateBookingNumber, setDuplicateBookingNumber] = useState<string | null>(null);

  // Coupon
  const [couponInput,    setCouponInput]    = useState("");
  const [couponCode,     setCouponCode]     = useState("");
  const [couponId,       setCouponId]       = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg,      setCouponMsg]      = useState("");
  const [couponLoading,  setCouponLoading]  = useState(false);

  // Price resolved from global city context
  const { price, isAvailable } = resolveCityPrice(
    service.base_price,
    cityPrices,
    selectedCity?.name
  );
  const gst = Math.round((price * service.gst_percent) / 100);
  const total = price + gst;

  const loadAddresses = useCallback(async () => {
    setLoadingAddr(true);
    try {
      const res = await api.get(`/customers/${customer.id}/addresses`);
      const list: CustomerAddress[] = res.data?.data ?? [];
      setAddresses(list);
      if (!selectedAddr && list.length > 0) {
        setSelectedAddr(list.find((a) => a.is_default) ?? list[0]);
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddr(false);
    }
  }, [customer.id, selectedAddr]);

  useEffect(() => { loadAddresses(); }, [customer.id]);

  const handleAddressSaved = (addr: CustomerAddress) => {
    setShowAddModal(false);
    setEditAddress(undefined);
    loadAddresses().then(() => setSelectedAddr(addr));
  };

  // ── Coupon ──────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponMsg("");
    try {
      const res = await api.post("/coupons/validate", {
        code: couponInput.trim().toUpperCase(),
        domain_id: domainId || undefined,
        order_amount: total,
      });
      const d = res.data.data;
      setCouponCode(d.code);
      setCouponId(d.coupon_id || "");
      setCouponDiscount(d.discount_amount);
      setCouponMsg(`✅ "${d.code}" applied — ₹${d.discount_amount} off!`);
    } catch (e: any) {
      setCouponMsg(`❌ ${e?.response?.data?.detail || "Invalid coupon code"}`);
      setCouponCode(""); setCouponDiscount(0);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => {
    setCouponCode(""); setCouponInput(""); setCouponDiscount(0); setCouponMsg("");
  };

  // ── City mismatch guard ──────────────────────────────────────────────────
  const checkCityMismatch = () => {
    if (!selectedAddr || !selectedCity) return false;
    const addrCity = selectedAddr.city ?? "";
    if (!addrCity) return false;                        // no city stored → skip check
    return selectedCity.name.toLowerCase() !== addrCity.toLowerCase();
  };

  const handleConfirmBooking = async () => {
    if (!selectedAddr) { setError("Please select a delivery address."); return; }
    if (!date) { setError("Please select a date."); return; }
    if (!slot) { setError("Please select a time slot."); return; }

    // City mismatch confirmation
    if (checkCityMismatch()) {
      const ok = window.confirm(
        `⚠️ City Mismatch\n\nYour selected site city is "${selectedCity?.name}" but your booking address is in "${selectedAddr.city}".\n\nAre you sure your address is correct? Press OK to proceed, or Cancel to pick a different address.`
      );
      if (!ok) return;
    }

    setBooking(true);
    setError("");
    try {
      const res = await api.post("/bookings", {
        service_id: service.service_id,
        address_id: selectedAddr.id,
        scheduled_date: date,
        scheduled_slot: slot,
        notes: notes || undefined,
        source: "WEBSITE",
        domain_id: domainId || undefined,
        city_id: selectedCity?.id || undefined,
        coupon_code: couponCode || undefined,
        coupon_id: couponId || undefined,
        coupon_discount: couponDiscount > 0 ? couponDiscount : undefined,
        base_amount: total || undefined,
      });
      const bn = res.data?.data?.booking_number ?? "BE" + Date.now().toString().slice(-8);
      onBookingDone(bn);
    } catch (e: any) {
      const detail: string = e?.response?.data?.detail || "";
      // Backend returns "DUPLICATE:BK12345678:STATUS:CategoryName" for category-level duplicate
      if (detail.startsWith("DUPLICATE:")) {
        const parts = detail.split(":");
        const bkNum = parts[1] ?? "";
        const bkStatus = parts[2] ?? "";
        const catName = parts[3] ?? "";
        const completedStatuses = ["COMPLETED", "PAID", "CLOSED", "SETTLED", "REFUND_INITIATED", "CANCELLED"];
        if (completedStatuses.includes(bkStatus)) {
          // Shouldn't reach here (backend filters completed), but handle gracefully
          setError("Your previous booking is already completed. Please try again.");
        } else if (bkStatus === "INVOICE_GENERATED") {
          // Invoice is locked — booking is effectively closed for this appliance.
          // Customer can create a new booking for a different appliance.
          const catMsg = catName || "this service";
          setDuplicateBookingNumber(bkNum);
          setError(
            `Booking ${bkNum} for ${catMsg} at this address has a locked invoice. ` +
            `If you need service for a different appliance, please create a new booking.`
          );
        } else {
          const categoryMsg = catName ? ` in the ${catName} category` : "";
          setDuplicateBookingNumber(bkNum);
          setError(`You already have an active booking (${bkNum})${categoryMsg} at this address. Please complete or cancel it before booking again.`);
        }
      } else {
        setError(e?.response?.data?.message || detail || "Booking failed. Please try again.");
      }
    } finally {
      setBooking(false);
    }
  };

  // ── Price strip ──────────────────────────────────────────────────────────
  const PriceStrip = () => (
    <div className="mb-4 rounded-xl px-4 py-3" style={{ background: `${brand}0d`, border: `1px solid ${brand}25` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">
          {selectedCity ? `Price in ${selectedCity.name}` : "Starting price"}
        </span>
        {!isAvailable && (
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
            Unconfirmed city
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-extrabold text-ink-900">₹{price.toLocaleString("en-IN")}</span>
        <span className="text-sm text-ink-400">+ {service.gst_percent}% GST</span>
        <span className="ml-auto text-sm font-semibold text-ink-700">₹{total.toLocaleString("en-IN")} total</span>
      </div>
    </div>
  );

  // ── Profile completeness gate (defence-in-depth) ────────────────────────
  // AllServicesClient.handleBook already redirects, but guard here too in case
  // someone lands here via another path (e.g. URL hash redirect after login).
  const _PLACEHOLDER_NAMES = new Set(["new customer", "new user", "customer", "user"]);
  const _pName = (customer.name ?? "").trim();
  const _pMobile = (customer.mobile ?? "").trim();
  const _profileIncomplete = !_pName || _PLACEHOLDER_NAMES.has(_pName.toLowerCase()) || !_pMobile;

  if (_profileIncomplete) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="text-4xl">👤</div>
        <p className="font-bold text-ink-800 text-sm">Complete Your Profile First</p>
        <p className="text-xs text-ink-500 leading-relaxed">
          We need your <strong>name</strong> and <strong>mobile number</strong> before you can book.
        </p>
        <a
          href="/customer/profile"
          className="block w-full text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity text-center text-sm"
          style={{ background: brand }}
        >
          Update My Profile →
        </a>
      </div>
    );
  }

  // ── Step: Address ────────────────────────────────────────────────────────
  if (step === "address") {
    return (
      <div className="space-y-4">
        <PriceStrip />
        <h4 className="font-bold text-ink-800 text-sm uppercase tracking-wide">Select Service Address</h4>

        {loadingAddr ? (
          <div className="text-sm text-ink-400 text-center py-4">Loading addresses…</div>
        ) : addresses.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-4">
            No saved addresses yet.
            <br />
            <button
              onClick={() => { setEditAddress(undefined); setShowAddModal(true); }}
              className="mt-2 font-semibold underline"
              style={{ color: brand }}
            >
              + Add your first address
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => setSelectedAddr(addr)}
                className="w-full text-left rounded-xl border p-3 transition-all"
                style={
                  selectedAddr?.id === addr.id
                    ? { borderColor: brand, background: `${brand}0a` }
                    : { borderColor: "#e5e5e8", background: "#fff" }
                }
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${brand}18`, color: brand }}
                  >
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="text-xs text-ink-400">Default</span>
                  )}
                </div>
                <p className="text-sm text-ink-700 leading-snug">
                  {addr.address_line1}
                  {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {addr.city}, {addr.state} – {addr.pincode}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditAddress(addr); setShowAddModal(true); }}
                  className="text-xs mt-1 underline"
                  style={{ color: brand }}
                >
                  Edit
                </button>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => { setEditAddress(undefined); setShowAddModal(true); }}
          className="w-full border-2 border-dashed rounded-xl py-2.5 text-sm font-semibold text-ink-500 hover:bg-ink-50 transition-colors"
          style={{ borderColor: `${brand}50` }}
        >
          + Add New Address
        </button>

        <button
          disabled={!selectedAddr}
          onClick={() => setStep("schedule")}
          className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ background: brand }}
        >
          Continue to Schedule →
        </button>

        {showAddModal && (
          <AddressModal
            brand={brand}
            customerId={customer.id}
            existing={editAddress}
            onClose={() => { setShowAddModal(false); setEditAddress(undefined); }}
            onSaved={handleAddressSaved}
          />
        )}
      </div>
    );
  }

  // ── Step: Schedule ───────────────────────────────────────────────────────
  if (step === "schedule") {
    return (
      <div className="space-y-4">
        <PriceStrip />
        <button onClick={() => setStep("address")} className="text-xs text-ink-400 hover:text-ink-700 transition-colors">
          ← Change address
        </button>
        {selectedAddr && (
          <div className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-600">
            📍 {selectedAddr.address_line1}, {selectedAddr.city} – {selectedAddr.pincode}
          </div>
        )}

        <h4 className="font-bold text-ink-800 text-sm uppercase tracking-wide">Pick a Date & Time</h4>

        <div>
          <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Preferred Date</label>
          <input
            type="date"
            value={date}
            min={todayIST()}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide">Time Slot</label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((s) => {
              const isPast = isSlotPastForToday(s.value, date);
              const isSelected = slot === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  disabled={isPast}
                  onClick={() => !isPast && setSlot(s.value)}
                  className="text-xs py-2.5 px-3 rounded-xl border transition-all text-center"
                  style={
                    isPast
                      ? { borderColor: "#e5e7eb", color: "#9CA3AF", background: "#F3F4F6", cursor: "not-allowed", opacity: 0.6 }
                      : isSelected
                      ? { background: brand, borderColor: brand, color: "#fff", fontWeight: 600 }
                      : { borderColor: "#e5e7eb", color: "#4b5563", background: "#fff" }
                  }
                >
                  {s.label}
                  {isPast && <span style={{ display: "block", fontSize: "9px", color: "#9CA3AF" }}>Unavailable</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-500 mb-1 uppercase tracking-wide">Notes (optional)</label>
          <textarea
            rows={2}
            placeholder="Any specific issue or appliance model…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition resize-none"
          />
        </div>

        <button
          disabled={!date || !slot}
          onClick={() => setStep("confirm")}
          className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ background: brand }}
        >
          Review Booking →
        </button>
      </div>
    );
  }

  // ── Step: Confirm ────────────────────────────────────────────────────────
  if (step === "confirm") {
    const mismatch = checkCityMismatch();
    return (
      <div className="space-y-4">
        <h4 className="font-bold text-ink-800 text-sm uppercase tracking-wide">Confirm Your Booking</h4>
        <PriceStrip />

        <div className="bg-ink-50 rounded-xl p-4 space-y-2 text-sm">
          {[
            ["Service", service.name],
            ["Address", `${selectedAddr?.address_line1}, ${selectedAddr?.city} – ${selectedAddr?.pincode}`],
            ["Date", date],
            ["Slot", TIME_SLOTS.find(x => x.value === slot)?.label || slot],
            ["Customer", customer.name],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between gap-2">
              <span className="text-ink-400 flex-shrink-0">{l}</span>
              <span className="font-medium text-ink-800 text-right">{v}</span>
            </div>
          ))}
        </div>

        {/* ── Coupon ── */}
        {!couponCode ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
              className="flex-1 border border-ink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
              style={{ background: brand }}
            >
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ background: "#DCFCE7", border: "1px solid #86EFAC" }}>
            <span className="font-semibold text-green-700">🏷️ {couponCode} — ₹{couponDiscount} off</span>
            <button onClick={removeCoupon} className="text-green-600 text-xs underline ml-2">Remove</button>
          </div>
        )}
        {couponMsg && !couponCode && <p className="text-xs text-red-600">{couponMsg}</p>}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm font-semibold px-1">
            <span className="text-ink-500">Final Amount</span>
            <span className="text-green-700">₹{Math.max(total - couponDiscount, 0).toLocaleString("en-IN")}</span>
          </div>
        )}

        {mismatch && (
          <div className="rounded-xl border border-orange-300 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            ⚠️ Your site city is <strong>{selectedCity?.name}</strong> but the booking address is in <strong>{selectedAddr?.city}</strong>. Make sure the address is correct before confirming.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 space-y-2">
            <p className="font-semibold leading-snug">{error}</p>
            {duplicateBookingNumber && (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/customer/bookings"
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition-colors"
                  style={{ color: "#dc2626" }}
                >
                  📋 View Booking {duplicateBookingNumber}
                </a>
                <span className="text-xs text-red-500">Cancel it there to book again.</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("schedule")}
            className="flex-1 border-2 border-ink-200 text-ink-600 font-semibold py-3 rounded-xl hover:bg-ink-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirmBooking}
            disabled={booking}
            className="flex-1 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: brand }}
          >
            {booking ? "Booking…" : "✅ Confirm"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
