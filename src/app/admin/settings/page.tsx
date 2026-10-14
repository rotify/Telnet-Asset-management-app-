"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  getOrganizationSettings,
  getProfileSettings,
  updateProfileSettings,
  getNotificationSettings,
  updateNotificationSettings,
  changePassword,
  type NotificationSettings,
  type OrganizationSettings,
  type ProfileSettings,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";

export default function SettingsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);

  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [notif, setNotif] = useState<NotificationSettings | null>(null);
  const [notifForm, setNotifForm] = useState({
    is_enabled: true,
    alert_days: "15",
    schedule_time: "10:00",
  });
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);

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

  useEffect(() => {
    if (!gateChecked) return;

    getOrganizationSettings()
      .then(setOrg)
      .catch((err) =>
        setOrgError(
          err instanceof Error ? err.message : "Couldn't load organization settings."
        )
      )
      .finally(() => setIsLoadingOrg(false));

    getProfileSettings()
      .then((data) => {
        setProfile(data);
        setProfileForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? "",
        });
      })
      .catch((err) =>
        setProfileError(
          err instanceof Error ? err.message : "Couldn't load profile."
        )
      )
      .finally(() => setIsLoadingProfile(false));

    getNotificationSettings()
      .then((data) => {
        setNotif(data);
        setNotifForm({
          is_enabled: data.is_enabled,
          alert_days: String(data.alert_days),
          schedule_time: (data.schedule_time ?? "").slice(0, 5),
        });
      })
      .catch((err) =>
        setNotifError(
          err instanceof Error ? err.message : "Couldn't load notification settings."
        )
      );
  }, [gateChecked]);

  async function saveNotif() {
    setNotifError(null);
    setNotifSaved(false);
    const days = Number(notifForm.alert_days);
    if (!Number.isInteger(days) || days < 1) {
      setNotifError("Alert days must be a whole number of 1 or more.");
      return;
    }
    setIsSavingNotif(true);
    try {
      const updated = await updateNotificationSettings({
        is_enabled: notifForm.is_enabled,
        alert_days: days,
        schedule_time: `${notifForm.schedule_time}:00`,
      });
      setNotif(updated);
      setNotifSaved(true);
    } catch (err) {
      setNotifError(
        err instanceof Error ? err.message : "Couldn't update notification settings."
      );
    } finally {
      setIsSavingNotif(false);
    }
  }

  async function savePassword() {
    setPwError(null);
    setPwSaved(false);
    if (!pw.current || !pw.next) {
      setPwError("Enter your current and new password.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    setIsSavingPw(true);
    try {
      await changePassword({
        current_password: pw.current,
        new_password: pw.next,
        password_confirm: pw.confirm,
      });
      setPw({ current: "", next: "", confirm: "" });
      setPwSaved(true);
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Couldn't change password."
      );
    } finally {
      setIsSavingPw(false);
    }
  }

  async function saveProfile() {
    setProfileError(null);
    setProfileSaved(false);
    setIsSavingProfile(true);
    try {
      const updated = await updateProfileSettings(profileForm);
      setProfile(updated);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Couldn't update profile."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar />
          </div>

          <header className="mt-6">
            <h1 className="text-2xl font-bold text-[#121B3B]">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Organization details, alert schedule and your account.
            </p>
          </header>

          {/* Organization */}
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Organization
            </h2>
            {isLoadingOrg ? (
              <p className="mt-4 text-sm text-slate-500">Loading…</p>
            ) : orgError ? (
              <p className="mt-4 text-sm text-red-600">{orgError}</p>
            ) : org ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-slate-400">Name</p>
                  <p className="mt-1 text-sm text-slate-700">{org.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Timezone</p>
                  <p className="mt-1 text-sm text-slate-700">{org.timezone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Max File Upload Size
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {org.file_upload_max_size_mb} MB
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Profile */}
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Your Profile
            </h2>
            {isLoadingProfile ? (
              <p className="mt-4 text-sm text-slate-500">Loading…</p>
            ) : (
              <>
                {profile && (
                  <p className="mt-4 text-xs text-slate-400">
                    Username: {profile.username}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          first_name: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          last_name: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                    />
                  </div>
                </div>
                {profileError && (
                  <p className="mt-2 text-sm text-red-600">{profileError}</p>
                )}
                {profileSaved && (
                  <p className="mt-2 text-sm text-green-600">Profile updated.</p>
                )}
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isSavingProfile}
                  className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
                >
                  {isSavingProfile ? "Saving…" : "Save Profile"}
                </button>
              </>
            )}
          </div>

          {/* Alert schedule */}
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Alert Schedule
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                  Alert Days Before Expiry
                </label>
                <input
                  type="number"
                  min={1}
                  value={notifForm.alert_days}
                  onChange={(e) =>
                    setNotifForm((f) => ({ ...f, alert_days: e.target.value }))
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
                  value={notifForm.schedule_time}
                  onChange={(e) =>
                    setNotifForm((f) => ({ ...f, schedule_time: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm font-medium text-[#121B3B]">
                  <input
                    type="checkbox"
                    checked={notifForm.is_enabled}
                    onChange={(e) =>
                      setNotifForm((f) => ({ ...f, is_enabled: e.target.checked }))
                    }
                  />
                  Alerts enabled
                </label>
              </div>
            </div>
            {notif?.last_sent && (
              <p className="mt-3 text-xs text-slate-400">
                Last sent: {new Date(notif.last_sent).toLocaleString()}
              </p>
            )}
            {notifError && <p className="mt-2 text-sm text-red-600">{notifError}</p>}
            {notifSaved && (
              <p className="mt-2 text-sm text-green-600">Alert schedule updated.</p>
            )}
            <button
              type="button"
              onClick={saveNotif}
              disabled={isSavingNotif}
              className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
            >
              {isSavingNotif ? "Saving…" : "Save Schedule"}
            </button>
          </div>

          {/* Change password */}
          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Change Password
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(
                [
                  ["Current Password", "current", "current-password"],
                  ["New Password", "next", "new-password"],
                  ["Confirm New Password", "confirm", "new-password"],
                ] as const
              ).map(([label, key, auto]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                    {label}
                  </label>
                  <input
                    type="password"
                    value={pw[key]}
                    autoComplete={auto}
                    onChange={(e) =>
                      setPw((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>
            {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
            {pwSaved && (
              <p className="mt-2 text-sm text-green-600">Password changed.</p>
            )}
            <button
              type="button"
              onClick={savePassword}
              disabled={isSavingPw}
              className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
            >
              {isSavingPw ? "Saving…" : "Change Password"}
            </button>
          </div>

          {/* Link out to notification settings */}
          <div className="mt-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div>
              <h2 className="text-sm font-semibold text-[#121B3B]">
                Notification Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage alert schedule, recipients, and delivery history.
              </p>
            </div>
            <Link
              href="/admin/notifications"
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
            >
              Manage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
