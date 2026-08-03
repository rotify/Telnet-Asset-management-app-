"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStoredToken,
  getStoredUsername,
  clearStoredSession,
  isSuperAdmin,
} from "@/lib/auth";

export function SiteHeader() {
  const [isDark, setIsDark] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("telnet_theme");
    const prefersDark = stored === "dark";
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
    if (getStoredToken()) {
      setUsername(getStoredUsername());
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("telnet_theme", next ? "dark" : "light");
  }

  function handleLogout() {
    clearStoredSession();
    window.location.href = "/login";
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
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-sm hover:bg-white/20"
        >
          {isDark ? "☀" : "☾"}
        </button>
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
