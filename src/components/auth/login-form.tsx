"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, storeSession, postLoginRedirectPath } from "@/lib/auth";
import type { LoginFormErrors } from "@/types/auth";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: LoginFormErrors = {};
    if (!username) next.username = "Enter your username.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { token } = await login({ username, password });
      storeSession(token, username, rememberMe);
      router.push(postLoginRedirectPath(username));
      router.refresh();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      {errors.form && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errors.form}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1c2333]">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. ewallace"
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "username-error" : undefined}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#263EA8] focus:outline-none focus:ring-2 focus:ring-[#263EA8]/20"
        />
        {errors.username && (
          <p id="username-error" className="mt-1.5 text-xs text-red-600">
            {errors.username}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="password" className="block text-sm font-semibold text-[#1c2333]">
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-16 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#263EA8] focus:outline-none focus:ring-2 focus:ring-[#263EA8]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      <label className="mt-5 flex select-none items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-[#263EA8] focus:ring-[#263EA8]/30"
        />
        Keep me logged in
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex w-full items-center justify-center rounded-lg bg-[#263EA8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e3288] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Logging in…" : "Login"}
      </button>

      <a
        href="/forgot-password"
        className="mt-4 block text-center text-sm font-medium text-[#263EA8] underline underline-offset-2 hover:text-[#1e3288]"
      >
        Forgot password?
      </a>

      <p className="mt-4 text-center text-sm text-slate-500">
        Don&apos;t have access? Contact system administrator.
      </p>
    </form>
  );
}
