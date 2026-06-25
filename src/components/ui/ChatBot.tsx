"use client";
/**
 * ChatBot.tsx — Advanced floating chatbot widget for bibekenterprises
 * Fixed issues:
 *  1. Service name shown from FK join (backend fixed), frontend shows it correctly
 *  2. "My Other Bookings" quick reply now shows bookings, not triggers new booking
 *  3. Date calculation fixed: "Day After Tomorrow" = today+2, "Tomorrow" = today+1
 *  4. Address display in booking summary shows actual address text
 *  5. Duplicate booking 409 handled gracefully with force-book option
 *  6. Step flow simplified: collect_slot → pick slot → collect_appliance → brand/model → confirm_booking → summary+confirm
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { sendOtp, verifyOtp, isLoggedIn, getCachedCustomer } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "bot" | "user";
  text: string;
  quickReplies?: string[];
  services?: { id: string; name: string; base_price?: number }[];
  contact?: { phone: string; whatsapp: string; address: string };
  ts: number;
}

type ChatStep =
  | "idle"
  | "collect_otp_mobile"
  | "collect_otp_code"
  | "collect_name"
  | "pick_service"
  | "pick_address"
  | "collect_address"
  | "collect_date"
  | "collect_slot"
  | "collect_appliance"
  | "awaiting_confirm"
  | "callback_mobile"
  | "callback_name"
  | "ask_booking_number";

interface BookingDraft {
  service_id?: string;
  service_name?: string;
  address_id?: string;
  address_label?: string;
  address_display?: string; // full readable text for summary
  city?: string;
  scheduled_date?: string;
  scheduled_slot?: string;
  appliance_brand?: string;
  appliance_model?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DOMAIN_ID = process.env.NEXT_PUBLIC_DOMAIN_ID || "";

/** Returns YYYY-MM-DD for today + N days, purely date arithmetic (no timezone shift) */
function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a user date input: "tomorrow", "day after tomorrow", or YYYY-MM-DD */
function parseUserDate(input: string): string {
  const l = input.toLowerCase().trim();
  if (l === "tomorrow" || l === "1") return todayPlus(1);
  if (l.includes("day after") || l === "2") return todayPlus(2);
  const match = input.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  return todayPlus(1); // default
}

const TIME_SLOTS = [
  "9:00 AM – 11:00 AM",
  "11:00 AM – 1:00 PM",
  "2:00 PM – 4:00 PM",
  "4:00 PM – 6:00 PM",
];

// ── Main Component ────────────────────────────────────────────────────────────
interface ChatBotProps {
  phone?: string;
  brand?: string;
}

