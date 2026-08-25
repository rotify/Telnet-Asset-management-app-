"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredSession } from "@/lib/auth";
import {
  getSidebarOpen,
  setSidebarOpen,
  subscribeSidebar,
} from "@/lib/sidebar-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  live: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "grid", live: true },
  { label: "Assets", href: "/admin/assets", icon: "box", live: true },
  { label: "Vehicles", href: "/admin/vehicles", icon: "truck", live: true },
  { label: "Documents", href: "/admin/documents", icon: "doc", live: true },
  { label: "Equipments", href: "/admin/equipment", icon: "wrench", live: true },
  { label: "Maintenance", href: "/admin/maintenance", icon: "gauge", live: true },
  { label: "Reports", href: "/admin/reports", icon: "chart", live: false },
  { label: "Users & Roles", href: "/admin/staff", icon: "users", live: true },
  { label: "Notifications", href: "/admin/notifications", icon: "bell", live: false },
  { label: "Settings", href: "/admin/settings", icon: "settings", live: false },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <rect x="1" y="6" width="13" height="11" rx="1.5" />
          <path d="M14 10h4l3 3v4h-7z" />
          <circle cx="6" cy="19" r="1.6" />
          <circle cx="17" cy="19" r="1.6" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M6 2h9l4 4v16H6z" />
          <path d="M14 2v5h5M9 12h6M9 16h6" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3-3 3Z" />
        </svg>
      );
    case "gauge":
      return (
        <svg {...common}>
          <path d="M4.5 18a7.5 7.5 0 1 1 15 0" />
          <path d="M12 13l3-3" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V9M12 19V4M20 19v-6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
          <circle cx="17.5" cy="9" r="2.6" />
          <path d="M15.8 12.2c2.6.3 4.7 2.3 4.7 4.8" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isOpen = useSyncExternalStore(
    subscribeSidebar,
    getSidebarOpen,
    () => false
  );

  function handleLogout() {
    setSidebarOpen(false);
    clearStoredSession();
    router.push("/login");
  }

  function closeOnMobile() {
    setSidebarOpen(false);
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={closeOnMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const baseClasses =
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

            if (!item.live) {
              return (
                <div
                  key={item.label}
                  title="Not built yet — backend has no API for this section"
                  className={`${baseClasses} cursor-not-allowed text-slate-300`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeOnMobile}
                className={`${baseClasses} text-telnet-secondaryText ${
                  isActive ? "bg-telnet-activeBg" : "hover:bg-telnet-activeBg/60"
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <NavIcon name="logout" />
          Log Out
        </button>
      </aside>
    </>
  );
}
