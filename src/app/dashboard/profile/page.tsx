"use client";

import { AccountPanel } from "@/components/account-panel";
import { StaffPageShell } from "@/components/layout/staff-page-shell";

export default function StaffProfilePage() {
  return (
    <StaffPageShell
      title="My Profile"
      description="Your account details and password."
    >
      <AccountPanel show="both" />
    </StaffPageShell>
  );
}
