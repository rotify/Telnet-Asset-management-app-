"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getStoredToken,
  getStoredUsername,
  clearStoredSession,
  isSuperAdmin,
} from "@/lib/auth";
import { toggleSidebar } from "@/lib/sidebar-toggle";

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function SiteHeader() {
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();
  const isAdminSection =
    (pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard")) ??
    false;

  useEffect(() => {
    if (getStoredToken()) {
      setUsername(getStoredUsername());
    }
  }, []);

  function handleLogout() {
    clearStoredSession();
    window.location.href = "/login";
  }

  if (isAdminSection) {
    // Sticky so the menu button that opens the sidebar stays reachable
    // while scrolling on mobile — without this, scrolling down a long
    // list made navigation unreachable until you scrolled back to top.
    return (
      <header className="sticky top-0 z-40 flex h-12 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
        >
          <MenuIcon />
        </button>
        <span className="ml-3 font-serif text-base font-bold text-[#50A5DB]">
          TELNET
        </span>
      </header>
    );
  }

  return (
    <header className="flex h-14 items-center justify-between bg-[#0F172A] px-6 text-white">
      <div className="flex items-center gap-3">
        <span className="font-serif text-lg font-bold text-white">
          TELNET
        </span>
        <span className="hidden text-sm font-medium text-white/80 sm:inline">
          Telnet Assets Management System
        </span>
        {username && isSuperAdmin(username) && (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
            Superadmin
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {username ? (
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold text-slate-200 hover:text-white hover:underline"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-200 hover:text-white hover:underline"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
