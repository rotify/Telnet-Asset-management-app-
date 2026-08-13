// Figma-matched status/priority indicator: a colored dot + colored text,
// no background chip. Colors verified from the Figma design file:
//   blue  #008EE7 -> positive / active / completed states
//   red   #FD7072 -> urgent / overdue / expired / high priority
//   amber #F6AD3F -> warning / medium priority / in-progress
//   slate #576A77 -> neutral / low priority / inactive

export const STATUS_COLORS = {
  blue: "#008EE7",
  red: "#FD7072",
  amber: "#F6AD3F",
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
