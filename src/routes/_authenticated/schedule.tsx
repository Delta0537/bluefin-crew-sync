import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  LayoutGrid,
  FolderKanban,
  Pencil,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { POSITIONS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { EmptyState } from "@/components/empty-state";
import { AssignmentDatesDialog } from "@/components/assignment-dates-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  component: SchedulePage,
});

const DAYS = 28;
const COL_PX = 36;

/**
 * A small, accessible palette used to color-code customers / projects.
 * We hash the customer name to one of these so the same customer always
 * gets the same color across rows, no matter how many jobs they have.
 */
const CUSTOMER_PALETTE: { bg: string; bar: string; text: string; ring: string }[] = [
  { bg: "bg-sky-500/15",     bar: "bg-sky-500",     text: "text-sky-700 dark:text-sky-300",         ring: "ring-sky-500/40" },
  { bg: "bg-emerald-500/15", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/40" },
  { bg: "bg-amber-500/15",   bar: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300",     ring: "ring-amber-500/40" },
  { bg: "bg-rose-500/15",    bar: "bg-rose-500",    text: "text-rose-700 dark:text-rose-300",       ring: "ring-rose-500/40" },
  { bg: "bg-violet-500/15",  bar: "bg-violet-500",  text: "text-violet-700 dark:text-violet-300",   ring: "ring-violet-500/40" },
  { bg: "bg-cyan-500/15",    bar: "bg-cyan-500",    text: "text-cyan-700 dark:text-cyan-300",       ring: "ring-cyan-500/40" },
  { bg: "bg-orange-500/15",  bar: "bg-orange-500",  text: "text-orange-700 dark:text-orange-300",   ring: "ring-orange-500/40" },
  { bg: "bg-lime-500/15",    bar: "bg-lime-500",    text: "text-lime-700 dark:text-lime-300",       ring: "ring-lime-500/40" },
  { bg: "bg-pink-500/15",    bar: "bg-pink-500",    text: "text-pink-700 dark:text-pink-300",       ring: "ring-pink-500/40" },
  { bg: "bg-indigo-500/15",  bar: "bg-indigo-500",  text: "text-indigo-700 dark:text-indigo-300",   ring: "ring-indigo-500/40" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function customerColor(name: string | null | undefined) {
  const key = (name ?? "").trim() || "Unassigned";
  return CUSTOMER_PALETTE[hashString(key) % CUSTOMER_PALETTE.length];
}

type ViewMode = "people" | "projects";

function SchedulePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canModify } = useAuth();

  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filter, setFilter] = useState<Position | "all">("all");
  const [view, setView] = useState<ViewMode>("people");

  const [editAssignId, setEditAssignId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const rangeStart = anchor;
  const rangeEnd = addDays(anchor, DAYS - 1);
  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

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
    queryKey: ["schedule-assigns", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select(
          "*, jobs(id, fc_number, customer_name, site_name, site_city, site_state, service_type, po_status, status)",
        )
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (error) throw error;
      return data;
    },
  });

  const timeOffQ = useQuery({
    queryKey: ["schedule-time-off", startStr, endStr],
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
    (e) => filter === "all" || e.position === filter,
  );

  const loading = employeesQ.isLoading || assignsQ.isLoading || timeOffQ.isLoading;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["schedule-assigns"] });
    qc.invalidateQueries({ queryKey: ["schedule-v2-assigns"] });
    qc.invalidateQueries({ queryKey: ["assignments-all"] });
    qc.invalidateQueries({ queryKey: ["job-assignments"] });
  };

  /* ── Project-grouped view (people under each project) ───────────── */
  const projectGroups = useMemo(() => {
    type RawAssign = NonNullable<typeof assignsQ.data>[number];
    type Grp = {
      jobId: string;
      customer: string;
      site: string;
      fc: string;
      service: string;
      poStatus: string;
      status: string;
      assigns: RawAssign[];
    };
    const map = new Map<string, Grp>();
    for (const a of assignsQ.data ?? []) {
      const job = (a.jobs as {
        id?: string;
        fc_number?: string;
        customer_name?: string;
        site_name?: string;
        site_city?: string;
        site_state?: string;
        service_type?: string;
        po_status?: string;
        status?: string;
      } | null) ?? null;
      const id = a.job_id;
      if (!map.has(id)) {
        map.set(id, {
          jobId: id,
          customer: job?.customer_name ?? "Unassigned customer",
          site:
            [job?.site_name, [job?.site_city, job?.site_state].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" · ") || "—",
          fc: job?.fc_number ?? "—",
          service: job?.service_type ?? "—",
          poStatus: job?.po_status ?? "None",
          status: job?.status ?? "Upcoming",
          assigns: [],
        });
      }
      map.get(id)!.assigns.push(a);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.customer.localeCompare(b.customer),
    );
  }, [assignsQ.data]);

  const empById = useMemo(() => {
    const m = new Map<
      string,
      { first_name: string; last_name: string; position: Position }
    >();
    for (const e of employeesQ.data ?? []) {
      m.set(e.id, {
        first_name: e.first_name,
        last_name: e.last_name,
        position: e.position,
      });
    }
    return m;
  }, [employeesQ.data]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(rangeStart, "MMM d")} – {format(rangeEnd, "MMM d, yyyy")} · color-coded by customer
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="inline-flex rounded-md border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setView("people")}
              className={cn(
                "px-2.5 py-1 text-xs inline-flex items-center gap-1 transition-colors",
                view === "people"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> By person
            </button>
            <button
              type="button"
              onClick={() => setView("projects")}
              className={cn(
                "px-2.5 py-1 text-xs inline-flex items-center gap-1 border-l transition-colors",
                view === "projects"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <FolderKanban className="h-3.5 w-3.5" /> By project
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAnchor((a) => addDays(a, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
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
      </div>

      {view === "people" && (
        <div className="flex gap-1 flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All positions
          </FilterChip>
          {POSITIONS.map((p) => (
            <FilterChip key={p} active={filter === p} onClick={() => setFilter(p)}>
              {p}
            </FilterChip>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : view === "people" ? (
          employees.length === 0 ? (
            <EmptyState
              icon={<CalendarRange className="h-8 w-8" />}
              title="No people to schedule"
              description="Add personnel to populate the timeline."
            />
          ) : (
            <PeopleView
              employees={employees}
              days={days}
              rangeStart={rangeStart}
              assigns={assignsQ.data ?? []}
              timeOff={timeOffQ.data ?? []}
              canModify={canModify}
              onEditAssignment={(id) => {
                setEditAssignId(id);
                setEditOpen(true);
              }}
            />
          )
        ) : projectGroups.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects in this window"
            description="Adjust the date range or assign people to jobs to see them grouped here."
          />
        ) : (
          <ProjectsView
            groups={projectGroups}
            empById={empById}
            days={days}
            rangeStart={rangeStart}
            canModify={canModify}
            onEditAssignment={(id) => {
              setEditAssignId(id);
              setEditOpen(true);
            }}
            onOpenJob={(jobId) => navigate({ to: "/jobs/$jobId", params: { jobId } })}
          />
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Each customer has a unique color; rows alternate shading for readability.
        </span>
        <span>Click a bar to open the job.</span>
        {canModify && (
          <span>
            Use the <Pencil className="inline h-3 w-3" /> icon on a bar to shift dates.
          </span>
        )}
      </div>

      <AssignmentDatesDialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) setEditAssignId(null);
          setEditOpen(o);
        }}
        assignmentId={editAssignId}
        onSaved={invalidate}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* People view — rows are people, bars are projects                    */
/* ─────────────────────────────────────────────────────────────────── */
function PeopleView({
  employees,
  days,
  rangeStart,
  assigns,
  timeOff,
  canModify,
  onEditAssignment,
}: {
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    position: Position;
  }>;
  days: Date[];
  rangeStart: Date;
  assigns: Array<{
    id: string;
    employee_id: string;
    job_id: string;
    start_date: string;
    end_date: string;
    role_on_job: Position;
    jobs: { customer_name?: string; fc_number?: string } | null;
  }>;
  timeOff: Array<{
    id: string;
    employee_id: string;
    type: string;
    start_date: string;
    end_date: string;
  }>;
  canModify: boolean;
  onEditAssignment: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <HeaderRow days={days} />
        {employees.map((emp, idx) => {
          const empAssigns = assigns.filter((a) => a.employee_id === emp.id);
          const empTimeOff = timeOff.filter((t) => t.employee_id === emp.id);
          const stripe = idx % 2 === 0 ? "bg-background" : "bg-muted/30";
          return (
            <div
              key={emp.id}
              className={cn(
                "flex border-b transition-colors hover:bg-accent/40",
                stripe,
              )}
            >
              <div className="w-60 shrink-0 px-3 py-2 border-r flex items-center gap-2 min-w-0">
                <PositionBadge position={emp.position} short />
                <span className="text-sm font-medium truncate">
                  {emp.first_name} {emp.last_name}
                </span>
              </div>
              <div className="relative flex" style={{ height: 48 }}>
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "shrink-0 border-r",
                      isWeekend(d) && "bg-muted/40",
                      isToday(d) && "bg-primary/5",
                    )}
                    style={{ width: COL_PX }}
                  />
                ))}
                {empTimeOff.map((t) => {
                  const bar = computeBar(
                    t.start_date,
                    t.end_date,
                    rangeStart,
                    days.length,
                  );
                  if (!bar) return null;
                  return (
                    <div
                      key={t.id}
                      className="absolute top-1.5 h-3 rounded-sm bg-muted-foreground/30 border border-muted-foreground/50"
                      style={{ left: bar.left, width: bar.width }}
                      title={`${t.type}: ${format(parseISO(t.start_date), "MMM d")} – ${format(parseISO(t.end_date), "MMM d")}`}
                    />
                  );
                })}
                {empAssigns.map((a) => {
                  const bar = computeBar(
                    a.start_date,
                    a.end_date,
                    rangeStart,
                    days.length,
                  );
                  if (!bar) return null;
                  const c = customerColor(a.jobs?.customer_name);
                  return (
                    <div
                      key={a.id}
                      className="absolute top-6 h-5 flex items-stretch"
                      style={{ left: bar.left, width: bar.width }}
                    >
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: a.job_id }}
                        className={cn(
                          "flex-1 rounded-l-md px-2 text-[10px] font-medium truncate flex items-center shadow-sm hover:ring-2 transition-all",
                          c.bg,
                          c.text,
                          c.ring,
                        )}
                        title={`${a.jobs?.customer_name ?? "Job"} (${a.role_on_job})`}
                      >
                        <span className={cn("inline-block w-1.5 h-full mr-1.5", c.bar)} />
                        {a.jobs?.customer_name ?? "Job"}
                      </Link>
                      {canModify && (
                        <button
                          type="button"
                          onClick={() => onEditAssignment(a.id)}
                          className={cn(
                            "rounded-r-md px-1 border-l border-background/40 hover:opacity-100 opacity-70",
                            c.bg,
                            c.text,
                          )}
                          title="Shift dates"
                        >
                          <Pencil className="h-3 w-3" />
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
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Project view — group by job, list assigned people under each        */
/* ─────────────────────────────────────────────────────────────────── */
function ProjectsView({
  groups,
  empById,
  days,
  rangeStart,
  canModify,
  onEditAssignment,
  onOpenJob,
}: {
  groups: Array<{
    jobId: string;
    customer: string;
    site: string;
    fc: string;
    service: string;
    poStatus: string;
    status: string;
    assigns: Array<{
      id: string;
      employee_id: string;
      job_id: string;
      start_date: string;
      end_date: string;
      role_on_job: Position;
    }>;
  }>;
  empById: Map<
    string,
    { first_name: string; last_name: string; position: Position }
  >;
  days: Date[];
  rangeStart: Date;
  canModify: boolean;
  onEditAssignment: (id: string) => void;
  onOpenJob: (jobId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <HeaderRow days={days} />
        {groups.map((g) => {
          const c = customerColor(g.customer);
          return (
            <div key={g.jobId} className="border-b last:border-b-0">
              {/* Project header */}
              <button
                type="button"
                onClick={() => onOpenJob(g.jobId)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left border-b hover:opacity-90 transition-opacity",
                  c.bg,
                )}
              >
                <span className={cn("inline-block w-2 h-6 rounded-sm", c.bar)} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-semibold truncate", c.text)}>
                    {g.customer}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    FC {g.fc} · {g.site} · {g.service}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {g.status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  PO: {g.poStatus}
                </Badge>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {g.assigns.length}
                </span>
              </button>
              {/* Person rows for this project */}
              {g.assigns.map((a, idx) => {
                const emp = empById.get(a.employee_id);
                const stripe = idx % 2 === 0 ? "bg-background" : "bg-muted/20";
                const bar = computeBar(
                  a.start_date,
                  a.end_date,
                  rangeStart,
                  days.length,
                );
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex border-b last:border-b-0 hover:bg-accent/40",
                      stripe,
                    )}
                  >
                    <div className="w-60 shrink-0 px-3 py-1.5 border-r flex items-center gap-2 min-w-0">
                      {emp ? (
                        <>
                          <PositionBadge position={emp.position} short />
                          <span className="text-sm font-medium truncate">
                            {emp.first_name} {emp.last_name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Unknown person
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {a.role_on_job}
                      </span>
                    </div>
                    <div className="relative flex" style={{ height: 32 }}>
                      {days.map((d) => (
                        <div
                          key={d.toISOString()}
                          className={cn(
                            "shrink-0 border-r",
                            isWeekend(d) && "bg-muted/40",
                            isToday(d) && "bg-primary/5",
                          )}
                          style={{ width: COL_PX }}
                        />
                      ))}
                      {bar && (
                        <div
                          className="absolute top-1.5 h-5 flex items-stretch"
                          style={{ left: bar.left, width: bar.width }}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenJob(g.jobId)}
                            className={cn(
                              "flex-1 rounded-l-md px-2 text-[10px] font-medium truncate flex items-center shadow-sm hover:ring-2 transition-all",
                              c.bg,
                              c.text,
                              c.ring,
                            )}
                            title={`${format(parseISO(a.start_date), "MMM d")} – ${format(parseISO(a.end_date), "MMM d")}`}
                          >
                            <span className={cn("inline-block w-1.5 h-full mr-1.5", c.bar)} />
                            {format(parseISO(a.start_date), "MMM d")} – {format(parseISO(a.end_date), "MMM d")}
                          </button>
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => onEditAssignment(a.id)}
                              className={cn(
                                "rounded-r-md px-1 border-l border-background/40 hover:opacity-100 opacity-70",
                                c.bg,
                                c.text,
                              )}
                              title="Shift dates"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeaderRow({ days }: { days: Date[] }) {
  return (
    <div className="sticky top-0 z-10 flex bg-background border-b">
      <div className="w-60 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r">
        Crew member / Project
      </div>
      <div className="flex">
        {days.map((d) => {
          const today = isToday(d);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "shrink-0 text-center border-r text-[10px] leading-tight py-1.5",
                isWeekend(d) && "bg-muted/40",
                today && "bg-primary/10",
              )}
              style={{ width: COL_PX }}
            >
              <div
                className={cn(
                  "text-muted-foreground",
                  today && "text-primary font-semibold",
                )}
              >
                {format(d, "EEE")}
              </div>
              <div className={cn("font-semibold", today && "text-primary")}>
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeBar(start: string, end: string, rangeStart: Date, days: number) {
  const s = parseISO(start);
  const e = parseISO(end);
  const startIdx = Math.max(0, differenceInCalendarDays(s, rangeStart));
  const endIdx = Math.min(days - 1, differenceInCalendarDays(e, rangeStart));
  if (endIdx < 0 || startIdx > days - 1) return null;
  return {
    left: startIdx * COL_PX + 2,
    width: (endIdx - startIdx + 1) * COL_PX - 4,
  };
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
