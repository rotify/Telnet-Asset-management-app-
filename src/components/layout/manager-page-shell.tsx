"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth";
import { AdminSidebar, type NavItem } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { isManagerRole, managerLabel, useManagerContext, type ManagerType } from "@/lib/manager";

function navFor(type: ManagerType | null): NavItem[] {
  const items: NavItem[] = [
    { label: "Dashboard", href: "/manager", icon: "grid", live: true },
  ];
  if (type === "equipment")
    items.push({ label: "Equipment", href: "/manager/assets", icon: "wrench", live: true });
  if (type === "vehicles")
    items.push({ label: "Vehicles", href: "/manager/assets", icon: "truck", live: true });
  if (type === "documents")
    items.push({ label: "Documents", href: "/manager/assets", icon: "doc", live: true });
  if (type === "equipment" || type === "vehicles")
    items.push({ label: "Maintenance", href: "/manager/maintenance", icon: "gauge", live: true });
  items.push({ label: "Approvals", href: "/manager/approvals", icon: "bell", live: true });
  items.push(
    { label: "My Profile", href: "/manager/profile", icon: "users", live: true },
    { label: "Settings", href: "/manager/settings", icon: "settings", live: true }
  );
  return items;
}

// Frame for the manager screens: sign-in gate, role check (non-managers are
// sent to their own area), manager sidebar, top bar and title block.
export function ManagerPageShell({
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
  const ctx = useManagerContext();

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    if (ctx.loading) return;
    if (ctx.role === "admin") router.replace("/admin/dashboard");
    else if (ctx.role && !isManagerRole(ctx.role)) router.replace("/dashboard");
  }, [ctx.loading, ctx.role, router]);

  if (ctx.loading || !isManagerRole(ctx.role)) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar items={navFor(ctx.type)} />
      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              roleLabel={managerLabel(ctx.type)}
              showNotifications={false}
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
