import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardList, CalendarDays, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobDialog } from "@/components/job-dialog";
import { ManagerAccessDialog } from "@/components/manager-access-dialog";
import type { Database } from "@/integrations/supabase/types";

type CreateKind = "project" | "walk_down" | "meeting";
type CalendarKind = Database["public"]["Enums"]["calendar_item_kind"];

const searchSchema = z.object({
  kind: z.enum(["project", "walk_down", "meeting"]).optional(),
});

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (raw) => searchSchema.parse(raw),
  component: CreatePage,
});

const ChooseDateMsg = "Choose a date";

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    site_or_customer: z.string().max(200).optional().or(z.literal("")),
    start_date: z.string().min(1, ChooseDateMsg),
    end_date: z.string().min(1, ChooseDateMsg),
    po_reference: z.string().max(120).optional().or(z.literal("")),
    sr_technicians: z.number().int().min(0).max(99),
    technicians: z.number().int().min(0).max(99),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });

function CreatePage() {
  const { kind: kindSearch } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canModify } = useAuth();
  const [kind, setKind] = useState<CreateKind>(kindSearch ?? "project");
  const [managerGate, setManagerGate] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: "",
    site_or_customer: "",
    start_date: "",
    end_date: "",
    po_reference: "",
    sr_technicians: 0,
    technicians: 0,
    notes: "",
  });

  useEffect(() => {
    if (kindSearch && kindSearch !== kind) setKind(kindSearch);
  }, [kindSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncKind = (next: CreateKind) => {
    setKind(next);
    void navigate({ to: "/create", search: { kind: next }, replace: true });
  };

  const invalidateSchedules = () => {
    qc.invalidateQueries({ queryKey: ["schedule-calendar-items"] });
    qc.invalidateQueries({ queryKey: ["schedule-assigns"] });
    qc.invalidateQueries({ queryKey: ["schedule-v2-assigns"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["jobs-all"] });
    qc.invalidateQueries({ queryKey: ["schedule-gantt"] });
  };

  const saveCalendarItem = useMutation({
    mutationFn: async (payload: {
      kind: CalendarKind;
      title: string;
      site_or_customer: string | null;
      start_date: string;
      end_date: string;
      po_reference: string | null;
      sr_technicians: number;
      technicians: number;
      notes: string | null;
    }) => {
      const { error } = await supabase.from("schedule_calendar_items").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Saved — it will show on Schedule, EOB, and Gantt views.");
      invalidateSchedules();
      setEventForm({
        title: "",
        site_or_customer: "",
        start_date: "",
        end_date: "",
        po_reference: "",
        sr_technicians: 0,
        technicians: 0,
        notes: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) {
      setManagerGate(true);
      return;
    }
    const parsed = eventSchema.safeParse({
      ...eventForm,
      sr_technicians: Number(eventForm.sr_technicians),
      technicians: Number(eventForm.technicians),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const d = parsed.data;
    const calKind: CalendarKind = kind === "walk_down" ? "walk_down" : "meeting";
    saveCalendarItem.mutate({
      kind: calKind,
      title: d.title,
      site_or_customer: d.site_or_customer || null,
      start_date: d.start_date,
      end_date: d.end_date,
      po_reference: d.po_reference || null,
      sr_technicians: d.sr_technicians,
      technicians: d.technicians,
      notes: d.notes || null,
    });
  };

  const openProjectForm = () => {
    if (!canModify) {
      setManagerGate(true);
      return;
    }
    setJobOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a field job (project), a walk-down, or a meeting. Walk-downs and meetings appear on the schedule views for everyone to see.
        </p>
      </div>

      <Card className="p-4">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">What are you creating?</Label>
        <Select value={kind} onValueChange={(v) => syncKind(v as CreateKind)}>
          <SelectTrigger className="mt-2 max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project">New project (job)</SelectItem>
            <SelectItem value="walk_down">Walk-down</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {kind === "project" && (
        <Card className="p-6 space-y-4 border-brand-navy/20">
          <p className="text-sm text-muted-foreground">
            Projects capture the full job packet (customer, site, equipment, dates, PO pipeline, crew counts). After you create a job, assign people from the job page or Personnel flows.
          </p>
          <Button type="button" onClick={openProjectForm} className="w-full sm:w-auto">
            <Briefcase className="h-4 w-4" /> Open project form
          </Button>
        </Card>
      )}

      {(kind === "walk_down" || kind === "meeting") && (
        <Card className="p-6">
          <form onSubmit={submitEvent} className="space-y-4">
            <div>
              <Label htmlFor="ev-title">{kind === "walk_down" ? "Walk-down title" : "Meeting title"}</Label>
              <Input
                id="ev-title"
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={kind === "walk_down" ? "e.g. Unit 4 lube walk-down" : "e.g. Kickoff with client"}
                required
              />
            </div>
            <div>
              <Label htmlFor="ev-site">Site / customer (optional)</Label>
              <Input
                id="ev-site"
                value={eventForm.site_or_customer}
                onChange={(e) => setEventForm((f) => ({ ...f, site_or_customer: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ev-sd">Start date</Label>
                <Input
                  id="ev-sd"
                  type="date"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, start_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ev-ed">End date</Label>
                <Input
                  id="ev-ed"
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ev-po">PO / reference (optional)</Label>
              <Input
                id="ev-po"
                value={eventForm.po_reference}
                onChange={(e) => setEventForm((f) => ({ ...f, po_reference: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ev-sr">Sr. technicians (planned)</Label>
                <Input
                  id="ev-sr"
                  type="number"
                  min={0}
                  value={eventForm.sr_technicians}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, sr_technicians: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="ev-tx">Technicians (planned)</Label>
                <Input
                  id="ev-tx"
                  type="number"
                  min={0}
                  value={eventForm.technicians}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, technicians: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ev-notes">Additional notes</Label>
              <Textarea
                id="ev-notes"
                rows={4}
                value={eventForm.notes}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saveCalendarItem.isPending}>
                {saveCalendarItem.isPending ? "Saving…" : kind === "walk_down" ? "Create walk-down" : "Create meeting"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <JobDialog
        open={jobOpen}
        onOpenChange={(o) => {
          setJobOpen(o);
          if (!o) invalidateSchedules();
        }}
        onSaved={() => {
          invalidateSchedules();
          toast.success("Job created — assign crew from the Jobs page.");
        }}
      />

      <ManagerAccessDialog
        open={managerGate}
        onOpenChange={setManagerGate}
        actionLabel="create projects, walk-downs, or meetings"
      />
    </div>
  );
}
