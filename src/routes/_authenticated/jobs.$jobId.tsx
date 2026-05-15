import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Pencil, Plus, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { JobDialog } from "@/components/job-dialog";
import { AssignCrewDialog } from "@/components/assign-crew-dialog";
import { JOB_STATUS_TONE, PO_STATUS_TONE, POSITIONS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { findConflicts } from "@/lib/conflicts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canModify } = useAuth();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const jobQ = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (error) throw error;
      return data;
    },
  });

  const assignsQ = useQuery({
    queryKey: ["job-assignments", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, employees(*)")
        .eq("job_id", jobId);
      if (error) throw error;
      return data;
    },
  });

  // For conflict highlighting in detail view
  const allAssignsQ = useQuery({
    queryKey: ["assignments-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_assignments").select("*, jobs(customer_name)");
      if (error) throw error;
      return data;
    },
  });
  const timeOffQ = useQuery({
    queryKey: ["time-off-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*");
      if (error) throw error;
      return data;
    },
  });

  const conflictsByAssign = useMemo(() => {
    const out = new Map<string, ReturnType<typeof findConflicts>>();
    if (!assignsQ.data || !allAssignsQ.data || !timeOffQ.data) return out;
    for (const a of assignsQ.data) {
      const others = allAssignsQ.data
        .filter((x) => x.employee_id === a.employee_id && x.id !== a.id)
        .map((x) => ({
          id: x.id,
          job_id: x.job_id,
          start_date: x.start_date,
          end_date: x.end_date,
          jobLabel: x.jobs?.customer_name,
        }));
      const off = timeOffQ.data.filter((t) => t.employee_id === a.employee_id);
      out.set(a.id, findConflicts({ range: { start: a.start_date, end: a.end_date }, assignments: others, timeOff: off }));
    }
    return out;
  }, [assignsQ.data, allAssignsQ.data, timeOffQ.data]);

  const removeAssign = async (id: string) => {
    const { error } = await supabase.from("job_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Crew member removed");
    qc.invalidateQueries({ queryKey: ["job-assignments", jobId] });
    qc.invalidateQueries({ queryKey: ["assignments-all"] });
  };

  if (jobQ.isLoading) {
    return <div className="p-6 space-y-4 max-w-[1400px] mx-auto"><Skeleton className="h-8 w-64" /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }
  if (!jobQ.data) {
    return <div className="p-6">Job not found.</div>;
  }
  const j = jobQ.data;

  const byPos = new Map<Position, NonNullable<typeof assignsQ.data>>();
  POSITIONS.forEach((p) => byPos.set(p, []));
  (assignsQ.data ?? []).forEach((a) => byPos.get(a.role_on_job)?.push(a));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <Link to="/jobs" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> All jobs
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{j.customer_name}</h1>
              <Badge variant="outline">{j.service_type}</Badge>
              <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", JOB_STATUS_TONE[j.status])}>{j.status}</span>
              <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", PO_STATUS_TONE[j.po_status])}>PO: {j.po_status}</span>
              {j.safety_required && (
                <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 text-warning bg-warning/10 px-2 py-0.5 text-[11px] font-medium">
                  <ShieldAlert className="h-3 w-3" /> Safety required
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {j.site_name ? `${j.site_name} · ` : ""}{j.site_city}, {j.site_state}
            </p>
          </div>
          {canModify && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit job
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Schedule</h3>
          <dl className="space-y-2 text-sm">
            <DLRow label="Mobe"><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />{format(new Date(j.mobe_date), "MMM d, yyyy")}</DLRow>
            <DLRow label="Delivery">{format(new Date(j.delivery_date), "MMM d, yyyy")}</DLRow>
            <DLRow label="Est. completion">{format(new Date(j.est_completion_date), "MMM d, yyyy")}</DLRow>
            <DLRow label="Booking">{j.booking_date ? format(new Date(j.booking_date), "MMM d, yyyy") : "—"}</DLRow>
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Customer & PO</h3>
          <dl className="space-y-2 text-sm">
            <DLRow label="FC #">{j.fc_number}</DLRow>
            <DLRow label="Service order">{j.service_order ?? "—"}</DLRow>
            <DLRow label="TSM / PSM">{j.tsm_psm ?? "—"}</DLRow>
            <DLRow label="Equipment">{j.equipment_asset}</DLRow>
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Resources</h3>
          <dl className="space-y-2 text-sm">
            <DLRow label="MFU">{j.mfu_type ?? "—"} <span className="text-muted-foreground">× {j.mfu_qty}</span></DLRow>
            <DLRow label="MHU">{j.mhu_qty}</DLRow>
            <DLRow label="PC">{j.pc_qty}</DLRow>
          </dl>
        </Card>
      </div>

      {j.notes && (
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{j.notes}</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Crew assignments</h2>
            <p className="text-xs text-muted-foreground">Five-position model. Conflicts with other jobs or time off are flagged but not blocked.</p>
          </div>
          {canModify && (
            <Button onClick={() => setAssigning(true)}>
              <Plus className="h-4 w-4" /> Assign crew
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {POSITIONS.map((pos) => {
            const list = byPos.get(pos) ?? [];
            return (
              <div key={pos} className="rounded-md border bg-card/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <PositionBadge position={pos} short />
                  <span className="text-xs text-muted-foreground tabular-nums">{list.length}</span>
                </div>
                <div className="space-y-1.5">
                  {list.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">None assigned</p>
                  )}
                  {list.map((a) => {
                    const conflicts = conflictsByAssign.get(a.id) ?? [];
                    return (
                      <div key={a.id} className={cn("rounded-md border bg-background px-2 py-1.5 text-xs group", conflicts.length && "border-warning/50")}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">
                            {a.employees?.first_name} {a.employees?.last_name}
                          </span>
                          {canModify && (
                            <button onClick={() => removeAssign(a.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" aria-label="Remove">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(a.start_date), "MMM d")} → {format(new Date(a.end_date), "MMM d")}
                        </div>
                        {conflicts.length > 0 && (
                          <div className="mt-1 flex items-start gap-1 text-[10px] text-warning">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <JobDialog open={editing} onOpenChange={setEditing} job={j} onSaved={() => qc.invalidateQueries({ queryKey: ["job", jobId] })} />
      <AssignCrewDialog
        open={assigning}
        onOpenChange={setAssigning}
        jobId={jobId}
        defaultStart={j.mobe_date}
        defaultEnd={j.est_completion_date}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["job-assignments", jobId] });
          qc.invalidateQueries({ queryKey: ["assignments-all"] });
        }}
      />
    </div>
  );
}

function DLRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
