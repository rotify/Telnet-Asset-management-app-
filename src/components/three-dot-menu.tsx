"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

// Figma-matched actions trigger: a small "⋮" icon button that reveals a
// dropdown panel, instead of inline text links in the table cell.
export function ThreeDotMenu({
  children,
  align = "right",
}: {
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open actions menu"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          className={`absolute top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  tone = "default",
  disabled,
}: {
  onClick?: () => void;
  children: ReactNode;
  tone?: "default" | "danger" | "muted";
  disabled?: boolean;
}) {
  const toneClasses =
    tone === "danger"
      ? "text-red-600 hover:bg-red-50"
      : tone === "muted"
        ? "text-slate-400"
        : "text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
    >
      {children}
    </button>
  );
}
