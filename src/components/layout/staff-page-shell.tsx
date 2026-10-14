"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { AdminSidebar, type NavItem } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";

const STAFF_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "grid", live: true },
  { label: "My Assets", href: "/dashboard/assets", icon: "box", live: true },
  { label: "Report an Issue", href: "/dashboard/report-issue", icon: "wrench", live: true },
  { label: "My Profile", href: "/dashboard/profile", icon: "settings", live: true },
];

// Frame for the staff / driver screens: sign-in gate (admins are sent to
// their own dashboard), staff sidebar, sticky top bar and the title block.
export function StaffPageShell({
  title,
  description,
  uppercase = false,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  title: string;
  description: string;
  uppercase?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    if (isSuperAdmin(getStoredUsername())) {
      router.replace("/admin/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar items={STAFF_NAV} />
      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              roleLabel="Staff"
              showNotifications={false}
              search={search}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
            />
          </div>
          <header className="mt-6">
            <h1
              className={`text-2xl font-bold text-[#121B3B] ${
                uppercase ? "uppercase" : ""
              }`}
            >
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
