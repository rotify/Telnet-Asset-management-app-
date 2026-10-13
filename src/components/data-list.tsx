"use client";

import type { ReactNode } from "react";

export interface DataColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

// Shared list layout used by the newer screens, matching the Figma
// pattern: white rounded table with a light-blue header row on desktop,
// compact cards on mobile (cards always show on phones; the view toggle
// only switches desktop between table and cards).
export function DataList<T>({
  rows,
  rowKey,
  columns,
  renderCard,
  viewMode,
}: {
  rows: T[];
  rowKey: (row: T) => string | number;
  columns: DataColumn<T>[];
  renderCard: (row: T) => ReactNode;
  viewMode: "table" | "card";
}) {
  return (
    <>
      <div
        className={`mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${
          viewMode === "table" ? "md:hidden" : ""
        }`}
      >
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
          >
            {renderCard(row)}
          </div>
        ))}
      </div>

      <div
        className={`mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] ${
          viewMode === "table" ? "md:block" : ""
        }`}
      >
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-3">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0">
                {columns.map((c) => (
                  <td key={c.header} className="px-4 py-3 text-slate-600">
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      {children}
    </p>
  );
}
