import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { parseDateOnlyLocal } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CalendarDays } from "lucide-react";

type Props = {
  rangeLabel: string;
  startStr: string;
  endStr: string;
};

/**
 * Walk-downs & meetings overlapping the schedule window (requires `schedule_calendar_items` migration).
 */
export function ScheduleCalendarStrip({ rangeLabel, startStr, endStr }: Props) {
  const q = useQuery({
    queryKey: ["schedule-calendar-items", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_calendar_items")
        .select("id, kind, title, start_date, end_date")
        .lte("start_date", endStr)
        .gte("end_date", startStr)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (q.isLoading || q.isError || !q.data?.length) return null;

  return (
    <div className="rounded-lg border border-brand-sky/25 bg-brand-navy/5 dark:bg-brand-navy/20 px-3 py-2 mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Walk-downs & meetings · {rangeLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {q.data.map((row) => (
          <Badge
            key={row.id}
            variant="outline"
            className="text-[11px] font-normal gap-1 border-brand-sky/40"
          >
            {row.kind === "walk_down" ? (
              <ClipboardList className="h-3 w-3 text-brand-lime" />
            ) : (
              <CalendarDays className="h-3 w-3 text-brand-sky" />
            )}
            <span className="font-medium text-foreground">{row.title}</span>
            <span className="text-muted-foreground">
              {format(parseDateOnlyLocal(row.start_date), "MMM d")} –{" "}
              {format(parseDateOnlyLocal(row.end_date), "MMM d")}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
