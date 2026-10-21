"use client";

import { ApprovalsInbox } from "@/components/approvals-inbox";
import { AdminPageShell } from "@/components/layout/admin-page-shell";

export default function AdminApprovalsPage() {
  return (
    <AdminPageShell
      title="Approvals"
      description="Requests waiting for you, including admin fallbacks when a person has no supervisor or reporting manager."
    >
      <ApprovalsInbox />
    </AdminPageShell>
  );
}
