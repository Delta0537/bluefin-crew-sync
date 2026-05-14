/**
 * Conflict detection — kept in TS for v1 debuggability.
 * Date ranges are inclusive on both ends (DATE columns).
 */
export type DateRange = { start: string; end: string };

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export type AssignmentConflict =
  | { kind: "assignment"; jobId: string; jobLabel: string; start: string; end: string }
  | { kind: "time_off"; timeOffType: string; start: string; end: string };

export function findConflicts(params: {
  range: DateRange;
  assignments: Array<{ id: string; job_id: string; start_date: string; end_date: string; jobLabel?: string }>;
  timeOff: Array<{ start_date: string; end_date: string; type: string }>;
  ignoreAssignmentId?: string;
}): AssignmentConflict[] {
  const out: AssignmentConflict[] = [];
  for (const a of params.assignments) {
    if (params.ignoreAssignmentId && a.id === params.ignoreAssignmentId) continue;
    if (rangesOverlap(params.range, { start: a.start_date, end: a.end_date })) {
      out.push({
        kind: "assignment",
        jobId: a.job_id,
        jobLabel: a.jobLabel ?? a.job_id.slice(0, 8),
        start: a.start_date,
        end: a.end_date,
      });
    }
  }
  for (const t of params.timeOff) {
    if (rangesOverlap(params.range, { start: t.start_date, end: t.end_date })) {
      out.push({ kind: "time_off", timeOffType: t.type, start: t.start_date, end: t.end_date });
    }
  }
  return out;
}
