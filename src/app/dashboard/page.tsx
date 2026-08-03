"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    if (isSuperAdmin(getStoredUsername())) {
      router.replace("/admin/dashboard");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#EFF1F6] px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
        <h1 className="font-serif text-2xl font-bold text-[#121B3B]">
          You&apos;re signed in
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Just  a placeholder staff view for now. Still waiting for assigned equipment and vehicles, and the document module.
        </p>
      </div>
    </div>
  );
}
