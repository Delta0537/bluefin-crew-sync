import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isWeekend, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { POSITIONS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  component: SchedulePage,
});

const DAYS = 28;
const COL_PX = 36;

function SchedulePage() {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filter, setFilter] = useState<Position | "all">("all");

  const rangeStart = anchor;
  const rangeEnd = addDays(anchor, DAYS - 1);
  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  const employeesQ = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("active", true).order("position").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const assignsQ = useQuery({
    queryKey: ["schedule-assigns", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, jobs(customer_name, service_type)")
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (error) throw error;
      return data;
    },
  });

  const timeOffQ = useQuery({
    queryKey: ["schedule-time-off", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*").lte("start_date", endStr).gte("end_date", startStr);
      if (error) throw error;
      return data;
    },
  });

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);
  const employees = (employeesQ.data ?? []).filter((e) => filter === "all" || e.position === filter);

  const loading = employeesQ.isLoading || assignsQ.isLoading || timeOffQ.isLoading;

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(rangeStart, "MMM d")} – {format(rangeEnd, "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setAnchor((a) => addDays(a, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor((a) => addDays(a, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All positions</FilterChip>
        {POSITIONS.map((p) => (
          <FilterChip key={p} active={filter === p} onClick={() => setFilter(p)}>{p}</FilterChip>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState icon={<CalendarRange className="h-8 w-8" />} title="No people to schedule" description="Add personnel to populate the timeline." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Header row */}
              <div className="sticky top-0 z-10 flex bg-background border-b">
                <div className="w-60 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r">Crew member</div>
                <div className="flex">
                  {days.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "shrink-0 text-center border-r text-[10px] leading-tight py-1.5",
                        isWeekend(d) && "bg-muted/40",
                      )}
                      style={{ width: COL_PX }}
                    >
                      <div className="text-muted-foreground">{format(d, "EEE")}</div>
                      <div className="font-semibold">{format(d, "d")}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Rows */}
              {employees.map((emp) => {
                const empAssigns = (assignsQ.data ?? []).filter((a) => a.employee_id === emp.id);
                const empTimeOff = (timeOffQ.data ?? []).filter((t) => t.employee_id === emp.id);
                return (
                  <div key={emp.id} className="flex border-b hover:bg-accent/30">
                    <div className="w-60 shrink-0 px-3 py-2 border-r flex items-center gap-2 min-w-0">
                      <PositionBadge position={emp.position} short />
                      <span className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</span>
                    </div>
                    <div className="relative flex" style={{ height: 48 }}>
                      {/* Day grid */}
                      {days.map((d) => (
                        <div
                          key={d.toISOString()}
                          className={cn("shrink-0 border-r", isWeekend(d) && "bg-muted/40")}
                          style={{ width: COL_PX }}
                        />
                      ))}
                      {/* Time-off blocks (under assignments) */}
                      {empTimeOff.map((t) => {
                        const bar = computeBar(t.start_date, t.end_date, rangeStart, DAYS);
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
                      {/* Assignment bars */}
                      {empAssigns.map((a) => {
                        const bar = computeBar(a.start_date, a.end_date, rangeStart, DAYS);
                        if (!bar) return null;
                        return (
                          <Link
                            key={a.id}
                            to="/jobs/$jobId"
                            params={{ jobId: a.job_id }}
                            className="absolute top-6 h-5 rounded-md px-2 text-[10px] font-medium truncate flex items-center shadow-sm hover:ring-2 hover:ring-primary/50 transition-all"
                            style={{
                              left: bar.left,
                              width: bar.width,
                              background: `color-mix(in oklab, var(--color-${posToken(a.role_on_job)}) 20%, transparent)`,
                              color: `var(--color-${posToken(a.role_on_job)})`,
                              borderLeft: `3px solid var(--color-${posToken(a.role_on_job)})`,
                            }}
                            title={`${a.jobs?.customer_name ?? "Job"} (${a.role_on_job})`}
                          >
                            {a.jobs?.customer_name ?? "Job"}
                          </Link>
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
    </div>
  );
}

function computeBar(start: string, end: string, rangeStart: Date, days: number) {
  const s = parseISO(start);
  const e = parseISO(end);
  const startIdx = Math.max(0, differenceInCalendarDays(s, rangeStart));
  const endIdx = Math.min(days - 1, differenceInCalendarDays(e, rangeStart));
  if (endIdx < 0 || startIdx > days - 1) return null;
  return { left: startIdx * COL_PX + 2, width: (endIdx - startIdx + 1) * COL_PX - 4 };
}

function posToken(p: Position): string {
  return {
    Tech: "pos-tech",
    Supervisor: "pos-supervisor",
    "Project Manager": "pos-pm",
    Engineer: "pos-engineer",
    Safety: "pos-safety",
  }[p];
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("px-3 py-1 text-xs rounded-md border transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent")}
    >
      {children}
    </button>
  );
}