export default function ChatBot({ phone = "", brand = "#1A3FA4" }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ChatStep>("idle");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({});
  const [otpMobile, setOtpMobile] = useState("");
  const [callbackMobile, setCallbackMobile] = useState("");
  const [availableServices, setAvailableServices] = useState<{ id: string; name: string; base_price?: number }[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; address_line1: string; city: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 100); setUnreadCount(0); }
  }, [open]);

  const addBot = useCallback((text: string, quickReplies?: string[], extras?: Partial<ChatMessage>) => {
    setMessages(prev => [...prev, { role: "bot", text, quickReplies, ts: Date.now(), ...extras }]);
    if (!open) setUnreadCount(c => c + 1);
  }, [open]);

  const addUser = (text: string) => setMessages(prev => [...prev, { role: "user", text, ts: Date.now() }]);

  // ── Initial greeting ───────────────────────────────────────────────────────
  const initChat = useCallback(async () => {
    if (messages.length > 0) return;
    setLoading(true);
    try {
      const res = await api.post("/chatbot/message", { message: "hello" });
      const d = res.data.data;
      addBot(d.reply, d.quick_replies);
    } catch {
      addBot(
        "👋 Hello! I'm your service assistant. How can I help you today?",
        ["Book a Service", "My Booking Status", "Our Services", "Contact Us"]
      );
    }
    setLoading(false);
  }, [messages.length, addBot]);

  useEffect(() => { if (open) initChat(); }, [open, initChat]);

  const callNLP = async (text: string) => {
    const res = await api.post("/chatbot/message", { message: text });
    return res.data.data;
  };

  // ── Load services ──────────────────────────────────────────────────────────
  const loadServices = async () => {
    try {
      const res = await api.get("/services", { params: { domain_id: DOMAIN_ID, limit: 30 } });
      const svcs = res.data?.data?.items || res.data?.data || [];
      setAvailableServices(svcs);
      if (svcs.length === 0) {
        addBot("⚠️ No services available at the moment. Please contact us directly.", ["Contact Us", "Back to Menu"]);
        return;
      }
      const lines = svcs.slice(0, 10).map((s: any, i: number) => `${i + 1}. ${s.name}`).join("\n");
      addBot(
        `🔧 Please choose a service:\n\n${lines}\n\nType the service name or number:`,
        svcs.slice(0, 6).map((s: any) => s.name)
      );
      setStep("pick_service");
    } catch {
      addBot("⚠️ Couldn't load services. Please try again.", ["Retry", "Contact Us"]);
    }
  };

  // ── Load addresses ─────────────────────────────────────────────────────────
  const loadSavedAddresses = async () => {
    try {
      const me = await api.get("/customers/me");
      const customerId = me.data?.data?.id;
      const res = await api.get(`/customers/${customerId}/addresses`);
      const addrs = res.data?.data || [];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        const lines = addrs.map((a: any, i: number) =>
          `${i + 1}. ${a.label}: ${a.address_line1}, ${a.city}`
        ).join("\n");
        addBot(
          `📍 Choose your service address:\n\n${lines}\n\nor type **new** to enter a different address.`,
          [...addrs.map((a: any) => a.label), "New Address"]
        );
        setStep("pick_address");
      } else {
        addBot("📍 Please enter your **complete address** (Street, Area, City, Pincode):");
        setStep("collect_address");
      }
    } catch {
      addBot("📍 Please enter your **complete address** (Street, Area, City, Pincode):");
      setStep("collect_address");
    }
  };

  // ── Ask for date after address is set ─────────────────────────────────────
  const askDate = (addressDisplay: string) => {
    addBot(
      `📍 Address: **${addressDisplay}**\n\n📅 Please choose a **preferred date**:`,
      ["Tomorrow", "Day After Tomorrow"]
    );
    setStep("collect_date");
  };

  // ── Ask for time slot ──────────────────────────────────────────────────────
  const askSlot = (date: string) => {
    const slotLines = TIME_SLOTS.map((s, i) => `${i + 1}. ${s}`).join("\n");
    addBot(`📅 Date: **${date}**\n\n⏰ Choose a time slot:\n\n${slotLines}`, TIME_SLOTS);
    setStep("collect_slot");
  };

  // ── Ask appliance ──────────────────────────────────────────────────────────
  const askAppliance = (slot: string) => {
    addBot(
      `⏰ Slot: **${slot}**\n\n🏷️ Enter your **appliance brand and model** (e.g. "LG WF550" or type 'skip'):`,
      ["Skip"]
    );
    setStep("collect_appliance");
  };

  // ── Show booking summary ───────────────────────────────────────────────────
  const showSummary = (draft: BookingDraft) => {
    const summary =
      `📋 **Booking Summary**\n\n` +
      `🔧 Service: **${draft.service_name || "—"}**\n` +
      `📍 Address: ${draft.address_display || draft.address_label || "—"}\n` +
      `📅 Date: **${draft.scheduled_date || "Tomorrow"}**\n` +
      `⏰ Slot: **${draft.scheduled_slot || TIME_SLOTS[0]}**\n` +
      (draft.appliance_brand ? `🏷️ Appliance: ${draft.appliance_brand} ${draft.appliance_model || ""}\n` : "") +
      `\nShall I confirm this booking?`;
    addBot(summary, ["✅ Confirm Booking", "❌ Cancel Booking"]);
    setStep("awaiting_confirm");
  };

  // ── Submit booking ─────────────────────────────────────────────────────────
  const submitBooking = async (draft: BookingDraft, force = false) => {
    setLoading(true);
    try {
      const payload: any = {
        service_id: draft.service_id || undefined,
        address_id: draft.address_id || undefined,
        service_name: draft.service_name,
        address_line: draft.address_display,
        city: draft.city,
        scheduled_date: new Date(draft.scheduled_date || todayPlus(1) + "T10:00:00").toISOString(),
        scheduled_slot: draft.scheduled_slot || TIME_SLOTS[0],
        appliance_brand: draft.appliance_brand,
        appliance_model: draft.appliance_model,
        source: "WEBSITE",
        domain_id: DOMAIN_ID || undefined,
        notes: "Booked via chatbot",
        ...(force ? { force_duplicate: true } : {}),
      };
      const res = await api.post("/bookings", payload);
      const bk = res.data.data;
      addBot(
        `✅ **Booking Confirmed!**\n\n` +
        `🎫 Booking Number: **${bk.booking_number}**\n` +
        `📋 Status: ${bk.status}\n\n` +
        `Our team will contact you to confirm the appointment. Thank you! 🙏`,
        ["My Booking Status", "Book Another Service", "Back to Menu"]
      );
      setStep("idle");
      setBookingDraft({});
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";
      if (err?.response?.status === 409 && detail.startsWith("DUPLICATE:")) {
        // Parse: DUPLICATE:BK12345678:CONFIRMED
        const parts = detail.split(":");
        const existingBk = parts[1] || "";
        const existingStatus = parts[2] || "";
        addBot(
          `⚠️ **Duplicate Booking Detected**\n\n` +
          `You already have an active booking **${existingBk}** (${existingStatus}) for this service at this address.\n\n` +
          `Would you like to **book again anyway**, or check your existing booking?`,
          ["Book Anyway", `Check ${existingBk}`, "Cancel"]
        );
        // Store draft so "Book Anyway" can force-submit
        setBookingDraft(prev => ({ ...prev, _forceRef: existingBk } as any));
        setStep("awaiting_confirm");
      } else {
        addBot(
          `❌ Booking failed: ${detail || "Please try again."}\n\nContact us if the problem persists.`,
          ["Try Again", "Contact Us", "Back to Menu"]
        );
        setStep("idle");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Start booking ──────────────────────────────────────────────────────────
  const startBookingFlow = async () => {
    if (isLoggedIn()) {
      await loadServices();
    } else {
      addBot(
        "🔐 To book a service, I'll need to verify your mobile number first.\n\nPlease enter your **10-digit mobile number**:"
      );
      setStep("collect_otp_mobile");
    }
  };

  // ── Show my bookings (logged-in) ───────────────────────────────────────────
  const showMyBookings = async () => {
    if (!isLoggedIn()) {
      addBot(
        "📋 Please enter your **booking number** (starts with BK) to check status:",
        []
      );
      setStep("ask_booking_number");
      return;
    }
    try {
      const res = await api.get("/bookings", { params: { limit: 5 } });
      const items = res.data?.data?.items || [];
      if (items.length === 0) {
        addBot("📋 You don't have any bookings yet.", ["Book a Service", "Back to Menu"]);
      } else {
        const lines = items
          .map((b: any) => `• **${b.booking_number}** — ${b.service_name || "Service"} — ${b.status}`)
          .join("\n");
        addBot(
          `📋 **Your Recent Bookings:**\n\n${lines}\n\nType a booking number (e.g. BK53607026) for more details.`,
          ["Book a Service", "Back to Menu"]
        );
        setStep("ask_booking_number");
      }
    } catch {
      addBot("❌ Couldn't load bookings. Please try again.", ["Retry", "Back to Menu"]);
    }
  };

  // ── Main send handler ──────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    addUser(msg);
    setLoading(true);

    try {
      const lower = msg.toLowerCase();

      // ── STEP: OTP mobile ────────────────────────────────────────────────────
      if (step === "collect_otp_mobile") {
        const mobile = msg.replace(/\D/g, "");
        if (mobile.length !== 10) {
          addBot("⚠️ Please enter a valid 10-digit mobile number.");
          setLoading(false); return;
        }
        setOtpMobile(mobile);
        try {
          const result = await sendOtp(mobile);
          const hint = result.otp ? ` *(Dev OTP: **${result.otp}**)*` : "";
          addBot(`📱 OTP sent to **${mobile}**!${hint}\n\nPlease enter the 6-digit OTP:`);
          setStep("collect_otp_code");
        } catch {
          addBot("❌ Failed to send OTP. Please try again.", ["Retry", "Contact Us"]);
        }
        setLoading(false); return;
      }

      // ── STEP: OTP code ──────────────────────────────────────────────────────
      if (step === "collect_otp_code") {
        const otp = msg.replace(/\D/g, "");
        if (otp.length !== 6) {
          addBot("⚠️ Please enter the 6-digit OTP.");
          setLoading(false); return;
        }
        try {
          const { user } = await verifyOtp(otpMobile, otp);
          const customer = getCachedCustomer();
          if (!customer?.name || customer.name === "New Customer" || customer.name === "New User") {
            addBot(`✅ Mobile verified! Welcome!\n\nWhat's your **name**?`);
            setStep("collect_name");
          } else {
            addBot(`✅ Welcome back, **${customer.name || user.name}**! 🎉`);
            await loadServices();
          }
        } catch {
          addBot("❌ Invalid OTP. Please check and try again.");
        }
        setLoading(false); return;
      }

      // ── STEP: Name ──────────────────────────────────────────────────────────
      if (step === "collect_name") {
        try { await api.put("/customers/me", { name: msg }); } catch { /* non-fatal */ }
        addBot(`Nice to meet you, **${msg}**! 😊`);
        await loadServices();
        setLoading(false); return;
      }

      // ── STEP: Pick service ──────────────────────────────────────────────────
      if (step === "pick_service") {
        const num = parseInt(msg);
        let picked: any = null;
        if (!isNaN(num) && num >= 1 && num <= availableServices.length) {
          picked = availableServices[num - 1];
        } else {
          const lmsg = lower;
          picked = availableServices.find(s =>
            s.name.toLowerCase().includes(lmsg) || lmsg.includes(s.name.toLowerCase().slice(0, 5))
          );
          if (!picked) {
            const candidates = availableServices.filter(s =>
              s.name.toLowerCase().split(" ").some(w => lmsg.includes(w.slice(0, 3)))
            ).slice(0, 5);
            if (candidates.length > 1) {
              setAvailableServices(candidates);
              const lines = candidates.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
              addBot(`🔍 Did you mean one of these?\n\n${lines}`, candidates.map(c => c.name));
              setLoading(false); return;
            }
            if (candidates.length === 1) picked = candidates[0];
          }
        }
        if (!picked) {
          addBot("❓ Couldn't find that service. Please try again.", availableServices.slice(0, 5).map(s => s.name));
          setLoading(false); return;
        }
        setBookingDraft(d => ({ ...d, service_id: picked.id, service_name: picked.name }));
        addBot(`✅ Service selected: **${picked.name}**\n\nLet me get your address.`);
        await loadSavedAddresses();
        setLoading(false); return;
      }

      // ── STEP: Pick saved address ────────────────────────────────────────────
      if (step === "pick_address") {
        if (lower === "new" || lower === "new address") {
          addBot("📍 Please enter your **complete address** (Street, Area, City, Pincode):");
          setStep("collect_address");
          setLoading(false); return;
        }
        const num = parseInt(msg);
        let picked: any = null;
        if (!isNaN(num) && num >= 1 && num <= savedAddresses.length) {
          picked = savedAddresses[num - 1];
        } else {
          picked = savedAddresses.find(a =>
            a.label.toLowerCase().includes(lower) || a.city.toLowerCase().includes(lower)
          );
        }
        if (!picked) {
          addBot("❓ Please choose a valid address number or type 'new'.",
            [...savedAddresses.map(a => a.label), "New Address"]);
          setLoading(false); return;
        }
        const addrDisplay = `${picked.address_line1}, ${picked.city}`;
        setBookingDraft(d => ({
          ...d,
          address_id: picked.id,
          address_label: picked.label,
          address_display: addrDisplay,
          city: picked.city,
        }));
        askDate(`${picked.label}: ${addrDisplay}`);
        setLoading(false); return;
      }

      // ── STEP: Free-text address ─────────────────────────────────────────────
      if (step === "collect_address") {
        const parts = msg.split(",").map(p => p.trim());
        const city = parts.length >= 2 ? parts[parts.length - 2] : "Bhubaneswar";
        setBookingDraft(d => ({ ...d, address_display: msg, city }));
        askDate(msg);
        setLoading(false); return;
      }

      // ── STEP: Date selection ────────────────────────────────────────────────
      if (step === "collect_date") {
        const date = parseUserDate(msg);
        setBookingDraft(d => ({ ...d, scheduled_date: date }));
        askSlot(date);
        setLoading(false); return;
      }

      // ── STEP: Slot selection ────────────────────────────────────────────────
      if (step === "collect_slot") {
        const num = parseInt(msg);
        let slot = "";
        if (!isNaN(num) && num >= 1 && num <= TIME_SLOTS.length) {
          slot = TIME_SLOTS[num - 1];
        } else {
          slot = TIME_SLOTS.find(s => s.toLowerCase().includes(lower.slice(0, 5))) || TIME_SLOTS[0];
          // Also try matching "4:00" or "PM" patterns
          if (slot === TIME_SLOTS[0] && lower.includes(":")) {
            slot = TIME_SLOTS.find(s => s.toLowerCase().includes(lower.substring(0, 4))) || TIME_SLOTS[0];
          }
          if (slot === TIME_SLOTS[0] && msg.length > 5) {
            // direct match
            const direct = TIME_SLOTS.find(s => s === msg);
            if (direct) slot = direct;
          }
        }
        setBookingDraft(d => ({ ...d, scheduled_slot: slot }));
        askAppliance(slot);
        setLoading(false); return;
      }

      // ── STEP: Appliance brand/model ─────────────────────────────────────────
      if (step === "collect_appliance") {
        let brand: string | undefined;
        let model: string | undefined;
        if (lower !== "skip") {
          const parts = msg.trim().split(" ");
          brand = parts[0];
          model = parts.slice(1).join(" ") || undefined;
        }
        const updatedDraft: BookingDraft = {
          ...bookingDraft,
          appliance_brand: brand,
          appliance_model: model,
        };
        setBookingDraft(updatedDraft);
        showSummary(updatedDraft);
        setLoading(false); return;
      }

      // ── STEP: Awaiting confirm ──────────────────────────────────────────────
      if (step === "awaiting_confirm") {
        if (msg === "Book Anyway") {
          await submitBooking(bookingDraft, true);
          setLoading(false); return;
        }
        if (msg.includes("Check BK") || msg.startsWith("Check ")) {
          const bkNum = msg.replace("Check ", "").trim();
          const d = await callNLP(bkNum);
          addBot(d.reply, d.quick_replies);
          setStep("idle");
          setLoading(false); return;
        }
        if (msg === "✅ Confirm Booking" || lower === "confirm" || lower === "yes") {
          await submitBooking(bookingDraft, false);
          setLoading(false); return;
        }
        // Cancel
        addBot("Booking cancelled. What else can I help you with?",
          ["Book a Service", "Our Services", "Contact Us", "Back to Menu"]);
        setStep("idle");
        setBookingDraft({});
        setLoading(false); return;
      }

      // ── STEP: Booking number lookup ─────────────────────────────────────────
      if (step === "ask_booking_number") {
        // Check if it's a BK number pattern
        if (/BK\d{6,10}/i.test(msg.toUpperCase())) {
          const d = await callNLP(msg);
          addBot(d.reply, d.quick_replies);
          setStep("idle");
        } else if (lower === "book a service") {
          setStep("idle");
          await startBookingFlow();
        } else if (lower === "back to menu") {
          setStep("idle");
          addBot("How can I help you?", ["Book a Service", "My Booking Status", "Our Services", "Contact Us"]);
        } else {
          addBot("Please enter a valid booking number starting with **BK** (e.g. BK53607026).");
        }
        setLoading(false); return;
      }

      // ── STEP: Callback mobile ───────────────────────────────────────────────
      if (step === "callback_mobile") {
        const mobile = msg.replace(/\D/g, "");
        if (mobile.length !== 10) {
          addBot("⚠️ Please enter a valid 10-digit mobile number.");
          setLoading(false); return;
        }
        setCallbackMobile(mobile);
        addBot("👤 What's your **name**? (or type 'skip')");
        setStep("callback_name");
        setLoading(false); return;
      }

      // ── STEP: Callback name ─────────────────────────────────────────────────
      if (step === "callback_name") {
        const name = lower === "skip" ? undefined : msg;
        try {
          await api.post("/chatbot/callback", {
            mobile: callbackMobile,
            name,
            message: "Callback requested via chatbot",
            source: "CHATBOT",
          });
          addBot(
            `✅ **Callback Request Saved!**\n\nWe'll call you at **${callbackMobile}** shortly.\n\n*Business hours: Mon–Sat, 9 AM – 7 PM*`,
            ["Book a Service", "Back to Menu"]
          );
        } catch {
          addBot("❌ Failed to save. Please call us directly.", ["Contact Us"]);
        }
        setStep("idle");
        setLoading(false); return;
      }

      // ── Quick reply shortcuts (idle) ────────────────────────────────────────
      if (lower === "book a service" || lower === "start booking" || lower === "book another service") {
        await startBookingFlow();
        setLoading(false); return;
      }
      if (lower === "my booking status" || lower === "track my booking" || lower === "login to check") {
        await showMyBookings();
        setLoading(false); return;
      }
      // "My Other Bookings" quick reply from booking detail → show bookings list
      if (lower === "my other bookings" || lower === "my bookings") {
        await showMyBookings();
        setLoading(false); return;
      }
      if (lower === "request callback" || lower === "call me") {
        addBot("📞 Sure! Please share your **10-digit mobile number**:");
        setStep("callback_mobile");
        setLoading(false); return;
      }
      if (lower === "back to menu" || lower === "main menu") {
        setStep("idle");
        addBot("How can I help you?",
          ["Book a Service", "My Booking Status", "Our Services", "Contact Us", "Request Callback"]);
        setLoading(false); return;
      }
      if (lower === "retry") {
        await loadServices();
        setLoading(false); return;
      }

      // ── Default: NLP call ───────────────────────────────────────────────────
      const d = await callNLP(msg);
      const extras: Partial<ChatMessage> = {};
      if (d.contact) extras.contact = d.contact;
      if (d.services?.length) extras.services = d.services;
      addBot(d.reply, d.quick_replies, extras);

      // Backend action directives
      if (d.action === "start_booking") {
        setTimeout(() => startBookingFlow(), 400);
      } else if (d.action === "collect_callback_mobile") {
        setStep("callback_mobile");
      } else if (d.action === "ask_booking_number") {
        setStep("ask_booking_number");
      }

    } catch {
      addBot("⚠️ Something went wrong. Please try again.", ["Back to Menu"]);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderMarkdown = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" target="_blank" rel="noopener" style="color:#F26522;text-decoration:underline">$1</a>')
      .replace(/\n/g, "<br/>");

  const BLUE = brand;   // brand color — passed from layout
  const DARK = "#1c1c21";  // ink-700

  // Phone href — clean digits only
  const phoneHref = phone ? `tel:${phone.replace(/\D/g, "")}` : "";
  const showCallBtn = !!phone && !open;

  return (
    <>
      {/* ── Animated Call Button ── */}
      {showCallBtn && (
        <a
          href={phoneHref}
          aria-label={`Call us: ${phone}`}
          className="float-call-btn"
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            zIndex: 9998,
            textDecoration: "none",
          }}
        >
          {/* Ripple rings — sit behind everything */}
          <span className="call-ring call-ring-1" />
          <span className="call-ring call-ring-2" />

          {/* Icon circle */}
          <span className="call-icon-wrap">
            {/* Animated phone handset SVG */}
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              style={{ position: "relative", zIndex: 1 }}
            >
              {/* Handset body */}
              <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C7.61 21 3 16.39 3 10.75c0-.55.45-1 1-1H7.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.23 1L6.6 10.8z"
                fill="white"
              />
              {/* Signal arc 1 */}
              <path
                d="M15.5 1a9 9 0 0 1 0 12.5"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"
                className="call-arc"
                style={{ animationDelay: "0s" }}
              />
              {/* Signal arc 2 */}
              <path
                d="M17.8 3.5a6 6 0 0 1 0 7.5"
                stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none"
                className="call-arc"
                style={{ animationDelay: "0.3s" }}
              />
            </svg>
          </span>

          {/* "Call Now" pill label */}
          <span className="call-label">
            <span style={{ fontSize: 13, fontWeight: 800, color: "white", letterSpacing: "0.01em" }}>
              Call Now
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.82)", display: "block", marginTop: 1, lineHeight: 1 }}>
              {phone}
            </span>
          </span>
        </a>
      )}

      {/* ── Animated Chat Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`float-chat-btn${open ? " chat-open" : ""}`}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: "50%",
          background: open ? "#1c2240" : "#1A3FA4",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.30), 0 0 0 3px rgba(255,255,255,0.9)",
          outline: "none",
          transition: "background 0.25s, transform 0.2s",
        }}
        title="Chat with us"
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        )}
        {!open && unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#EF4444", color: "white", borderRadius: "50%",
            width: 20, height: 20, fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unreadCount}</span>
        )}
      </button>

      {/* ── Chat window — full-screen on mobile, panel on desktop ── */}
      {open && (
        <div
          className="chatbot-window"
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px 16px 0 0",
            overflow: "hidden",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
            fontFamily: "'Inter','Segoe UI',sans-serif",
            fontSize: 14,
            animation: "chatSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #090f2a 0%, #1A3FA4 100%)",
            color: "white", padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Bibek Assistant</div>
              <div style={{ fontSize: 11, opacity: 0.75, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
                Online · Typically replies instantly
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px 12px 6px",
            background: "#F8FAFC", maxHeight: 380, minHeight: 280,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "bot" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", background: BLUE,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: "white", flexShrink: 0, marginRight: 6, alignSelf: "flex-end",
                    }}>🤖</div>
                  )}
                  <div
                    style={{
                      maxWidth: "80%",
                      background: m.role === "user" ? BLUE : "white",
                      color: m.role === "user" ? "white" : "#1E293B",
                      borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                      padding: "9px 12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      lineHeight: 1.55,
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                  />
                </div>

                {/* Service cards */}
                {m.role === "bot" && m.services && m.services.length > 0 && (
                  <div style={{ marginTop: 6, marginLeft: 34 }}>
                    {m.services.slice(0, 4).map(s => (
                      <button key={s.id} onClick={() => handleSend(s.name)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "8px 12px", margin: "3px 0",
                          background: "white", border: "1px solid #E2E8F0",
                          borderRadius: 8, cursor: "pointer", fontSize: 13,
                          color: "#1E293B", transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = BLUE)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
                      >
                        🔧 {s.name}
                        {s.base_price ? <span style={{ color: "#64748B", fontSize: 12 }}> — ₹{s.base_price}</span> : null}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick replies — only show on latest bot message */}
                {m.role === "bot" && m.quickReplies && m.quickReplies.length > 0 && i === messages.length - 1 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 34 }}>
                    {m.quickReplies.map(qr => (
                      <button key={qr} onClick={() => handleSend(qr)}
                        style={{
                          padding: "5px 12px", borderRadius: 20,
                          border: `1.5px solid ${BLUE}`, background: "white",
                          color: BLUE, fontSize: 12, cursor: "pointer", fontWeight: 500,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = "white"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = BLUE; }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: BLUE,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: "white",
                }}>🤖</div>
                <div style={{
                  background: "white", borderRadius: "4px 16px 16px 16px",
                  padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {[0, 1, 2].map(n => (
                      <span key={n} style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#94A3B8",
                        display: "inline-block",
                        animation: "chatbounce 1.2s infinite",
                        animationDelay: `${n * 0.2}s`,
                      }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            background: "white", borderTop: "1px solid #E2E8F0",
            padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
              placeholder="Type a message…"
              disabled={loading}
              style={{
                flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 20,
                padding: "8px 14px", fontSize: 13, outline: "none",
                background: "#F8FAFC", color: "#1E293B", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = BLUE)}
              onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: input.trim() && !loading ? BLUE : "#CBD5E1",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Chat bounce typing indicator */
        @keyframes chatbounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        /* Chat window slide-up */
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        /* Chat window — full screen on mobile, panel on desktop */
        .chatbot-window {
          width: 100vw;
          max-height: 92dvh;
          left: 0; right: 0; bottom: 0;
          border-radius: 20px 20px 0 0;
        }
        @media (min-width: 480px) {
          .chatbot-window {
            width: 380px;
            max-height: 580px;
            left: auto;
            right: 24px;
            bottom: 90px;
            border-radius: 16px;
          }
        }
        /* Call button — ALWAYS visible on all screens */
        .float-call-btn {
          display: flex;
          animation: callPulse 2.4s ease-in-out infinite;
          background: #F26522 !important;
          border: 3px solid white !important;
        }
        /* Call ripple rings */
        .call-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid rgba(242,101,34,0.55);
          animation: callRing 2.4s ease-out infinite;
        }
        .call-ring-2 { animation-delay: 0.8s; }
        @keyframes callRing {
          0%   { transform: scale(1);    opacity: 0.7; }
          100% { transform: scale(1.85); opacity: 0; }
        }
        @keyframes callPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        /* Call label — desktop only */
        .call-label { display: none; }
        @media (min-width: 480px) {
          .float-call-btn {
            border-radius: 28px;
            width: auto;
            padding: 0 18px 0 14px;
            gap: 8px;
            height: 48px;
          }
          .call-label {
            display: inline;
            color: white;
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
          }
        }
        /* Chat FAB idle wiggle */
        .float-chat-btn:not(.chat-open) {
          animation: chatWiggle 4s ease-in-out infinite;
        }
        @keyframes chatWiggle {
          0%, 85%, 100% { transform: scale(1) rotate(0deg); }
          88%            { transform: scale(1.12) rotate(-8deg); }
          92%            { transform: scale(1.12) rotate(8deg); }
          96%            { transform: scale(1.08) rotate(-4deg); }
          98%            { transform: scale(1.05) rotate(2deg); }
        }
      `}</style>
    </>
  );
}
