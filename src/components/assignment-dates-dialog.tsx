import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export function AssignmentDatesDialog({
  open,
  onOpenChange,
  assignmentId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignmentId: string | null;
  onSaved: () => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const rowQ = useQuery({
    queryKey: ["assignment-dates", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!assignmentId,
  });

  useEffect(() => {
    if (rowQ.data) {
      setStart(rowQ.data.start_date);
      setEnd(rowQ.data.end_date);
    }
  }, [rowQ.data]);

  useEffect(() => {
    if (!open) {
      setStart("");
      setEnd("");
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId) return;
    if (!start || !end || start > end) {
      toast.error("End date must be on or after start date");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("job_assignments")
      .update({ start_date: start, end_date: end })
      .eq("id", assignmentId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Assignment dates updated");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assignment dates</DialogTitle>
          <DialogDescription>
            Adjust how long this person is on the job. Conflicts with other work or leave are not blocked here.
          </DialogDescription>
        </DialogHeader>
        {rowQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rowQ.isError ? (
          <p className="text-sm text-destructive">Could not load assignment.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
