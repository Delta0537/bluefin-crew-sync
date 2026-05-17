import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { customerBrandStripes } from "@/lib/brand-customer-colors";

export const Route = createFileRoute("/_authenticated/schedule-gantt")({
  component: ScheduleGanttPage,
});

const CELL = 34;

type JobRow = {
  id: string;
  fc_number: string;
  customer_name: string;
  mobe_date: string;
  est_completion_date: string;
};

type CalRow = {
  id: string;
  kind: "walk_down" | "meeting";
  title: string;
  start_date: string;
  end_date: string;
};

type GridRow =
  | { kind: "job"; id: string; label: string; customer: string; start: string; end: string; jobId: string }
  | { kind: "cal"; id: string; label: string; tag: string; start: string; end: string };

function ScheduleGanttPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const jobsQ = useQuery({
    queryKey: ["schedule-gantt", "jobs", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("id, fc_number, customer_name, mobe_date, est_completion_date");
      if (error) throw error;
      const list = (data ?? []) as JobRow[];
      return list.filter((j) => {
        const m = parseISO(j.mobe_date);
        const e = parseISO(j.est_completion_date);
        return m <= monthEnd && e >= monthStart;
      });
    },
  });

  const calQ = useQuery({
    queryKey: ["schedule-calendar-items", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_calendar_items")
        .select("id, kind, title, start_date, end_date")
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (error) throw error;
      return (data ?? []) as CalRow[];
    },
  });

  const rows = useMemo(() => {
    const r: GridRow[] = [];
    for (const j of jobsQ.data ?? []) {
      r.push({
        kind: "job",
        id: j.id,
        label: j.fc_number,
        customer: j.customer_name,
        start: j.mobe_date,
        end: j.est_completion_date,
        jobId: j.id,
      });
    }
    for (const c of calQ.data ?? []) {
      r.push({
        kind: "cal",
        id: c.id,
        label: c.title,
        tag: c.kind === "walk_down" ? "Walk-down" : "Meeting",
        start: c.start_date,
        end: c.end_date,
      });
    }
    return r.sort((a, b) => a.label.localeCompare(b.label));
  }, [jobsQ.data, calQ.data]);

  function barMetrics(start: string, end: string) {
    const s = parseISO(start);
    const e = parseISO(end);
    const startIdx = Math.max(0, differenceInCalendarDays(s, monthStart));
    const endIdx = Math.min(days.length - 1, differenceInCalendarDays(e, monthStart));
    if (endIdx < 0 || startIdx > days.length - 1) return null;
    return {
      left: startIdx * CELL + 2,
      width: (endIdx - startIdx + 1) * CELL - 4,
    };
  }

  const loading = jobsQ.isLoading || calQ.isLoading;

  return (
    <div className="p-6 space-y-4 max-w-[1900px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gantt view</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(month, "MMMM yyyy")} · jobs (mobe → completion) plus walk-downs and meetings
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(addMonths(month, -1)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            This month
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(addMonths(month, 1)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="min-w-fit p-2">
            <div className="flex border-b bg-muted/30 sticky top-0 z-[1]">
              <div className="w-52 shrink-0 px-2 py-2 text-xs font-semibold text-muted-foreground border-r">
                FC / event
              </div>
              <div className="flex">
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="shrink-0 text-center text-[10px] text-muted-foreground border-r py-1"
                    style={{ width: CELL }}
                  >
                    <div>{format(d, "EEE")}</div>
                    <div className="font-semibold text-foreground">{format(d, "d")}</div>
                  </div>
                ))}
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                No jobs or events overlap this month. Create a project on the Create page or add walk-downs / meetings.
              </div>
            ) : (
              rows.map((row) => {
                const st = barMetrics(row.start, row.end);
                const c =
                  row.kind === "job"
                    ? customerBrandStripes(row.customer)
                    : {
                        bg: "bg-brand-sky/20",
                        bar: "bg-brand-lime",
                        text: "text-brand-navy dark:text-brand-lime",
                        ring: "ring-brand-sky/35",
                      };
                return (
                  <div key={`${row.kind}-${row.id}`} className="flex border-b last:border-b-0 hover:bg-accent/10">
                    <div className="w-52 shrink-0 px-2 py-2 text-sm border-r min-w-0">
                      {row.kind === "job" ? (
                        <Link
                          to="/jobs/$jobId"
                          params={{ jobId: row.jobId }}
                          className="font-medium hover:underline truncate block"
                        >
                          {row.label}
                        </Link>
                      ) : (
                        <span className="font-medium truncate block">{row.label}</span>
                      )}
                      <div className="text-[10px] text-muted-foreground truncate">
                        {row.kind === "job" ? row.customer : row.tag}
                      </div>
                    </div>
                    <div className="relative flex h-12" style={{ width: days.length * CELL }}>
                      {days.map((d) => (
                        <div
                          key={d.toISOString()}
                          className="shrink-0 border-r border-border/40"
                          style={{ width: CELL }}
                        />
                      ))}
                      {st && (
                        <div
                          className="absolute"
                          style={{ left: st.left, width: st.width, top: 10, height: 28 }}
                        >
                          <div
                            className={cn(
                              "h-full rounded-md px-1.5 flex items-center gap-1 shadow-sm text-[10px] font-medium truncate ring-1",
                              c.bg,
                              c.text,
                              c.ring,
                            )}
                          >
                            <span className={cn("inline-block w-1 self-stretch rounded-sm shrink-0", c.bar)} />
                            <span className="truncate">
                              {row.kind === "job" ? row.customer : row.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
