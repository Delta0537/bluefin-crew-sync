import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Grid2x2, Briefcase, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { POSITIONS, JOB_STATUS_TONE, PO_STATUS_TONE } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { EmptyState } from "@/components/empty-state";
import { TimeOffDialog, type TimeOffRecord } from "@/components/time-off-dialog";
import { AssignmentDatesDialog } from "@/components/assignment-dates-dialog";
import { ScheduleCalendarStrip } from "@/components/schedule-calendar-strip";
import { customerBrandCellClasses } from "@/lib/brand-customer-colors";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type TimeOffType = Database["public"]["Enums"]["time_off_type"];

export const Route = createFileRoute("/_authenticated/schedule-v2")({
  component: ScheduleV2Page,
});

const DAYS = 28;
const CELL_W = 58;

const TIME_OFF_ABBR: Record<TimeOffType, string> = {
  PTO: "PTO",
  Sick: "SICK",
  Medical: "MED",
  Vacation: "VAC",
  Bereavement: "BRV",
  "Light Duty": "LD",
  Out: "OUT",
  Other: "OTH",
};

function ScheduleV2Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canModify } = useAuth();
  const [anchor, setAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [posFilter, setPosFilter] = useState<Position | "all">("all");

  const [quickEdit, setQuickEdit] = useState<{
    employeeName: string;
    day: Date;
    cell: {
      label: string;
      jobId?: string;
      assignmentId?: string;
      timeOffId?: string;
      tone: "assignment" | "off" | "duty";
      customerName?: string;
    };
  } | null>(null);

  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [timeOffRecord, setTimeOffRecord] = useState<TimeOffRecord | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);

  const rangeStart = anchor;
  const rangeEnd = addDays(anchor, DAYS - 1);
  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  const jobsQ = useQuery({
    queryKey: ["jobs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("mobe_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const employeesQ = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("active", true)
        .order("position")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const assignsQ = useQuery({
    queryKey: ["schedule-v2-assigns", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, jobs(id, fc_number, customer_name)")
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (error) throw error;
      return data;
    },
  });

  const timeOffQ = useQuery({
    queryKey: ["schedule-v2-time-off", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off")
        .select("*")
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (error) throw error;
      return data;
    },
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const employees = (employeesQ.data ?? []).filter(
    (e) => posFilter === "all" || e.position === posFilter,
  );

  const ongoingJobs = (jobsQ.data ?? []).filter((j) => j.status === "Ongoing");
  const upcomingJobs = (jobsQ.data ?? []).filter(
    (j) => j.status === "Upcoming" || j.status === "Bidding",
  );

  const gridLoading =
    employeesQ.isLoading || assignsQ.isLoading || timeOffQ.isLoading;

  const invalidateScheduleData = () => {
    qc.invalidateQueries({ queryKey: ["schedule-v2-assigns"] });
    qc.invalidateQueries({ queryKey: ["schedule-v2-time-off"] });
    qc.invalidateQueries({ queryKey: ["time-off-roster"] });
    qc.invalidateQueries({ queryKey: ["time-off-all"] });
    qc.invalidateQueries({ queryKey: ["time-off-all-for-assign"] });
    qc.invalidateQueries({ queryKey: ["assignments-all"] });
    qc.invalidateQueries({ queryKey: ["assignments-all-for-assign"] });
    qc.invalidateQueries({ queryKey: ["job-assignments"] });
  };

  // Build per-employee, per-day cell content
  const cellMap = useMemo(() => {
    type CellInfo = {
      label: string;
      jobId?: string;
      assignmentId?: string;
      timeOffId?: string;
      tone: "assignment" | "off" | "duty";
      customerName?: string;
    };
    const m = new Map<string, Map<string, CellInfo>>();

    // Time off first so PTO / leave always shows on the grid even if a job assignment overlaps.
    for (const t of timeOffQ.data ?? []) {
      if (!m.has(t.employee_id)) m.set(t.employee_id, new Map());
      const empMap = m.get(t.employee_id)!;
      const s = parseISO(t.start_date);
      const e = parseISO(t.end_date);
      const abbr = TIME_OFF_ABBR[t.type as TimeOffType] ?? t.type.slice(0, 4).toUpperCase();
      const tone = t.type === "Light Duty" ? "duty" : "off";
      for (const d of days) {
        if (d < s || d > e) continue;
        const key = format(d, "yyyy-MM-dd");
        empMap.set(key, { label: abbr, tone, timeOffId: t.id });
      }
    }

    for (const a of assignsQ.data ?? []) {
      if (!m.has(a.employee_id)) m.set(a.employee_id, new Map());
      const empMap = m.get(a.employee_id)!;
      const s = parseISO(a.start_date);
      const e = parseISO(a.end_date);
      const jobRow = a.jobs as { fc_number?: string; customer_name?: string } | null;
      const rawFc: string = jobRow?.fc_number ?? "";
      const label = rawFc.length > 10 ? rawFc.slice(-7) : rawFc || a.job_id.slice(0, 7);
      const customerName = jobRow?.customer_name;
      for (const d of days) {
        if (d < s || d > e) continue;
        const key = format(d, "yyyy-MM-dd");
        if (!empMap.has(key)) {
          empMap.set(key, {
            label,
            jobId: a.job_id,
            assignmentId: a.id,
            tone: "assignment",
            customerName,
          });
        }
      }
    }

    return m;
  }, [assignsQ.data, timeOffQ.data, days]);

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">EOB Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Electronic Operations Board rev. 2 — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      <ScheduleCalendarStrip
        rangeLabel={`${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`}
        startStr={startStr}
        endStr={endStr}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <JobsSection
          title="Ongoing"
          jobs={ongoingJobs}
          loading={jobsQ.isLoading}
          onNavigate={(id) => navigate({ to: "/jobs/$jobId", params: { jobId: id } })}
        />
        <JobsSection
          title="Upcoming / Bidding"
          jobs={upcomingJobs}
          loading={jobsQ.isLoading}
          onNavigate={(id) => navigate({ to: "/jobs/$jobId", params: { jobId: id } })}
        />
      </div>

      {/* ── Personnel Grid ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold">Personnel grid</h2>
            <p className="text-xs text-muted-foreground">
              {format(rangeStart, "MMM d")} – {format(rangeEnd, "MMM d, yyyy")} ·
              Leave/PTO takes priority; click a cell for quick actions
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor((a) => addDays(a, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor((a) => addDays(a, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap mb-3">
          <FilterChip active={posFilter === "all"} onClick={() => setPosFilter("all")}>
            All positions
          </FilterChip>
          {POSITIONS.map((p) => (
            <FilterChip key={p} active={posFilter === p} onClick={() => setPosFilter(p)}>
              {p}
            </FilterChip>
          ))}
        </div>

        <Card className="overflow-hidden">
          {gridLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Grid2x2 className="h-8 w-8" />}
              title="No personnel to display"
              description="Add active crew members to populate the grid."
            />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-fit">
                {/* Header row */}
                <div className="sticky top-0 z-10 flex bg-background border-b">
                  <div className="w-52 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r">
                    Crew member
                  </div>
                  <div className="flex">
                    {days.map((d) => {
                      const today = isToday(d);
                      return (
                        <div
                          key={d.toISOString()}
                          className={cn(
                            "shrink-0 text-center border-r leading-tight py-1",
                            isWeekend(d) && "bg-muted/40",
                            today && "bg-primary/10",
                          )}
                          style={{ width: CELL_W }}
                        >
                          <div
                            className={cn(
                              "text-[10px] text-muted-foreground",
                              today && "text-primary font-semibold",
                            )}
                          >
                            {format(d, "EEE")}
                          </div>
                          <div
                            className={cn(
                              "text-xs font-semibold",
                              today && "text-primary",
                            )}
                          >
                            {format(d, "d")}
                          </div>
                          <div className="text-[9px] text-muted-foreground/60">
                            {format(d, "MMM")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employee rows */}
                {employees.map((emp) => {
                  const empCells = cellMap.get(emp.id);
                  return (
                    <div key={emp.id} className="flex border-b hover:bg-accent/20">
                      <div className="w-52 shrink-0 px-3 py-0 border-r flex items-center gap-2 min-w-0 h-10">
                        <PositionBadge position={emp.position} short />
                        <span className="text-xs font-medium truncate">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                      <div className="flex">
                        {days.map((d) => {
                          const key = format(d, "yyyy-MM-dd");
                          const cell = empCells?.get(key);
                          const weekend = isWeekend(d);
                          const today = isToday(d);
                          return (
                            <div
                              key={d.toISOString()}
                              className={cn(
                                "shrink-0 border-r flex items-center justify-center h-10",
                                weekend && "bg-muted/40",
                                today && !cell && "bg-primary/5",
                              )}
                              style={{ width: CELL_W }}
                            >
                              {cell && (
                                <button
                                  type="button"
                                  title={`${cell.label} — quick edit`}
                                  className={cn(
                                    cell.tone === "assignment" &&
                                      cn(customerBrandCellClasses(cell.customerName), "font-mono"),
                                    cell.tone === "off" &&
                                      "max-w-full truncate rounded-sm px-0.5 text-[9px] font-semibold text-muted-foreground transition-colors hover:ring-1 hover:ring-muted-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    cell.tone === "duty" &&
                                      "max-w-full truncate rounded-sm px-0.5 text-[9px] font-semibold text-warning transition-colors hover:ring-1 hover:ring-warning/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  )}
                                  onClick={() =>
                                    setQuickEdit({
                                      employeeName: `${emp.first_name} ${emp.last_name}`,
                                      day: d,
                                      cell,
                                    })
                                  }
                                >
                                  {cell.label}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
          <span>Assignment cells use GATE / BlueFin brand tints by client (same hash as Schedule).</span>
          <span>Click a cell — open job, edit PTO, or shift assignment dates (managers)</span>
          <span>PTO / VAC / SICK / MED / BRV = paid leave types</span>
          <span className="text-warning font-medium">LD = Light Duty</span>
          <span>OUT = Out (non-leave absence)</span>
        </div>
      </div>

      <Dialog
        open={!!quickEdit}
        onOpenChange={(o) => {
          if (!o) setQuickEdit(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {quickEdit?.employeeName}
            </DialogTitle>
            <DialogDescription>
              {quickEdit && (
                <>
                  {format(quickEdit.day, "EEEE, MMM d, yyyy")} ·{" "}
                  <span className="font-medium text-foreground">{quickEdit.cell.label}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {quickEdit?.cell.jobId && (
              <Button variant="outline" className="justify-start" asChild>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: quickEdit.cell.jobId }}
                  onClick={() => setQuickEdit(null)}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Open job details
                </Link>
              </Button>
            )}
            {quickEdit?.cell.timeOffId && canModify && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  const t = timeOffQ.data?.find((x) => x.id === quickEdit.cell.timeOffId);
                  if (!t) return;
                  setTimeOffRecord({
                    id: t.id,
                    employee_id: t.employee_id,
                    type: t.type as TimeOffType,
                    start_date: t.start_date,
                    end_date: t.end_date,
                    notes: t.notes,
                  });
                  setQuickEdit(null);
                  setTimeOffOpen(true);
                }}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Edit time off
              </Button>
            )}
            {quickEdit?.cell.assignmentId && canModify && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setAssignId(quickEdit.cell.assignmentId!);
                  setQuickEdit(null);
                  setAssignOpen(true);
                }}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Shift assignment dates
              </Button>
            )}
            {quickEdit?.cell.timeOffId && !canModify && (
              <p className="text-xs text-muted-foreground">Time off — ask a manager to edit.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickEdit(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimeOffDialog
        open={timeOffOpen}
        onOpenChange={(o) => {
          if (!o) setTimeOffRecord(null);
          setTimeOffOpen(o);
        }}
        record={timeOffRecord ?? undefined}
        employees={(employeesQ.data ?? []).map((e) => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
        }))}
        onSaved={invalidateScheduleData}
      />

      <AssignmentDatesDialog
        open={assignOpen}
        onOpenChange={(o) => {
          if (!o) setAssignId(null);
          setAssignOpen(o);
        }}
        assignmentId={assignId}
        onSaved={invalidateScheduleData}
      />
    </div>
  );
}

function JobsSection({
  title,
  jobs,
  loading,
  onNavigate,
}: {
  title: string;
  jobs: Job[];
  loading: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {!loading && (
          <Badge variant="outline" className="text-xs tabular-nums">
            {jobs.length}
          </Badge>
        )}
      </div>
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No {title.toLowerCase()} jobs.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">FC #</TableHead>
                <TableHead>Client / Site</TableHead>
                <TableHead className="hidden sm:table-cell w-20">Svc</TableHead>
                <TableHead className="hidden md:table-cell w-24">PM</TableHead>
                <TableHead className="hidden lg:table-cell w-20">Mobe</TableHead>
                <TableHead className="w-28">PO status</TableHead>
                <TableHead className="hidden xl:table-cell">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow
                  key={j.id}
                  className="cursor-pointer"
                  onClick={() => onNavigate(j.id)}
                >
                  <TableCell>
                    <span className="font-mono text-xs">{j.fc_number}</span>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="font-medium hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {j.customer_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {j.site_name ? `${j.site_name} · ` : ""}
                      {j.site_city}, {j.site_state}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px]">
                      {j.service_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {j.tsm_psm ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {format(new Date(j.mobe_date), "MMM d")}
                    <span className="block text-[10px]">
                      → {format(new Date(j.est_completion_date), "MMM d")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                        PO_STATUS_TONE[j.po_status],
                      )}
                    >
                      {j.po_status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                    {j.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded-md border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
