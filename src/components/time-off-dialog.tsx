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

export type TimeOffRecord = {
  id: string;
  employee_id: string;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type Emp = { id: string; first_name: string; last_name: string };

const schema = z
  .object({
    employee_id: z.string().uuid("Select a person"),
    type: z.enum([
      "PTO",
      "Sick",
      "Medical",
      "Vacation",
      "Bereavement",
      "Light Duty",
      "Out",
      "Other",
    ]),
    start_date: z.string().min(1, "Start date required"),
    end_date: z.string().min(1, "End date required"),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.start_date <= d.end_date, {
    message: "End date must be on or after start",
    path: ["end_date"],
  });

export function TimeOffDialog({
  open,
  onOpenChange,
  record,
  defaultEmployeeId,
  employees,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record?: TimeOffRecord | null;
  defaultEmployeeId?: string;
  employees: Emp[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    employee_id: "",
    type: "PTO" as TimeOffType,
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        employee_id: record.employee_id,
        type: record.type,
        start_date: record.start_date,
        end_date: record.end_date,
        notes: record.notes ?? "",
      });
    } else {
      setForm({
        employee_id: defaultEmployeeId ?? employees[0]?.id ?? "",
        type: "PTO",
        start_date: "",
        end_date: "",
        notes: "",
      });
    }
  }, [open, record, defaultEmployeeId, employees]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    const payload = {
      ...parsed.data,
      notes: parsed.data.notes || null,
    };
    setBusy(true);
    const { error } = record
      ? await supabase.from("time_off").update(payload).eq("id", record.id)
      : await supabase.from("time_off").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(record ? "Time off updated" : "Time off added");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? "Edit time off" : "Add time off"}</DialogTitle>
          <DialogDescription>
            {record ? "Update dates or type — changes show on the EOB schedule grid." : "Paid time off and other leave appears on the schedule for this person."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Person</Label>
            <Select
              value={form.employee_id}
              onValueChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}
              disabled={!!record}
            >
              <SelectTrigger><SelectValue placeholder="Select crew member" /></SelectTrigger>
              <SelectContent>
                {employees.map((em) => (
                  <SelectItem key={em.id} value={em.id}>
                    {em.first_name} {em.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TimeOffType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OFF_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : record ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
