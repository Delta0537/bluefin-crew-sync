import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TIME_OFF_TYPES } from "@/lib/domain";
import type { TimeOffType } from "@/lib/domain";

type TimeOffRow = {
  id: string;
  employee_id: string;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type EmployeeOption = { id: string; first_name: string; last_name: string };

const schema = z.object({
  employee_id: z.string().uuid("Select a person"),
  type: z.enum([
    "PTO", "Sick", "Medical", "Vacation", "Bereavement", "Light Duty", "Out", "Other",
  ]),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  notes: z.string().max(2000).optional().or(z.literal("")),
}).refine((d) => d.end_date >= d.start_date, {
  path: ["end_date"],
  message: "End date must be on or after start date",
});

const blank: Partial<TimeOffRow> = { type: "PTO" };

export function TimeOffDialog({
  open, onOpenChange, employees, entry, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employees: EmployeeOption[];
  entry?: TimeOffRow;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<Partial<TimeOffRow>>(entry ?? blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(entry ?? blank);
  }, [open, entry]);

  const set = <K extends keyof TimeOffRow>(k: K, v: TimeOffRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      employee_id: form.employee_id ?? "",
      type: form.type ?? "PTO",
      start_date: form.start_date ?? "",
      end_date: form.end_date ?? "",
      notes: form.notes ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const payload = { ...parsed.data, notes: parsed.data.notes || null };
    setBusy(true);
    const { error } = entry
      ? await supabase.from("time_off").update(payload).eq("id", entry.id)
      : await supabase.from("time_off").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(entry ? "Time off updated" : "Time off added");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit time off" : "Add time off"}</DialogTitle>
          <DialogDescription>
            {entry ? "Update this time off entry." : "Block a date range so this person doesn't get scheduled."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Person</Label>
            <Select
              value={form.employee_id ?? ""}
              onValueChange={(v) => set("employee_id", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type ?? "PTO"} onValueChange={(v) => set("type", v as TimeOffType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OFF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sd">Start date</Label>
              <Input id="sd" type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ed">End date</Label>
              <Input id="ed" type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="nt">Notes</Label>
            <Textarea id="nt" rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : entry ? "Save changes" : "Add time off"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
