import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Briefcase, MapPin, Calendar } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { JobDialog } from "@/components/job-dialog";
import { JOB_STATUS_TONE, JOB_STATUSES, PO_STATUS_TONE, SERVICE_TYPES, PO_STATUSES } from "@/lib/domain";
import type { JobStatus, ServiceType, POStatus } from "@/lib/domain";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const search = z.object({ new: z.boolean().optional() });

export const Route = createFileRoute("/_authenticated/jobs")({
  validateSearch: (s) => search.parse(s),
  component: JobsPage,
});

function JobsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canModify } = useAuth();
  const sp = Route.useSearch();
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "all">("all");
  const [poFilter, setPoFilter] = useState<POStatus | "all">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (sp.new && canModify) {
      setCreating(true);
      navigate({ to: "/jobs", search: {} });
    }
  }, [sp.new, canModify, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").order("mobe_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (serviceFilter !== "all" && j.service_type !== serviceFilter) return false;
    if (poFilter !== "all" && j.po_status !== poFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      return (
        j.fc_number.toLowerCase().includes(s) ||
        j.customer_name.toLowerCase().includes(s) ||
        (j.site_name ?? "").toLowerCase().includes(s) ||
        j.site_city.toLowerCase().includes(s) ||
        (j.service_order ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">All jobs across HVOF, chemical cleaning, and commissioning.</p>
        </div>
        {canModify && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New job
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search FC #, customer, site, PO…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceType | "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={poFilter} onValueChange={(v) => setPoFilter(v as POStatus | "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="PO status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PO</SelectItem>
            {PO_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "None" ? "None (projecting)" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No jobs found"
            description={canModify ? "Create your first job to start scheduling crews." : "Adjust filters or ask a manager to create a job."}
            action={canModify ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New job</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer / Site</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="hidden lg:table-cell">Dates</TableHead>
                <TableHead className="hidden md:table-cell">PO</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => (
                <TableRow key={j.id} className="cursor-pointer" onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })}>
                  <TableCell>
                    <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="block hover:underline">
                      <div className="font-medium">{j.customer_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {j.site_name ? `${j.site_name} · ` : ""}{j.site_city}, {j.site_state}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{j.service_type}</Badge>
                    {j.safety_required && (
                      <Badge variant="outline" className="ml-1 border-warning/40 text-warning">Safety</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(j.mobe_date), "MMM d")} → {format(new Date(j.est_completion_date), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", PO_STATUS_TONE[j.po_status])}>
                      {j.po_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", JOB_STATUS_TONE[j.status])}>
                      {j.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <JobDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["jobs"] });
          qc.invalidateQueries({ queryKey: ["jobs-all"] });
          qc.invalidateQueries({ queryKey: ["jobs-recent"] });
        }}
      />
    </div>
  );
}
