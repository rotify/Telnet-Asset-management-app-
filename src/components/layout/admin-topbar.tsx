"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUsername } from "@/lib/auth";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function initials(name: string | null): string {
  if (!name) return "A";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "A";
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminTopBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  hasNotifications?: boolean;
}

export function AdminTopBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  hasNotifications = false,
}: AdminTopBarProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const isControlled = search !== undefined;
  const searchValue = isControlled ? search : localSearch;
  const handleSearchChange = isControlled
    ? onSearchChange ?? (() => {})
    : setLocalSearch;

  useEffect(() => {
    setUsername(getStoredUsername());
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-[389px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-[#D9D9D9] bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <CalendarIcon />
          {todayFormatted()}
        </div>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => router.push("/admin/notifications")}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2F2] text-slate-600 hover:bg-slate-200"
        >
          <BellIcon />
          {hasNotifications && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#FD7072]" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-telnet-primary text-xs font-bold text-white">
            {initials(username)}
          </span>
          <div>
            <p className="text-sm font-bold text-[#121B3B]">{username}</p>
            <p className="text-xs font-bold text-[#787A78]">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
