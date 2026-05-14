import type { Position } from "@/lib/domain";
import { POSITION_SHORT } from "@/lib/domain";
import { cn } from "@/lib/utils";

const TONE: Record<Position, string> = {
  Tech: "bg-[var(--pos-tech)]/15 text-[var(--pos-tech)] border-[var(--pos-tech)]/30",
  Supervisor: "bg-[var(--pos-supervisor)]/15 text-[var(--pos-supervisor)] border-[var(--pos-supervisor)]/30",
  "Project Manager": "bg-[var(--pos-pm)]/15 text-[var(--pos-pm)] border-[var(--pos-pm)]/30",
  Engineer: "bg-[var(--pos-engineer)]/15 text-[var(--pos-engineer)] border-[var(--pos-engineer)]/30",
  Safety: "bg-[var(--pos-safety)]/15 text-[var(--pos-safety)] border-[var(--pos-safety)]/30",
};

export function PositionBadge({ position, short = false, className }: { position: Position; short?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE[position],
        className,
      )}
    >
      {short ? POSITION_SHORT[position] : position}
    </span>
  );
}
