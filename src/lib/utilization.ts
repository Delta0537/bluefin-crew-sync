import type { Position } from "./domain";

export type UtilizationRow = {
  position: Position;
  totalActive: number;
  assigned: number;
  pct: number;
};

export type UtilizationPoint = {
  date: string; // YYYY-MM-DD
  pct: number;
  assigned: number;
  totalActive: number;
};

const POSITIONS: Position[] = ["Tech", "Supervisor", "Project Manager", "Engineer", "Safety Lead"];

/**
 * Compute utilization for a given as-of date.
 * "Assigned" = unique employees whose assignment range includes the date,
 * excluding anyone with active time off that day.
 */
export function computeUtilization(params: {
  asOf: string;
  employees: Array<{ id: string; position: Position; active: boolean }>;
  assignments: Array<{ employee_id: string; start_date: string; end_date: string }>;
  timeOff?: Array<{ employee_id: string; start_date: string; end_date: string }>;
}): UtilizationRow[] {
  const activeEmps = params.employees.filter((e) => e.active);
  const empById = new Map(activeEmps.map((e) => [e.id, e]));

  const offToday = new Set(
    (params.timeOff ?? [])
      .filter((t) => params.asOf >= t.start_date && params.asOf <= t.end_date)
      .map((t) => t.employee_id),
  );

  const assignedByPos = new Map<Position, Set<string>>();
  for (const p of POSITIONS) assignedByPos.set(p, new Set());

  for (const a of params.assignments) {
    if (params.asOf < a.start_date || params.asOf > a.end_date) continue;
    if (offToday.has(a.employee_id)) continue;
    const emp = empById.get(a.employee_id);
    if (!emp) continue;
    assignedByPos.get(emp.position)!.add(emp.id);
  }

  return POSITIONS.map((p) => {
    const totalActive = activeEmps.filter((e) => e.position === p).length;
    const assigned = assignedByPos.get(p)!.size;
    const pct = totalActive === 0 ? 0 : Math.round((assigned / totalActive) * 100);
    return { position: p, totalActive, assigned, pct };
  });
}

/**
 * Overall personnel utilization across a date range, one point per day.
 * pct = unique-assigned-employees-not-on-time-off / total-active-employees.
 * Optional `positions` filter restricts the denominator + numerator
 * (e.g. only field personnel: Tech + Supervisor).
 */
export function computeUtilizationSeries(params: {
  dates: string[]; // sorted YYYY-MM-DD
  employees: Array<{ id: string; position: Position; active: boolean }>;
  assignments: Array<{ employee_id: string; start_date: string; end_date: string }>;
  timeOff?: Array<{ employee_id: string; start_date: string; end_date: string }>;
  positions?: Position[];
}): UtilizationPoint[] {
  const filter = params.positions;
  const pool = params.employees.filter(
    (e) => e.active && (!filter || filter.includes(e.position)),
  );
  const totalActive = pool.length;
  const inPool = new Set(pool.map((e) => e.id));

  return params.dates.map((d) => {
    const offToday = new Set(
      (params.timeOff ?? [])
        .filter((t) => d >= t.start_date && d <= t.end_date)
        .map((t) => t.employee_id),
    );
    const assignedToday = new Set<string>();
    for (const a of params.assignments) {
      if (d < a.start_date || d > a.end_date) continue;
      if (!inPool.has(a.employee_id)) continue;
      if (offToday.has(a.employee_id)) continue;
      assignedToday.add(a.employee_id);
    }
    const pct = totalActive === 0 ? 0 : Math.round((assignedToday.size / totalActive) * 100);
    return { date: d, pct, assigned: assignedToday.size, totalActive };
  });
}
