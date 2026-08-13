// Status/priority indicator: a colored dot + colored text, no background chip.
//   green  #22C55E -> active / valid / on track
//   orange #F97316 -> pending / due soon / in progress / warning
//   red    #EF4444 -> inactive / overdue / expired / high priority
//   slate  #576A77 -> neutral / no data

export const STATUS_COLORS = {
  green: "#22C55E",
  orange: "#F97316",
  red: "#EF4444",
  slate: "#576A77",
} as const;

export type StatusTone = keyof typeof STATUS_COLORS;

export function StatusDot({
  label,
  tone,
  className = "",
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  const color = STATUS_COLORS[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}
      style={{ color }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
