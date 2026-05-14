import type { Position } from "./domain";

export type UtilizationRow = {
  position: Position;
  totalActive: number;
  assigned: number;
  pct: number;
};

/**
 * Compute utilization for a given as-of date.
 * "Assigned" = unique employees whose assignment range includes the date.
 */
export function computeUtilization(params: {
  asOf: string; // YYYY-MM-DD
  employees: Array<{ id: string; position: Position; active: boolean }>;
  assignments: Array<{ employee_id: string; start_date: string; end_date: string }>;
}): UtilizationRow[] {
  const positions: Position[] = ["Tech", "Supervisor", "Project Manager", "Engineer", "Safety"];
  const empById = new Map(params.employees.filter((e) => e.active).map((e) => [e.id, e]));

  const assignedByPos = new Map<Position, Set<string>>();
  for (const p of positions) assignedByPos.set(p, new Set());

  for (const a of params.assignments) {
    if (params.asOf < a.start_date || params.asOf > a.end_date) continue;
    const emp = empById.get(a.employee_id);
    if (!emp) continue;
    assignedByPos.get(emp.position)!.add(emp.id);
  }

  return positions.map((p) => {
    const totalActive = params.employees.filter((e) => e.active && e.position === p).length;
    const assigned = assignedByPos.get(p)!.size;
    const pct = totalActive === 0 ? 0 : Math.round((assigned / totalActive) * 100);
    return { position: p, totalActive, assigned, pct };
  });
}
