"use client";

import { checkPassword } from "@/lib/password";

// Live checklist + strength bar for a new password.
export function PasswordStrength({
  password,
  username,
  email,
}: {
  password: string;
  username?: string | null;
  email?: string | null;
}) {
  const checks = checkPassword(password, { username, email });
  const passed = checks.filter((c) => c.ok).length;
  const ratio = password ? passed / checks.length : 0;
  const color =
    ratio === 1 ? "bg-green-500" : ratio >= 0.7 ? "bg-amber-400" : "bg-red-400";
  const label =
    !password ? "" : ratio === 1 ? "Strong" : ratio >= 0.7 ? "Fair" : "Weak";

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all ${color}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className="w-12 text-xs font-medium text-slate-500">{label}</span>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`flex items-center gap-1.5 text-xs ${
              c.ok ? "text-green-600" : "text-slate-400"
            }`}
          >
            <span aria-hidden>{c.ok ? "✓" : "○"}</span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
