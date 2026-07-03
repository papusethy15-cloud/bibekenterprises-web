"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import BookingTracker from "@/components/BookingTracker";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import * as customerLib from "@/lib/customer";
import { getDomainPageData, getServiceCityPrices, resolveCityPrice } from "@/lib/domain";
import { CustomerAddress, DomainService, ServiceCityPrice } from "@/types";

const TIME_SLOTS = [
  "8:00 AM – 10:00 AM", "10:00 AM – 12:00 PM", "12:00 PM – 2:00 PM",
  "2:00 PM – 4:00 PM",  "4:00 PM – 6:00 PM",   "6:00 PM – 8:00 PM",
];

const INPUT = "w-full border border-ink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition";

type Step = 1 | 2 | 3 | 4;

interface Props {
  siteName: string;
  logoUrl: string | null;
  brand: string;
  phone: string;
  services: DomainService[];
  domainId: string;
}

interface AddressForm {
  label: string; address_line1: string; address_line2: string;
  city: string; state: string; pincode: string; is_default: boolean;
}

const BLANK_ADDR: AddressForm = {
  label: "Home", address_line1: "", address_line2: "",
  city: "", state: "", pincode: "", is_default: false,
};

export default function BookingClient({ brand, phone, services, domainId }: Props) {
  const router      = useRouter();
  const params      = useSearchParams();
  const preSlug     = params.get("service") ?? "";
  // Read ?city= param passed by CityPriceSelector / mobile bar
  const cityParam   = params.get("city") ?? "";
  const { hydrated, isLoggedIn, customer, syncUserName } = useAuth();
  // Global city context (set when user picks city in header modal)
  const { selectedCity: globalCity } = useCity();

  /* ── Redirect to login if not authenticated ──────────────────────────── */
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      const dest = "/booking" + (preSlug ? `?service=${encodeURIComponent(preSlug)}` : "") + (cityParam ? `${preSlug ? "&" : "?"}city=${encodeURIComponent(cityParam)}` : "");
      router.replace(`/login?redirect=${encodeURIComponent(dest)}`);
    }
  }, [hydrated, isLoggedIn, router, preSlug, cityParam]);

  /* ── Active city: URL param > global context ─────────────────────────── */
  const activeCityName = cityParam || globalCity?.name || "";

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [step,          setStep]          = useState<Step>(1);
  const [submitted,     setSubmitted]     = useState(false);
  const [bookingNo,     setBookingNo]     = useState("");
  const [bookingId,     setBookingId]     = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  /* Service selection */
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceSearch,     setServiceSearch]     = useState("");
  const [applianceBrand,    setApplianceBrand]    = useState("");
  const [applianceModel,    setApplianceModel]    = useState("");
  const [notes,             setNotes]             = useState("");

  /* City-aware pricing for the selected service */
  const [cityPrices,    setCityPrices]    = useState<ServiceCityPrice[]>([]);
  const [loadingPrice,  setLoadingPrice]  = useState(false);

  /* Address */
  const [addresses,         setAddresses]         = useState<CustomerAddress[]>([]);
  const [loadingAddresses,  setLoadingAddresses]  = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddrForm,      setShowAddrForm]      = useState(false);
  const [addrForm,          setAddrForm]          = useState<AddressForm>(BLANK_ADDR);
  const [savingAddr,        setSavingAddr]        = useState(false);
  const [addrError,         setAddrError]         = useState("");

  /* Schedule */
  const [date,     setDate]     = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  /* Coupon */
  const [couponCode,     setCouponCode]     = useState("");
  const [couponInput,    setCouponInput]    = useState("");
  const [couponId,       setCouponId]       = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg,      setCouponMsg]      = useState("");
  const [couponLoading,  setCouponLoading]  = useState(false);

  /* ── Derived: filtered service list for search ────────────────────────── */
  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services.slice(0, 5); // show first 5 when no search
    return services.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.category_name?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [services, serviceSearch]);

  /* ── Resolve pre-selected service from ?service= param ───────────────── */
  const selectedService = services.find((s) => s.service_id === selectedServiceId) ?? null;

  useEffect(() => {
    if (!preSlug || !services.length) return;
    // Match by name-derived slug (how CityPriceSelector and mobile bar encode it)
    const match =
      services.find((s) => s.name.toLowerCase().replace(/\s+/g, "-") === preSlug.toLowerCase()) ??
      services.find((s) => s.name.toLowerCase() === preSlug.toLowerCase());
    if (match) setSelectedServiceId(match.service_id);
  }, [preSlug, services]);

  /* ── Fetch city prices whenever the selected service changes ─────────── */
  useEffect(() => {
    if (!selectedServiceId) { setCityPrices([]); return; }
    setLoadingPrice(true);
    getServiceCityPrices(selectedServiceId)
      .then(setCityPrices)
      .catch(() => setCityPrices([]))
      .finally(() => setLoadingPrice(false));
  }, [selectedServiceId]);

  /* ── Resolved price for the selected service + active city ──────────── */
  const { price: resolvedPrice } = useMemo(
    () => resolveCityPrice(selectedService?.base_price ?? 0, cityPrices, activeCityName),
    [selectedService, cityPrices, activeCityName]
  );

  /* ── Load saved addresses once customer profile is known ─────────────── */
  const loadAddresses = useCallback(async () => {
    if (!customer?.id) return;
    setLoadingAddresses(true);
    try {
      const list = await customerLib.getAddresses(customer.id);
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) { setSelectedAddressId(def.id); setShowAddrForm(false); }
      else { setShowAddrForm(true); }
    } catch { setShowAddrForm(true); }
    finally { setLoadingAddresses(false); }
  }, [customer?.id]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  /* ── Save new address ──────────────────────────────────────────────────── */
  const handleSaveAddress = async () => {
    setAddrError("");
    const { address_line1, city, state, pincode } = addrForm;
    if (!address_line1 || !city || !state || !pincode) {
      setAddrError("Please fill address, city, state and pincode."); return;
    }
    if (!/^\d{6}$/.test(pincode)) { setAddrError("Enter a valid 6-digit pincode."); return; }
    if (!customer?.id) return;
    setSavingAddr(true);
    try {
      const saved = await customerLib.addAddress(customer.id, {
        ...addrForm, is_default: addresses.length === 0,
      });
      const newAddr: CustomerAddress = { ...addrForm, id: saved.id, is_default: addresses.length === 0, address_line2: addrForm.address_line2 || null };
      setAddresses((p) => [...p, newAddr]);
      setSelectedAddressId(saved.id);
      setShowAddrForm(false);
      setAddrForm(BLANK_ADDR);
    } catch (e: any) {
      setAddrError(e?.response?.data?.message ?? "Could not save address.");
    } finally { setSavingAddr(false); }
  };

  /* ── Apply coupon ────────────────────────────────────────────────────────── */
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponMsg("");
    try {
      const res = await api.post("/coupons/validate", {
        code: couponInput.trim().toUpperCase(),
        order_amount: resolvedPrice,
        domain_id: domainId || undefined,
      });
      const d = res.data.data;
      setCouponCode(d.code);
      setCouponId(d.coupon_id || "");
      setCouponDiscount(d.discount_amount);
      setCouponMsg(`✅ "${d.code}" applied — ₹${d.discount_amount} off!`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Invalid coupon code";
      setCouponMsg(`❌ ${msg}`);
      setCouponCode(""); setCouponId(""); setCouponDiscount(0);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => {
    setCouponCode(""); setCouponInput(""); setCouponDiscount(0); setCouponMsg("");
  };

  /* ── Submit booking ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!selectedServiceId) { setError("Please select a service."); return; }
    if (!selectedAddressId) { setError("Please add a service address."); return; }
    if (!date || !timeSlot) { setError("Please pick a date and time slot."); return; }
    setSaving(true); setError("");
    try {
      const res = await customerLib.createBooking({
        service_id:      selectedServiceId,
        address_id:      selectedAddressId,
        scheduled_date:  new Date(`${date}T00:00:00`).toISOString(),
        scheduled_slot:  timeSlot,
        appliance_brand: applianceBrand || undefined,
        appliance_model: applianceModel || undefined,
        notes:           notes || undefined,
        source:          "WEBSITE",
        domain_id:       domainId || undefined,
        city_id:         globalCity?.id || undefined,
        coupon_code:     couponCode || undefined,
        coupon_id:       couponId || undefined,
        coupon_discount: couponDiscount > 0 ? couponDiscount : undefined,
        base_amount:     resolvedPrice || undefined,
      });
      setBookingNo(res.booking_number);
      setBookingId(res.id);
      // Sync real customer name into auth context so header shows correct name
      if (customer?.name) syncUserName(customer.name);
      setSubmitted(true);
    } catch (e: any) {
      const msg: string = e?.response?.data?.detail ?? e?.response?.data?.message ?? "";
      if (msg.startsWith("DUPLICATE:")) {
        const parts = msg.split(":");
        const bkNum = parts[1] ?? "";
        const bkStatus = parts[2] ?? "";
        const completedStatuses = ["COMPLETED", "PAID", "CLOSED", "SETTLED"];
        if (completedStatuses.includes(bkStatus)) {
          setError("Your previous booking for this service is already completed. Please try again.");
        } else {
          setError(`You already have an active booking (${bkNum}) for this service at this address. Please wait for it to complete before booking again.`);
        }
      } else {
        setError(msg || "Could not create booking. Please try again.");
      }
    } finally { setSaving(false); }
  };

  /* ── Guard ──────────────────────────────────────────────────────────────── */
  if (!hydrated || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#1A3FA4 transparent #1A3FA4 #1A3FA4" }} />
      </div>
    );
  }

  /* ── Confirmation screen ──────────────────────────────────────────────── */
  if (submitted) {
    return (
      <BookingTracker
        bookingId={bookingId}
        bookingNumber={bookingNo}
        brand={brand}
        onBack={() => router.push("/customer/bookings")}
      />
    );
  }

  /* ── (original summary kept below for reference — dead code) ─ */
  if (false && submitted) {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: `${brand}15` }}>✅</div>
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Booking Confirmed!</h1>
          <p className="text-ink-400 mb-6">Your booking has been received. We'll assign a technician shortly and notify you via SMS & WhatsApp.</p>
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(242,101,34,0.06)", border: "1px solid rgba(242,101,34,0.25)" }}>
            <p className="text-sm text-ink-400 mb-1">Booking Number</p>
            <p className="text-2xl font-bold" style={{ color: "#F26522" }}>{bookingNo}</p>
          </div>
          <div className="text-left space-y-2 text-sm text-ink-600 mb-8 bg-ink-50 rounded-xl p-4">
            {[
              ["Service",   selectedService?.name ?? "—"],
              ["Price",     `₹${resolvedPrice.toLocaleString("en-IN")}${activeCityName ? ` (${activeCityName})` : ""}`],
              ...(couponDiscount > 0 ? [
                ["Coupon", couponCode],
                ["Discount", `-₹${couponDiscount.toLocaleString("en-IN")}`],
                ["Final Amount", `₹${Math.max(resolvedPrice - couponDiscount, 0).toLocaleString("en-IN")}`],
              ] : []),
              ["Date",      date],
              ["Time",      timeSlot],
              ["Address",   addr ? `${addr.address_line1}, ${addr.city} – ${addr.pincode}` : "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-4">
                <span className="text-ink-400 shrink-0">{l}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Link href="/customer/bookings" className="flex-1 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity text-center" style={{ background: "#1A3FA4" }}>
              View My Bookings
            </Link>
            <Link href="/" className="flex-1 border-2 border-ink-200 text-ink-600 font-semibold py-3 rounded-xl hover:bg-ink-50 transition-colors text-center">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step wizard ─────────────────────────────────────────────────────────── */
  const STEPS = [
    { label: "Service",  icon: "🔧" },
    { label: "Address",  icon: "📍" },
    { label: "Schedule", icon: "📅" },
    { label: "Confirm",  icon: "✅" },
  ];

  const canNext: Record<Step, boolean> = {
    1: !!selectedServiceId,
    2: !!selectedAddressId,
    3: !!date && !!timeSlot,
    4: true,
  };

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 mb-1">Book a Service</h1>
          <p className="text-ink-400 text-sm">
            Logged in as <span className="font-medium text-ink-700">{customer?.name}</span>
            {activeCityName && (
              <> · <span className="font-medium" style={{ color: brand }}>📍 {activeCityName}</span></>
            )}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-ink-200 z-0" />
          {STEPS.map((s, i) => {
            const num = (i + 1) as Step;
            const isActive = step === num;
            const isDone   = step > num;
            return (
              <div key={s.label} className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background: isDone || isActive ? "#1A3FA4" : "white", color: isDone || isActive ? "white" : "#9ca3af", border: isDone || isActive ? "none" : "2px solid #e5e7eb", boxShadow: isActive ? "0 0 0 4px rgba(26,63,164,0.2)" : "none" }}>
                  {isDone ? "✓" : s.icon}
                </div>
                <span className="text-xs font-medium" style={{ color: isActive ? "#1A3FA4" : "#9ca3af" }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-6 md:p-8">

          {/* ── Step 1: Service ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink-900 mb-1">What needs fixing?</h2>

              {/* City badge */}
              {activeCityName && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: `${brand}15`, color: brand }}>
                  📍 Prices for {activeCityName}
                </div>
              )}

              {/* Search box */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 text-base pointer-events-none">🔍</span>
                <input
                  type="text"
                  placeholder={`Search from ${services.length} services…`}
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full border border-ink-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 text-lg leading-none"
                  >×</button>
                )}
              </div>

              {/* Service list */}
              <div className="grid grid-cols-1 gap-2">
                {filteredServices.length === 0 ? (
                  <p className="text-sm text-ink-400 text-center py-6">
                    No services match "{serviceSearch}". Try a different keyword.
                  </p>
                ) : (
                  filteredServices.map((s) => {
                    const { price } = resolveCityPrice(s.base_price, cityPrices, activeCityName);
                    // For the list we use base_price per service; city prices are fetched only for
                    // the selected service. Show base_price for non-selected rows (fast), and the
                    // resolved city price for the selected row (once loaded).
                    const displayPrice = s.service_id === selectedServiceId
                      ? (loadingPrice ? s.base_price : resolvedPrice)
                      : s.base_price;

                    return (
                      <button
                        key={s.service_id}
                        type="button"
                        onClick={() => setSelectedServiceId(s.service_id)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm text-left transition-all"
                        style={{
                          borderColor:  selectedServiceId === s.service_id ? "#1A3FA4" : "#e5e7eb",
                          background:   selectedServiceId === s.service_id ? "rgba(26,63,164,0.05)" : "white",
                          fontWeight:   selectedServiceId === s.service_id ? 600 : 400,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{s.name}</span>
                          {s.category_name && (
                            <span className="block text-[11px] text-ink-400 font-normal mt-0.5">{s.category_name}</span>
                          )}
                        </div>
                        <div className="shrink-0 ml-3 text-right">
                          <span className="text-ink-700 font-semibold">
                            ₹{displayPrice.toLocaleString("en-IN")}
                          </span>
                          {activeCityName && s.service_id === selectedServiceId && !loadingPrice && resolvedPrice !== s.base_price && (
                            <span className="block text-[10px]" style={{ color: brand }}>📍 {activeCityName}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}

                {/* Hint when no search and more services exist */}
                {!serviceSearch && services.length > 5 && (
                  <p className="text-xs text-ink-400 text-center pt-1">
                    Showing 5 of {services.length} services — type to search all
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Appliance Brand <span className="text-ink-300">(optional)</span></label>
                  <input type="text" placeholder="e.g. Samsung, LG" value={applianceBrand} onChange={(e) => setApplianceBrand(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Model <span className="text-ink-300">(optional)</span></label>
                  <input type="text" placeholder="e.g. AC 1.5 Ton" value={applianceModel} onChange={(e) => setApplianceModel(e.target.value)} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Issue description <span className="text-ink-300">(optional)</span></label>
                <textarea placeholder="Describe the problem briefly…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT + " resize-none"} />
              </div>
            </div>
          )}

          {/* ── Step 2: Address ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ink-900">Service Address</h2>
                {addresses.length > 0 && !showAddrForm && (
                  <button onClick={() => setShowAddrForm(true)} className="text-sm font-medium" style={{ color: brand }}>
                    + Add new
                  </button>
                )}
              </div>

              {loadingAddresses ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#1A3FA4 transparent #1A3FA4 #1A3FA4" }} />
                </div>
              ) : !showAddrForm ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <button key={addr.id} type="button" onClick={() => setSelectedAddressId(addr.id)}
                      className="w-full text-left flex gap-3 items-start p-4 rounded-xl border-2 transition-all"
                      style={{ borderColor: selectedAddressId === addr.id ? "#1A3FA4" : "#e5e7eb", background: selectedAddressId === addr.id ? "rgba(26,63,164,0.05)" : "white" }}>
                      <span className="text-lg shrink-0">📍</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink-900">{addr.label}</p>
                        <p className="text-sm text-ink-500 mt-0.5 truncate">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                        <p className="text-sm text-ink-500">{addr.city}, {addr.state} – {addr.pincode}</p>
                      </div>
                      {selectedAddressId === addr.id && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0 mt-0.5" style={{ background: brand }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                /* ── New address form ── */
                <div className="space-y-4 bg-ink-50 rounded-xl p-5">
                  <h3 className="font-semibold text-ink-900 text-sm">Add new address</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["Home", "Work", "Other"].map((l) => (
                      <button key={l} type="button" onClick={() => setAddrForm((f) => ({ ...f, label: l }))}
                        className="py-2 rounded-lg text-sm font-medium border transition-all"
                        style={{ background: addrForm.label === l ? "#1A3FA4" : "white", color: addrForm.label === l ? "white" : "#374151", borderColor: addrForm.label === l ? "#1A3FA4" : "#e5e7eb" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="House/flat/street *" value={addrForm.address_line1} onChange={(e) => setAddrForm((f) => ({ ...f, address_line1: e.target.value }))} className={INPUT} />
                  <input type="text" placeholder="Landmark/area (optional)" value={addrForm.address_line2} onChange={(e) => setAddrForm((f) => ({ ...f, address_line2: e.target.value }))} className={INPUT} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="City *" value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} className={INPUT} />
                    <input type="text" placeholder="State *" value={addrForm.state} onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))} className={INPUT} />
                  </div>
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="Pincode *" value={addrForm.pincode} onChange={(e) => setAddrForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={INPUT} />
                  {addrError && <p className="text-sm text-red-600">{addrError}</p>}
                  <div className="flex gap-3">
                    {addresses.length > 0 && (
                      <button onClick={() => { setShowAddrForm(false); setAddrError(""); }} className="flex-1 border-2 border-ink-200 text-ink-600 font-medium py-2.5 rounded-xl text-sm">Cancel</button>
                    )}
                    <button onClick={handleSaveAddress} disabled={savingAddr} className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity" style={{ background: brand }}>
                      {savingAddr ? "Saving…" : "Save Address"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Schedule ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink-900 mb-4">Pick a Date & Time</h2>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1.5">Preferred Date *</label>
                <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-2">Preferred Time Slot *</label>
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <button key={slot} type="button" onClick={() => setTimeSlot(slot)}
                      className="text-sm py-2.5 px-4 rounded-xl border-2 transition-all text-left"
                      style={{ background: timeSlot === slot ? "#1A3FA4" : "white", borderColor: timeSlot === slot ? "#1A3FA4" : "#e5e7eb", color: timeSlot === slot ? "white" : "#4b5563", fontWeight: timeSlot === slot ? 600 : 400 }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ──────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-ink-900 mb-4">Confirm Booking</h2>
              <div className="bg-ink-50 rounded-xl p-5 space-y-3 text-sm">
                {[
                  ["Customer",  customer?.name ?? "—"],
                  ["Mobile",    customer?.mobile ?? "—"],
                  ["Service",   selectedService?.name ?? "—"],
                  ["Price",     selectedService
                    ? `₹${resolvedPrice.toLocaleString("en-IN")}${activeCityName && resolvedPrice !== selectedService.base_price ? ` (${activeCityName} rate)` : ""}`
                    : "—"],
                  ["Brand/Model", [applianceBrand, applianceModel].filter(Boolean).join(" / ") || "—"],
                  ["Address",   selectedAddr ? `${selectedAddr.address_line1}, ${selectedAddr.city} – ${selectedAddr.pincode}` : "—"],
                  ["Date",      date],
                  ["Time Slot", timeSlot],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-ink-400 shrink-0">{l}</span>
                    <span className="font-medium text-ink-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
              {/* ── Coupon section ── */}
              {!couponCode ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Coupon code (optional)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    className="flex-1 border border-ink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "#1A3FA4" }}
                  >
                    {couponLoading ? "…" : "Apply"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ background: "#DCFCE7", border: "1px solid #86EFAC" }}>
                  <span className="font-semibold text-green-700">🏷️ {couponCode} — ₹{couponDiscount} off</span>
                  <button onClick={removeCoupon} className="text-green-600 hover:text-green-800 text-xs underline ml-2">Remove</button>
                </div>
              )}
              {couponMsg && !couponCode && (
                <p className="text-sm text-red-600 -mt-1">{couponMsg}</p>
              )}
              {couponDiscount > 0 && (
                <div className="bg-ink-50 rounded-xl px-4 py-3 text-sm flex justify-between">
                  <span className="text-ink-400">Final Amount</span>
                  <div className="text-right">
                    <span className="line-through text-ink-300 text-xs mr-2">₹{resolvedPrice.toLocaleString("en-IN")}</span>
                    <span className="font-bold text-green-700">₹{Math.max(resolvedPrice - couponDiscount, 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(26,63,164,0.06)", border: "1px solid rgba(26,63,164,0.2)", color: "#1A3FA4" }}>
                💡 A technician will be assigned within 30 minutes. Final amount is confirmed after inspection.
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex-1 border-2 border-ink-200 text-ink-600 font-semibold py-3 rounded-xl hover:bg-ink-50 transition-colors">
                ← Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => { if (canNext[step]) setStep((s) => (s + 1) as Step); }}
                disabled={!canNext[step]}
                className="flex-1 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: "#1A3FA4" }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="flex-1 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60" style={{ background: "#F26522", boxShadow: "0 4px 16px rgba(242,101,34,0.4)" }}>
                {saving ? "Submitting…" : "✅ Confirm Booking"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-ink-400 mt-6">
          Need help? Call us at{" "}
          <a href={`tel:${phone.replace(/\s/g, "")}`} style={{ color: "#F26522" }} className="font-medium hover:underline">{phone}</a>
        </p>
      </div>
    </div>
  );
}
