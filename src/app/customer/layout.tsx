"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

const NAV = [
  { href: "/customer/bookings",       label: "My Bookings",    icon: "📋" },
  { href: "/customer/notifications",  label: "Notifications",  icon: "🔔" },
  { href: "/customer/addresses",      label: "My Addresses",   icon: "📍" },
  { href: "/customer/profile",        label: "Profile",        icon: "👤" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { hydrated, isLoggedIn, user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [hydrated, isLoggedIn, pathname, router]);

  if (!hydrated || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-900">My Account</h1>
            <p className="text-sm text-ink-400">Welcome back, <span className="font-medium text-ink-700">{user?.name}</span></p>
          </div>
          <button
            onClick={async () => { await logout(); router.push("/"); }}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            🚪 Logout
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-2">
              {NAV.map((item) => {
                const active = pathname === item.href;
                const isNotif = item.href === "/customer/notifications";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Page content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
