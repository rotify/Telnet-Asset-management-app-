// Status/priority indicator: a filled pill with a dot + colored text, matching Figma exactly.
//   green  dot/text #2DB130, bg #ECF8ED -> active / valid / good / on track
//   orange dot/text #F6AD3F, bg #FBEED8 -> pending / due soon / medium priority / fair
//   red    dot/text #FD7072, bg #FFF3F3 -> inactive / overdue / expired / high priority
//   slate  dot/text #576A77, bg #EBF1F5 -> neutral / low priority / no data
//   navy   dot/text #222222, bg #F0FAFF -> completed

export const STATUS_COLORS = {
  green: "#2DB130",
  orange: "#F6AD3F",
  red: "#FD7072",
  slate: "#576A77",
  navy: "#222222",
} as const;

export const STATUS_BG_COLORS = {
  green: "#ECF8ED",
  orange: "#FBEED8",
  red: "#FFF3F3",
  slate: "#EBF1F5",
  navy: "#F0FAFF",
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
  const bg = STATUS_BG_COLORS[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium ${className}`}
      style={{ color, backgroundColor: bg }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
