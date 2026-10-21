"use client";

import { ApprovalsInbox } from "@/components/approvals-inbox";
import { DispatchQueue } from "@/components/dispatch-queue";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";
import { useManagerContext } from "@/lib/manager";

export default function ManagerApprovalsPage() {
  const { type } = useManagerContext();
  return (
    <ManagerPageShell
      title="Approvals"
      description={
        type === "vehicles"
          ? "Requests waiting for your approval, and approved driver requests ready to dispatch."
          : "Requests waiting for your approval."
      }
    >
      <ApprovalsInbox />
      {type === "vehicles" && <DispatchQueue />}
    </ManagerPageShell>
  );
}
