"use client";

import { AccountPanel } from "@/components/account-panel";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";

export default function ManagerSettingsPage() {
  return (
    <ManagerPageShell
      title="Settings"
      description="Change the temporary password you were given with a strong one of your own."
    >
      <AccountPanel show="password" />
    </ManagerPageShell>
  );
}
