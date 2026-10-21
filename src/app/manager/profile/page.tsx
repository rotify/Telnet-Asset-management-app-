"use client";

import { AccountPanel } from "@/components/account-panel";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";

export default function ManagerProfilePage() {
  return (
    <ManagerPageShell title="My Profile" description="Your account details.">
      <AccountPanel show="account" />
    </ManagerPageShell>
  );
}
