"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
const MENU_WIDTH = 224; // w-56
const MENU_MARGIN = 4;

export function ThreeDotMenu({
  children,
  align = "right",
}: {
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Table wrappers use overflow-x-auto, which clips any absolutely
  // positioned dropdown that lives inside them — so a menu opened near the
  // bottom (or edge) of the table looked cut off and forced a scroll to see
  // the rest of it. Rendering the menu in a portal with viewport-relative
  // "fixed" positioning (computed from the trigger button's own position)
  // escapes that clipping everywhere ThreeDotMenu is used, and flips the
  // menu above the button when there isn't room below.
  function computePosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedMenuHeight = menuRef.current?.offsetHeight ?? 160;
    const openUpward =
      spaceBelow < estimatedMenuHeight + MENU_MARGIN && rect.top > spaceBelow;

    let left =
      align === "right" ? rect.right - MENU_WIDTH : rect.left;
    left = Math.min(
      Math.max(left, MENU_MARGIN),
      window.innerWidth - MENU_WIDTH - MENU_MARGIN
    );

    const top = openUpward
      ? rect.top - MENU_MARGIN
      : rect.bottom + MENU_MARGIN;

    setPosition({ top, left, openUpward });
  }

  useEffect(() => {
    if (!open) return;
    computePosition();

    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleReposition() {
      computePosition();
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open actions menu"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <DotsIcon />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.openUpward ? undefined : position.top,
              bottom: position.openUpward
                ? window.innerHeight - position.top
                : undefined,
              left: position.left,
              width: MENU_WIDTH,
            }}
            className="z-50 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
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
