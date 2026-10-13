"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";

// Shared frame for newer admin screens: sign-in gate, fixed sidebar,
// sticky top bar and the page title block.
export function AdminPageShell({
  title,
  description,
  actions,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
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
    if (!isSuperAdmin(getStoredUsername())) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />
      <div className="flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              search={search}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
            />
          </div>
          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            {actions}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
