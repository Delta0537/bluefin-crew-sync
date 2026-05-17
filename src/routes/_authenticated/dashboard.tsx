import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { POSITIONS, JOB_STATUS_TONE } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { computeUtilization } from "@/lib/utilization";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

/** Post–schema-corrections labels plus legacy seed enums still seen on some DBs */
const ACTIVE_JOB_STATUSES = new Set([
  "Ongoing",
  "Upcoming",
  "Bidding",
  "In Progress",
  "Confirmed",
  "Tentative",
]);

function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const assignmentsQ = useQuery({
    queryKey: ["assignments-active", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data;
    },
  });

  const jobsQ = useQuery({
    queryKey: ["jobs-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("mobe_date", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const loading = employeesQ.isLoading || assignmentsQ.isLoading;

  const utilization = useMemo(() => {
    if (!employeesQ.data || !assignmentsQ.data) return [];
    return computeUtilization({
      asOf: today,
      employees: employeesQ.data.map((e) => ({ id: e.id, position: e.position, active: e.active })),
      assignments: assignmentsQ.data,
    });
  }, [employeesQ.data, assignmentsQ.data, today]);

  // 85% threshold toast — fires once per session per overloaded position
  useEffect(() => {
    if (!utilization.length) return;
    const key = "bf-util-warn-" + today;
    const warned: Position[] = JSON.parse(sessionStorage.getItem(key) || "[]");
    const hot = utilization.filter((r) => r.pct >= 85 && !warned.includes(r.position));
    if (hot.length) {
      hot.forEach((r) => {
        toast.warning(`${r.position} utilization at ${r.pct}%`, {
          description: `${r.assigned} of ${r.totalActive} assigned today.`,
        });
      });
      sessionStorage.setItem(key, JSON.stringify([...warned, ...hot.map((r) => r.position)]));
    }
  }, [utilization, today]);

  const activeJobs = jobsQ.data?.filter((j) => ACTIVE_JOB_STATUSES.has(j.status)).length ?? 0;
  const totalActive = employeesQ.data?.filter((e) => e.active).length ?? 0;
  const assignedToday = new Set(assignmentsQ.data?.map((a) => a.employee_id) ?? []).size;
  const overall = totalActive === 0 ? 0 : Math.round((assignedToday / totalActive) * 100);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active jobs" value={activeJobs} icon={Briefcase} loading={jobsQ.isLoading} />
        <StatCard label="Active personnel" value={totalActive} icon={Users} loading={employeesQ.isLoading} />
        <StatCard label="Assigned today" value={assignedToday} icon={TrendingUp} loading={loading} />
        <StatCard label="Overall utilization" value={`${overall}%`} icon={AlertTriangle} loading={loading} tone={overall >= 85 ? "warning" : undefined} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Utilization by position</h2>
            <p className="text-xs text-muted-foreground">As of today — 85% threshold triggers an alert.</p>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {POSITIONS.map((p) => (
              <Skeleton key={p} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {utilization.map((row) => (
              <UtilizationBar key={row.position} row={row} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Upcoming & recent jobs</h2>
        {jobsQ.isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {(jobsQ.data ?? []).map((j) => (
              <div key={j.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{j.customer_name}</span>
                    <Badge variant="outline" className="text-[10px]">{j.service_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {j.site_name ? `${j.site_name} · ` : ""}{j.site_city}, {j.site_state}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {format(new Date(j.mobe_date), "MMM d")} → {format(new Date(j.est_completion_date), "MMM d")}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                    (JOB_STATUS_TONE as Record<string, string>)[j.status] ??
                      "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, loading, tone }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; loading?: boolean; tone?: "warning" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={cn("h-4 w-4", tone === "warning" ? "text-warning" : "text-muted-foreground")} />
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <div className={cn("mt-2 text-2xl font-semibold tabular-nums", tone === "warning" && "text-warning")}>{value}</div>}
    </Card>
  );
}

function UtilizationBar({ row }: { row: ReturnType<typeof computeUtilization>[number] }) {
  const hot = row.pct >= 85;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <PositionBadge position={row.position} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.assigned}/{row.totalActive}
          </span>
        </div>
        <span className={cn("text-sm font-semibold tabular-nums", hot ? "text-warning" : "")}>{row.pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", hot ? "bg-warning" : "bg-primary")}
          style={{ width: `${Math.min(100, row.pct)}%` }}
        />
      </div>
    </div>
  );
}
