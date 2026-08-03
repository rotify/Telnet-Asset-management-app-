import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login · Telnet Asset Manager",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] w-full items-center justify-center bg-[#EFF1F6] px-4 py-12">
      <div className="w-full max-w-[550px] rounded-2xl bg-white px-10 py-10 shadow-[0_1px_2px_rgba(16,24,64,0.06)] sm:px-12 sm:py-12">
        <div className="text-center">
   <h1
  className="text-3xl font-bold text-[#50A5DB]"
  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
>
  TELNET
</h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Technology enabled business solutions
          </p>
        </div>

        <div className="mt-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-[#121B3B]">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to view the Asset Dashboard.
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
