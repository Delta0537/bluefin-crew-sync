import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SERVICE_TYPES, PO_STATUSES, JOB_STATUSES } from "@/lib/domain";
import type { ServiceType, POStatus, JobStatus } from "@/lib/domain";

type JobRow = {
  id: string;
  fc_number: string;
  customer_name: string;
  site_name: string | null;
  site_city: string;
  site_state: string;
  tsm_psm: string | null;
  booking_date: string | null;
  service_order: string | null;
  po_status: POStatus;
  equipment_asset: string;
  service_type: ServiceType;
  mfu_type: string | null;
  mfu_qty: number;
  mhu_qty: number;
  pc_qty: number;
  mobe_date: string;
  delivery_date: string;
  est_completion_date: string;
  safety_required: boolean;
  status: JobStatus;
  notes: string | null;
};

const schema = z
  .object({
    fc_number: z.string().trim().min(1, "FC number is required").max(80),
    customer_name: z.string().trim().min(1).max(200),
    site_name: z.string().max(200).optional().or(z.literal("")),
    site_city: z.string().trim().min(1).max(120),
    site_state: z.string().trim().min(1).max(40),
    tsm_psm: z.string().max(200).optional().or(z.literal("")),
    booking_date: z.string().optional().or(z.literal("")),
    service_order: z.string().max(80).optional().or(z.literal("")),
    po_status: z.enum(["Approved", "Received-Awaiting Approval", "Verbal", "Open", "Emergency", "Tentative"]),
    equipment_asset: z.string().trim().min(1).max(300),
    service_type: z.enum(["HVOF", "HVOFS", "OSPM", "CFS", "C-Out", "Other"]),
    mfu_type: z.string().max(120).optional().or(z.literal("")),
    mfu_qty: z.number().int().min(0).max(99),
    mhu_qty: z.number().int().min(0).max(99),
    pc_qty: z.number().int().min(0).max(99),
    mobe_date: z.string().min(1, "Mobe date is required"),
    delivery_date: z.string().min(1, "Delivery date is required"),
    est_completion_date: z.string().min(1, "Est. completion date is required"),
    safety_required: z.boolean(),
    status: z.enum([
      "Upcoming",
      "Ongoing",
      "Bidding",
      "Lost",
      "Cross Utilization",
      "Projects Returned-Invoicing",
      "Other",
      "Cancelled",
    ]),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => !d.delivery_date || !d.mobe_date || d.delivery_date >= d.mobe_date, {
    message: "Delivery date cannot be before mobe date",
    path: ["delivery_date"],
  })
  .refine((d) => !d.est_completion_date || !d.mobe_date || d.est_completion_date >= d.mobe_date, {
    message: "Est. completion cannot be before mobe date",
    path: ["est_completion_date"],
  });

const blank: Partial<JobRow> = {
  po_status: "Open",
  service_type: "HVOF",
  status: "Upcoming",
  mfu_qty: 1,
  mhu_qty: 0,
  pc_qty: 0,
  safety_required: false,
};

export function JobDialog({
  open, onOpenChange, job, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  job?: JobRow;
  onSaved?: (id: string) => void;
}) {
  const [form, setForm] = useState<Partial<JobRow>>(job ?? blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(job ?? blank);
  }, [open, job]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...blank,
      ...form,
      fc_number: form.fc_number ?? "",
      mfu_qty: Number(form.mfu_qty ?? 1),
      mhu_qty: Number(form.mhu_qty ?? 0),
      pc_qty: Number(form.pc_qty ?? 0),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const d = parsed.data;
    const payload = {
      ...d,
      site_name: d.site_name || null,
      tsm_psm: d.tsm_psm || null,
      booking_date: d.booking_date || null,
      service_order: d.service_order || null,
      mfu_type: d.mfu_type || null,
      notes: d.notes || null,
    };
    setBusy(true);
    const { data, error } = job
      ? await supabase.from("jobs").update(payload).eq("id", job.id).select("id").single()
      : await supabase.from("jobs").insert(payload).select("id").single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(job ? "Job updated" : "Job created");
    onSaved?.(data!.id);
    onOpenChange(false);
  };

  const set = <K extends keyof JobRow>(k: K, v: JobRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? "Edit job" : "New job"}</DialogTitle>
          <DialogDescription>{job ? "Update job details and status." : "Create a job to schedule crews against."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Section title="Customer">
            <Field label="FC number">
              <Input value={form.fc_number ?? ""} onChange={(e) => set("fc_number", e.target.value)} required />
            </Field>
            <Field label="Customer name">
              <Input value={form.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} required />
            </Field>
            <Field label="TSM / PSM">
              <Input value={form.tsm_psm ?? ""} onChange={(e) => set("tsm_psm", e.target.value)} />
            </Field>
          </Section>

          <Section title="Site">
            <Field label="Site name">
              <Input value={form.site_name ?? ""} onChange={(e) => set("site_name", e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={form.site_city ?? ""} onChange={(e) => set("site_city", e.target.value)} required />
            </Field>
            <Field label="State">
              <Input value={form.site_state ?? ""} onChange={(e) => set("site_state", e.target.value)} required maxLength={4} />
            </Field>
          </Section>

          <Section title="Service & equipment">
            <Field label="Service type">
              <Select value={form.service_type ?? "HVOF"} onValueChange={(v) => set("service_type", v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Equipment / Asset" wide>
              <Input value={form.equipment_asset ?? ""} onChange={(e) => set("equipment_asset", e.target.value)} required />
            </Field>
          </Section>

          <Section title="Booking & PO">
            <Field label="Booking date">
              <Input type="date" value={form.booking_date ?? ""} onChange={(e) => set("booking_date", e.target.value)} />
            </Field>
            <Field label="Service order">
              <Input value={form.service_order ?? ""} onChange={(e) => set("service_order", e.target.value)} />
            </Field>
            <Field label="PO status">
              <Select value={form.po_status ?? "Open"} onValueChange={(v) => set("po_status", v as POStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PO_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Schedule">
            <Field label="Mobe date">
              <Input type="date" value={form.mobe_date ?? ""} onChange={(e) => set("mobe_date", e.target.value)} required />
            </Field>
            <Field label="Delivery date">
              <Input type="date" value={form.delivery_date ?? ""} onChange={(e) => set("delivery_date", e.target.value)} required />
            </Field>
            <Field label="Est. completion">
              <Input type="date" value={form.est_completion_date ?? ""} onChange={(e) => set("est_completion_date", e.target.value)} required />
            </Field>
          </Section>

          <Section title="Resources">
            <Field label="MFU type">
              <Input value={form.mfu_type ?? ""} onChange={(e) => set("mfu_type", e.target.value)} />
            </Field>
            <Field label="MFU qty">
              <Input type="number" min={0} value={form.mfu_qty ?? 0} onChange={(e) => set("mfu_qty", Number(e.target.value))} />
            </Field>
            <Field label="MHU qty">
              <Input type="number" min={0} value={form.mhu_qty ?? 0} onChange={(e) => set("mhu_qty", Number(e.target.value))} />
            </Field>
            <Field label="PC qty">
              <Input type="number" min={0} value={form.pc_qty ?? 0} onChange={(e) => set("pc_qty", Number(e.target.value))} />
            </Field>
          </Section>

          <Section title="Status">
            <Field label="Job status">
              <Select value={form.status ?? "Upcoming"} onValueChange={(v) => set("status", v as JobStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Safety required">
              <div className="flex items-center h-9">
                <Switch checked={form.safety_required ?? false} onCheckedChange={(v) => set("safety_required", v)} />
              </div>
            </Field>
          </Section>

          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : job ? "Save changes" : "Create job"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
