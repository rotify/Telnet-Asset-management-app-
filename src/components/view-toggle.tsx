"use client";

// Shared table/card view toggle used on every list page (Vehicles,
// Equipment, Assets, Maintenance, Documents). Hidden below md because
// mobile always shows the card layout regardless of this setting — an
// 8-column table has no reasonable phone layout, so there's nothing for
// the toggle to do there.
export function ViewToggleButton({
  viewMode,
  onToggle,
}: {
  viewMode: "table" | "card";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        viewMode === "table" ? "Switch to card view" : "Switch to table view"
      }
      title={
        viewMode === "table" ? "Switch to card view" : "Switch to table view"
      }
      className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:flex"
    >
      {viewMode === "table" ? (
        // Currently in table view — icon shows what you'll switch TO (cards).
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      ) : (
        // Currently in card view — icon shows what you'll switch TO (table).
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <path d="M3 9h18M3 14h18" />
        </svg>
      )}
    </button>
  );
}
