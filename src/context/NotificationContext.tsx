"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import * as customerLib from "@/lib/customer";

interface NotificationContextValue {
  unreadCount: number;
  notifications: any[];
  loading: boolean;
  permissionState: NotificationPermission | "unsupported";
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const _API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const WS_BASE = _API_URL
  .replace(/^https/, "wss")   // https → wss  (production)
  .replace(/^http(?!s)/, "ws") // http  → ws   (local dev, no TLS)
  .replace("/api/v1", "");

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) setPermissionState("unsupported");
    else setPermissionState(Notification.permission);
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const data = await customerLib.getNotifications(1, 30);
      setNotifications(data.items ?? []);
      setUnreadCount(data.unread ?? 0);
    } catch {} finally { setLoading(false); }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) refresh();
    else { setNotifications([]); setUnreadCount(0); }
  }, [isLoggedIn, refresh]);

  useEffect(() => {
    if (!isLoggedIn || !user?.user_id) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    let alive = true;
    const connect = () => {
      if (!alive) return;
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/customer/${user.user_id}?token=${token}`);
        wsRef.current = ws;
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (["NOTIFICATION","BOOKING_STATUS_CHANGED","QUOTATION_UPDATED","QUOTATION_CREATED"].includes(msg.type)) refresh();
          } catch {}
        };
        ws.onclose = () => { if (alive) retryRef.current = setTimeout(connect, 5000); };
        ws.onerror = () => ws.close();
      } catch {}
    };
    connect();
    return () => {
      alive = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [isLoggedIn, user?.user_id, refresh]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === "granted") {
      try { new Notification("Notifications enabled! 🔔", { body: "You'll receive booking updates in real-time." }); } catch {}
    }
  }, []);


  // Show push permission prompt once per session when logged in
  useEffect(() => {
    if (!isLoggedIn) { setShowPrompt(false); return; }
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      const dismissed = sessionStorage.getItem("notif_prompt_dismissed");
      if (!dismissed) setShowPrompt(true);
    }
  }, [isLoggedIn]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try { await customerLib.markNotificationRead(id); } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try { await customerLib.markAllNotificationsRead(); } catch {}
  }, []);

  return (
    <>
    <NotificationContext.Provider value={{ unreadCount, notifications, loading, permissionState, requestPermission, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>

      {/* Push notification permission banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-[999] max-w-sm mx-auto">
          <div className="bg-white border border-ink-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900">Enable Notifications</p>
              <p className="text-xs text-ink-500 mt-0.5">Get real-time updates on your bookings.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => { await requestPermission(); setShowPrompt(false); sessionStorage.setItem("notif_prompt_dismissed", "1"); }}
                  className="flex-1 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Allow
                </button>
                <button
                  onClick={() => { setShowPrompt(false); sessionStorage.setItem("notif_prompt_dismissed", "1"); }}
                  className="flex-1 py-1.5 border border-ink-200 text-ink-600 text-xs font-medium rounded-lg hover:bg-ink-50 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext) ?? {
    unreadCount: 0, notifications: [], loading: false, permissionState: "default",
    requestPermission: async () => {}, refresh: async () => {}, markRead: async () => {}, markAllRead: async () => {},
  };
}
