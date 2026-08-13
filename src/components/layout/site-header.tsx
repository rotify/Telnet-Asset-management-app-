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
  const isAdminSection = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (getStoredToken()) {
      setUsername(getStoredUsername());
    }
  }, []);

  function handleLogout() {
    clearStoredSession();
    window.location.href = "/login";
  }

  // Inside /admin, the AdminSidebar already shows the TELNET brand and its
  // own Log Out button, so this bar is reduced to just the mobile menu
  // toggle — no duplicate branding, login link, or theme switch.
  if (isAdminSection) {
    return (
      <header className="flex h-14 items-center bg-[#10245c] px-4 lg:hidden">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
        >
          <MenuIcon />
        </button>
      </header>
    );
  }

  return (
    <header className="flex h-14 items-center justify-between bg-[#10245c] px-6 text-white">
      <div className="flex items-center gap-3">
        <span className="font-serif text-lg font-bold text-[#50A5DB]">
          TELNET
        </span>
        <span className="hidden text-sm font-medium text-white/80 sm:inline">
          Telnet Assets Management System
        </span>
        {username && isSuperAdmin(username) && (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-[#7ea9ff]">
            Superadmin
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {username ? (
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold text-[#7ea9ff] hover:underline"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-[#7ea9ff] hover:underline"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
