"use client";

import { ApprovalsInbox } from "@/components/approvals-inbox";
import { StaffPageShell } from "@/components/layout/staff-page-shell";

export default function StaffApprovalsPage() {
  return (
    <StaffPageShell
      title="Approvals"
      description="Requests from your team that need your approval as their supervisor or reporting manager."
    >
      <ApprovalsInbox />
    </StaffPageShell>
  );
}
