import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Plus, Pencil, Trash2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimeOffDialog } from "@/components/time-off-dialog";
import { TIME_OFF_TYPES, TIME_OFF_TONE } from "@/lib/domain";
import type { TimeOffType } from "@/lib/domain";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/time-off")({
  component: TimeOffPage,
});

type TimeOffRow = {
  id: string;
  employee_id: string;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type EmployeeRow = { id: string; first_name: string; last_name: string };

type Bucket = "upcoming" | "current" | "past";

function TimeOffPage() {
  const qc = useQueryClient();
  const { canModify } = useAuth();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TimeOffRow | null>(null);
  const [deleting, setDeleting] = useState<TimeOffRow | null>(null);
  const [typeFilter, setTypeFilter] = useState<TimeOffType | "all">("all");
  const [bucket, setBucket] = useState<Bucket>("current");
  const [search, setSearch] = useState("");

  const empQ = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("last_name");
      if (error) throw error;
      return data as EmployeeRow[];
    },
  });

  const timeOffQ = useQuery({
    queryKey: ["time-off"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as TimeOffRow[];
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time off removed");
      qc.invalidateQueries({ queryKey: ["time-off"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const empById = useMemo(() => {
    const m = new Map<string, EmployeeRow>();
    (empQ.data ?? []).forEach((e) => m.set(e.id, e));
    return m;
  }, [empQ.data]);

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = useMemo(() => {
    return (timeOffQ.data ?? []).filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (bucket === "current" && !(t.start_date <= today && t.end_date >= today)) return false;
      if (bucket === "upcoming" && !(t.start_date > today)) return false;
      if (bucket === "past" && !(t.end_date < today)) return false;
      if (search) {
        const q = search.toLowerCase();
        const emp = empById.get(t.employee_id);
        const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : "";
        return name.includes(q) || (t.notes ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [timeOffQ.data, typeFilter, bucket, today, search, empById]);

  const counts = useMemo(() => {
    const rows = timeOffQ.data ?? [];
    return {
      current: rows.filter((t) => t.start_date <= today && t.end_date >= today).length,
      upcoming: rows.filter((t) => t.start_date > today).length,
      past: rows.filter((t) => t.end_date < today).length,
    };
  }, [timeOffQ.data, today]);

  const isLoading = timeOffQ.isLoading || empQ.isLoading;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time off</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PTO, sick, light duty, and out-of-office. Anyone on time off won't count toward utilization on those days.
          </p>
        </div>
        {canModify && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add time off
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          <BucketChip active={bucket === "current"} onClick={() => setBucket("current")}>
            Current ({counts.current})
          </BucketChip>
          <BucketChip active={bucket === "upcoming"} onClick={() => setBucket("upcoming")}>
            Upcoming ({counts.upcoming})
          </BucketChip>
          <BucketChip active={bucket === "past"} onClick={() => setBucket("past")}>
            Past ({counts.past})
          </BucketChip>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TimeOffType | "all")}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All types</option>
          {TIME_OFF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarOff className="h-8 w-8" />}
            title="No time off in this view"
            description={
              canModify
                ? "Add a time-off entry when someone has PTO, is out sick, or on light duty."
                : "Nothing scheduled here right now."
            }
            action={canModify ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add time off</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                {canModify && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const emp = empById.get(t.employee_id);
                const days = daysBetweenInclusive(t.start_date, t.end_date);
                const isCurrent = t.start_date <= today && t.end_date >= today;
                const isFuture = isAfter(parseISO(t.start_date), parseISO(today));
                const isPast = isBefore(parseISO(t.end_date), parseISO(today));
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">
                        {emp ? `${emp.first_name} ${emp.last_name}` : <span className="text-muted-foreground">Unknown</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", TIME_OFF_TONE[t.type])}>
                        {t.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(parseISO(t.start_date), "MMM d")} → {format(parseISO(t.end_date), "MMM d, yyyy")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {days} day{days === 1 ? "" : "s"}
                        {isCurrent && <span className="text-warning"> · in progress</span>}
                        {isFuture && <span> · upcoming</span>}
                        {isPast && <span> · past</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {t.notes ?? "—"}
                    </TableCell>
                    {canModify && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(t)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleting(t)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <TimeOffDialog
        open={creating}
        onOpenChange={setCreating}
        employees={empQ.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["time-off"] })}
      />
      <TimeOffDialog
        open={!!editing}
        entry={editing ?? undefined}
        employees={empQ.data ?? []}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["time-off"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove time off?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the entry. It can be re-added if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteM.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BucketChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded-md border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function daysBetweenInclusive(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}
