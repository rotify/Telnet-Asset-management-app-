"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { AdminUsersSection } from "@/components/admin-users-section";

export default function UsersAndRolesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  return (
    <AdminPageShell
      title="Users & Roles"
      description="Monitor company assets, vehicles, equipment, maintenance schedules, and document status from one centralized dashboard."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search staff and users…"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/staff/roles")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#121B3B] hover:bg-slate-50"
          >
            Role Permissions
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/staff/new")}
            className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
          >
            + Add Employee
          </button>
        </div>
      }
    >
      <AdminUsersSection search={search} />
    </AdminPageShell>
  );
}
