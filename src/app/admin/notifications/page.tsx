"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  createNotificationRecipient,
  getNotificationDeliveries,
  getNotificationRecipients,
  getNotificationSchedule,
  retryNotificationDelivery,
  sendNotificationsNow,
  updateNotificationSchedule,
  type NotificationDelivery,
  type NotificationRecipient,
  type NotificationSchedule,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { StatusDot, type StatusTone } from "@/components/status-dot";

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB");
}

const DELIVERY_TONES: Record<string, StatusTone> = {
  sent: "green",
  delivered: "green",
  success: "green",
  queued: "orange",
  pending: "orange",
  failed: "red",
  error: "red",
};

function deliveryTone(status: string): StatusTone {
  return DELIVERY_TONES[status?.toLowerCase()] ?? "slate";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);

  const [schedule, setSchedule] = useState<NotificationSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    is_enabled: true,
    alert_days: 15,
    schedule_time: "10:00",
  });
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [newRecipient, setNewRecipient] = useState({
    email: "",
    full_name: "",
  });
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);

  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    const storedUsername = getStoredUsername();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!isSuperAdmin(storedUsername)) {
      router.replace("/dashboard");
      return;
    }
    setGateChecked(true);
  }, [router]);

  async function loadSchedule() {
    setIsLoadingSchedule(true);
    setScheduleError(null);
    try {
      const data = await getNotificationSchedule();
      setSchedule(data);
      setScheduleForm({
        is_enabled: data.is_enabled,
        alert_days: data.alert_days,
        schedule_time: data.schedule_time?.slice(0, 5) || "10:00",
      });
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Couldn't load alert schedule."
      );
    } finally {
      setIsLoadingSchedule(false);
    }
  }

  async function loadRecipients() {
    setIsLoadingRecipients(true);
    setRecipientsError(null);
    try {
      const data = await getNotificationRecipients();
      setRecipients(data.results ?? []);
    } catch (err) {
      setRecipientsError(
        err instanceof Error ? err.message : "Couldn't load recipients."
      );
    } finally {
      setIsLoadingRecipients(false);
    }
  }

  async function loadDeliveries() {
    setIsLoadingDeliveries(true);
    setDeliveriesError(null);
    try {
      const data = await getNotificationDeliveries();
      setDeliveries(data.results ?? []);
    } catch (err) {
      setDeliveriesError(
        err instanceof Error ? err.message : "Couldn't load deliveries."
      );
    } finally {
      setIsLoadingDeliveries(false);
    }
  }

  useEffect(() => {
    if (!gateChecked) return;
    loadSchedule();
    loadRecipients();
    loadDeliveries();
  }, [gateChecked]);

  async function saveSchedule() {
    setScheduleError(null);
    setIsSavingSchedule(true);
    try {
      const updated = await updateNotificationSchedule({
        is_enabled: scheduleForm.is_enabled,
        alert_days: Number(scheduleForm.alert_days),
        schedule_time: `${scheduleForm.schedule_time}:00`,
      });
      setSchedule(updated);
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Couldn't save alert schedule."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function addRecipient() {
    setRecipientsError(null);
    if (!newRecipient.email.trim() || !newRecipient.full_name.trim()) {
      setRecipientsError("Name and email are required.");
      return;
    }
    setIsAddingRecipient(true);
    try {
      const created = await createNotificationRecipient({
        email: newRecipient.email.trim(),
        full_name: newRecipient.full_name.trim(),
        is_active: true,
      });
      setRecipients((prev) => [created, ...prev]);
      setNewRecipient({ email: "", full_name: "" });
    } catch (err) {
      setRecipientsError(
        err instanceof Error ? err.message : "Couldn't add recipient."
      );
    } finally {
      setIsAddingRecipient(false);
    }
  }

  async function handleSendNow() {
    setSendResult(null);
    setIsSending(true);
    try {
      const result = await sendNotificationsNow();
      setSendResult(
        `Sent ${result.sent_count} notification${
          result.sent_count === 1 ? "" : "s"
        }.`
      );
      loadDeliveries();
      loadSchedule();
    } catch (err) {
      setSendResult(
        err instanceof Error ? err.message : "Couldn't send notifications."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleRetry(id: number) {
    setRetryingId(id);
    try {
      await retryNotificationDelivery(id);
      loadDeliveries();
    } catch (err) {
      setDeliveriesError(
        err instanceof Error ? err.message : "Couldn't retry delivery."
      );
    } finally {
      setRetryingId(null);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar />
          </div>

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage expiry alert schedules, recipients, and delivery
                history.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSendNow}
              disabled={isSending}
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
            >
              {isSending ? "Sending…" : "Send Now"}
            </button>
          </header>

          {sendResult && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {sendResult}
            </div>
          )}

         
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Alert Schedule
            </h2>
            {isLoadingSchedule ? (
              <p className="mt-4 text-sm text-slate-500">Loading…</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      Enabled
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleForm((f) => ({
                          ...f,
                          is_enabled: !f.is_enabled,
                        }))
                      }
                      className={`flex h-9 w-16 items-center rounded-full px-1 transition-colors ${
                        scheduleForm.is_enabled
                          ? "bg-[#0F172A]"
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`h-7 w-7 rounded-full bg-white shadow transition-transform ${
                          scheduleForm.is_enabled
                            ? "translate-x-7"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      Alert Days Before Expiry
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={scheduleForm.alert_days}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          alert_days: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      Send Time
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.schedule_time}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          schedule_time: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Last sent: {formatDateTime(schedule?.last_sent ?? null)}
                </p>
                {scheduleError && (
                  <p className="mt-2 text-sm text-red-600">{scheduleError}</p>
                )}
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={isSavingSchedule}
                  className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
                >
                  {isSavingSchedule ? "Saving…" : "Save Schedule"}
                </button>
              </>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Recipients
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Full name"
                value={newRecipient.full_name}
                onChange={(e) =>
                  setNewRecipient((v) => ({
                    ...v,
                    full_name: e.target.value,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email address"
                value={newRecipient.email}
                onChange={(e) =>
                  setNewRecipient((v) => ({ ...v, email: e.target.value }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={addRecipient}
                disabled={isAddingRecipient}
                className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
              >
                {isAddingRecipient ? "Adding…" : "Add Recipient"}
              </button>
            </div>
            {recipientsError && (
              <p className="mt-2 text-sm text-red-600">{recipientsError}</p>
            )}

            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {isLoadingRecipients ? (
                <p className="py-3 text-sm text-slate-500">Loading…</p>
              ) : recipients.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">
                  No recipients yet.
                </p>
              ) : (
                recipients.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {r.full_name}
                      </p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </div>
                    <StatusDot
                      label={r.is_active ? "Active" : "Inactive"}
                      tone={r.is_active ? "green" : "slate"}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Recent Deliveries
            </h2>
            {deliveriesError && (
              <p className="mt-2 text-sm text-red-600">{deliveriesError}</p>
            )}
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {isLoadingDeliveries ? (
                <p className="py-3 text-sm text-slate-500">Loading…</p>
              ) : deliveries.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">
                  No deliveries recorded yet.
                </p>
              ) : (
                deliveries.map((d) => {
                  const extra = Object.entries(d).filter(
                    ([key]) => key !== "id" && key !== "status"
                  );
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Delivery #{d.id}
                        </p>
                        {extra.length > 0 && (
                          <p className="text-xs text-slate-400">
                            {extra
                              .map(
                                ([key, value]) =>
                                  `${key}: ${
                                    typeof value === "string" ||
                                    typeof value === "number"
                                      ? value
                                      : JSON.stringify(value)
                                  }`
                              )
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusDot
                          label={d.status}
                          tone={deliveryTone(d.status)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRetry(d.id)}
                          disabled={retryingId === d.id}
                          className="text-xs font-semibold text-telnet-primary hover:underline disabled:opacity-60"
                        >
                          {retryingId === d.id ? "Retrying…" : "Retry"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
