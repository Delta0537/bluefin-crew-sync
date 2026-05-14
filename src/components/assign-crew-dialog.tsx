import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { POSITIONS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { findConflicts } from "@/lib/conflicts";
import { format } from "date-fns";

const schema = z.object({
  employee_id: z.string().uuid("Select a crew member"),
  role_on_job: z.enum(["Tech", "Supervisor", "Project Manager", "Engineer", "Safety"]),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
}).refine((d) => d.start_date <= d.end_date, { message: "End date must be after start date", path: ["end_date"] });

export function AssignCrewDialog({
  open, onOpenChange, jobId, defaultStart, defaultEnd, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobId: string;
  defaultStart: string;
  defaultEnd: string;
  onSaved: () => void;
}) {
  const [position, setPosition] = useState<Position>("Tech");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPosition("Tech");
      setEmployeeId("");
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  }, [open, defaultStart, defaultEnd]);

  const empsQ = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("active", true).order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const allAssignsQ = useQuery({
    queryKey: ["assignments-all-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_assignments").select("*, jobs(customer_name)");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const timeOffQ = useQuery({
    queryKey: ["time-off-all-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const candidates = (empsQ.data ?? []).filter((e) => e.position === position);

  // Tag each candidate with conflict count
  const candidateInfo = useMemo(() => {
    return candidates.map((e) => {
      const others = (allAssignsQ.data ?? [])
        .filter((a) => a.employee_id === e.id)
        .map((a) => ({
          id: a.id,
          job_id: a.job_id,
          start_date: a.start_date,
          end_date: a.end_date,
          jobLabel: a.jobs?.customer_name,
        }));
      const off = (timeOffQ.data ?? []).filter((t) => t.employee_id === e.id);
      const conflicts = findConflicts({ range: { start: startDate, end: endDate }, assignments: others, timeOff: off });
      return { emp: e, conflicts };
    });
  }, [candidates, allAssignsQ.data, timeOffQ.data, startDate, endDate]);

  const selectedConflicts = candidateInfo.find((c) => c.emp.id === employeeId)?.conflicts ?? [];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ employee_id: employeeId, role_on_job: position, start_date: startDate, end_date: endDate });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("job_assignments").insert({
      job_id: jobId,
      employee_id: parsed.data.employee_id,
      role_on_job: parsed.data.role_on_job,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (selectedConflicts.length) {
      toast.warning("Crew member assigned despite conflicts", {
        description: `${selectedConflicts.length} overlapping commitment(s).`,
      });
    } else {
      toast.success("Crew member assigned");
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign crew</DialogTitle>
          <DialogDescription>Pick a position, then a crew member. Conflicts are flagged but not blocked.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Position</Label>
            <Select value={position} onValueChange={(v) => { setPosition(v as Position); setEmployeeId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Crew member</Label>
            <div className="rounded-md border max-h-60 overflow-y-auto divide-y">
              {candidateInfo.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No active {position}s.</div>
              )}
              {candidateInfo.map(({ emp, conflicts }) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setEmployeeId(emp.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2 ${employeeId === emp.id ? "bg-accent" : ""}`}
                >
                  <div>
                    <div className="text-sm font-medium">{emp.first_name} {emp.last_name}</div>
                    <div className="text-xs text-muted-foreground">{emp.email ?? "—"}</div>
                  </div>
                  {conflicts.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" /> {conflicts.length}
                    </span>
                  ) : (
                    <span className="text-xs text-success">Available</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          {selectedConflicts.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs space-y-1">
              <div className="flex items-center gap-1 font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> {selectedConflicts.length} conflict{selectedConflicts.length > 1 ? "s" : ""}
              </div>
              <ul className="space-y-1 mt-1">
                {selectedConflicts.map((c, i) => (
                  <li key={i} className="text-muted-foreground">
                    {c.kind === "assignment"
                      ? <>Assigned to <span className="font-medium text-foreground">{c.jobLabel}</span></>
                      : <>Time off: <span className="font-medium text-foreground">{c.timeOffType}</span></>}
                    {" "}({format(new Date(c.start), "MMM d")} – {format(new Date(c.end), "MMM d")})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !employeeId}>{busy ? "Assigning…" : "Assign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
