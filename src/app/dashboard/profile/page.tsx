"use client";

import { useEffect, useState } from "react";
import {
  changePassword,
  getProfileSettings,
  updateProfileSettings,
} from "@/lib/api";
import { PasswordStrength } from "@/components/password-strength";
import { isStrongPassword } from "@/lib/password";
import { StaffPageShell } from "@/components/layout/staff-page-shell";

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";
const labelClasses = "mb-1.5 block text-sm font-medium text-[#121B3B]";
const cardClasses =
  "mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]";
const headingClasses =
  "border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]";
const buttonClasses =
  "mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60";

export default function StaffProfilePage() {
  const [username, setUsername] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    getProfileSettings()
      .then((p) => {
        setUsername(p.username);
        setForm({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          email: p.email ?? "",
        });
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load your profile.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function saveProfile() {
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateProfileSettings(form);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your profile.");
    } finally {
      setIsSaving(false);
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
    if (pw.next === pw.current) {
      setPwError("Your new password must be different from the current one.");
      return;
    }
    if (!isStrongPassword(pw.next, { username: username, email: form.email })) {
      setPwError("Choose a stronger password that meets every requirement below.");
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
      setPwError(err instanceof Error ? err.message : "Couldn't change password.");
    } finally {
      setIsSavingPw(false);
    }
  }

  return (
    <StaffPageShell
      title="My Profile"
      description="Your account details and password."
    >
      <div className={cardClasses}>
        <h2 className={headingClasses}>Account</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            {username && (
              <p className="mt-4 text-xs text-slate-400">Username: {username}</p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className={inputClasses}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClasses}
                />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {saved && <p className="mt-2 text-sm text-green-600">Profile updated.</p>}
            <button type="button" onClick={saveProfile} disabled={isSaving} className={buttonClasses}>
              {isSaving ? "Saving…" : "Save Profile"}
            </button>
          </>
        )}
      </div>

      <div className={cardClasses}>
        <h2 className={headingClasses}>Change Password</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ["Current Password", "current", "current-password"],
              ["New Password", "next", "new-password"],
              ["Confirm New Password", "confirm", "new-password"],
            ] as const
          ).map(([label, key, auto]) => (
            <div key={key}>
              <label className={labelClasses}>{label}</label>
              <input
                type="password"
                value={pw[key]}
                autoComplete={auto}
                onChange={(e) => setPw((f) => ({ ...f, [key]: e.target.value }))}
                className={inputClasses}
              />
            </div>
          ))}
        </div>
        {pw.next && (
          <PasswordStrength password={pw.next} username={username} email={form.email} />
        )}
        {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
        {pwSaved && <p className="mt-2 text-sm text-green-600">Password changed.</p>}
        <button type="button" onClick={savePassword} disabled={isSavingPw} className={buttonClasses}>
          {isSavingPw ? "Saving…" : "Change Password"}
        </button>
      </div>
    </StaffPageShell>
  );
}
