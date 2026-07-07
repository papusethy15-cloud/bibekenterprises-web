"use client";

import { useEffect, useState, useCallback } from "react";
import { useNotifications } from "@/context/NotificationContext";
import Link from "next/link";

// ── Type ─────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  notification_type: string; // BOOKING | PAYMENT | ASSIGNMENT | LEAVE | SYSTEM
  channel: string;
  data: Record<string, unknown> | null;
  created_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function typeConfig(type: string): { icon: string; color: string; bg: string } {
  switch (type) {
    case "BOOKING":    return { icon: "📋", color: "#1A3FA4", bg: "#EFF4FF" };
    case "PAYMENT":    return { icon: "💳", color: "#059669", bg: "#ECFDF5" };
    case "ASSIGNMENT": return { icon: "👨‍🔧", color: "#D97706", bg: "#FFFBEB" };
    case "LEAVE":      return { icon: "📅", color: "#7C3AED", bg: "#F5F3FF" };
    default:           return { icon: "🔔", color: "#6B7280", bg: "#F9FAFB" };
  }
}

// Derive a booking link from notification data if possible
function bookingLink(n: Notification): string | null {
  if (!n.data) return null;
  const bid = (n.data as any).booking_id ?? (n.data as any).bookingId;
  if (bid) return `/customer/bookings/${bid}`;
  if (n.notification_type === "BOOKING") return "/customer/bookings";
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  // Refresh on mount to get latest
  useEffect(() => { refresh(); }, [refresh]);

  const displayed = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
  };

  const handleItemClick = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-50 flex items-center justify-center text-xl border border-ink-100">
            🔔
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-900 leading-tight">Notifications</h2>
            <p className="text-xs text-ink-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
        </div>

        {/* Filter tabs + Mark all */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex rounded-xl border border-ink-100 overflow-hidden text-xs font-semibold">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors capitalize ${
                  filter === f
                    ? "bg-ink-900 text-white"
                    : "bg-white text-ink-500 hover:bg-ink-50"
                }`}
              >
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-xs font-semibold text-ink-400 hover:text-ink-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {markingAll ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
        {loading && notifications.length === 0 ? (
          /* Skeleton */
          <div className="divide-y divide-ink-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-ink-100 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-ink-100 rounded w-2/3" />
                  <div className="h-3 bg-ink-100 rounded w-full" />
                  <div className="h-2.5 bg-ink-50 rounded w-1/4 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-ink-50 flex items-center justify-center text-3xl mb-4 border border-ink-100">
              {filter === "unread" ? "✅" : "🔔"}
            </div>
            <p className="text-sm font-semibold text-ink-700 mb-1">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-ink-400 max-w-xs">
              {filter === "unread"
                ? "You're all caught up! Switch to 'All' to see past notifications."
                : "Booking confirmations, updates, and service alerts will appear here."}
            </p>
            {filter === "unread" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-xs font-semibold text-ink-500 underline underline-offset-2 hover:text-ink-700 transition-colors"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-ink-50">
            {displayed.map((n) => {
              const cfg = typeConfig(n.notification_type);
              const link = bookingLink(n as Notification);
              const Wrapper = link
                ? ({ children }: { children: React.ReactNode }) => (
                    <Link href={link} onClick={() => handleItemClick(n as Notification)} className="flex gap-4 px-5 py-4 hover:bg-ink-50/60 transition-colors">
                      {children}
                    </Link>
                  )
                : ({ children }: { children: React.ReactNode }) => (
                    <button
                      onClick={() => handleItemClick(n as Notification)}
                      className="w-full flex gap-4 px-5 py-4 text-left hover:bg-ink-50/60 transition-colors"
                    >
                      {children}
                    </button>
                  );

              return (
                <li key={n.id} className={`relative ${!n.is_read ? "bg-blue-50/30" : ""}`}>
                  {/* Unread indicator bar */}
                  {!n.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r bg-blue-500" />
                  )}
                  <Wrapper>
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                      style={{ background: cfg.bg, borderColor: `${cfg.color}20` }}
                    >
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${n.is_read ? "font-medium text-ink-700" : "font-bold text-ink-900"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-ink-400 shrink-0 mt-0.5 font-medium">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-500 mt-1 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {n.notification_type}
                        </span>
                        {link && (
                          <span className="text-[10px] text-ink-400 font-medium">
                            Tap to view →
                          </span>
                        )}
                        {!n.is_read && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Load more hint */}
      {notifications.length >= 30 && (
        <p className="text-center text-xs text-ink-400 pb-2">
          Showing last 30 notifications
        </p>
      )}
    </div>
  );
}
