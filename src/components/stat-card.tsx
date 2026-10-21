import type { ReactNode } from "react";

export function StatIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F6FA] text-telnet-primary">
          {icon ?? (
            <StatIcon>
              <path d="M12 3 3 8l9 5 9-5-9-5Z" />
              <path d="m3 13 9 5 9-5" />
            </StatIcon>
          )}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-bold text-[#121B3B]">{value}</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
