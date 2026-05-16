import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { POSITIONS } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { PositionBadge } from "@/components/position-badge";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/personnel")({
  component: PersonnelPage,
});

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  position: Position;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  active: boolean;
  notes: string | null;
};

const employeeSchema = z.object({
  first_name: z.string().trim().min(1, "Required").max(80),
  last_name: z.string().trim().min(1, "Required").max(80),
  position: z.enum(["Tech", "Supervisor", "Project Manager", "Engineer", "Safety Lead"]),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  hire_date: z.string().optional().or(z.literal("")),
  active: z.boolean(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

function PersonnelPage() {
  const qc = useQueryClient();
  const { canModify } = useAuth();
  const [filter, setFilter] = useState<Position | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("last_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const filtered = (data ?? []).filter((e) => {
    if (filter !== "all" && e.position !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee removed");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personnel</h1>
          <p className="text-sm text-muted-foreground mt-1">Five-position crew model — Tech, Supervisor, PM, Engineer, Safety.</p>
        </div>
        {canModify && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add person
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
          {POSITIONS.map((p) => (
            <FilterChip key={p} active={filter === p} onClick={() => setFilter(p)}>{p}</FilterChip>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No personnel yet"
            description={canModify ? "Add your first crew member to start scheduling." : "Ask a manager to add personnel."}
            action={canModify ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add person</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                {canModify && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.first_name} {e.last_name}</div>
                  </TableCell>
                  <TableCell><PositionBadge position={e.position} /></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.email ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.phone ?? "—"}</TableCell>
                  <TableCell>
                    {e.active
                      ? <Badge variant="outline" className="border-success/40 text-success">Active</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                  </TableCell>
                  {canModify && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(e)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(e)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EmployeeDialog
        open={creating}
        onOpenChange={(o) => setCreating(o)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["employees"] })}
      />
      <EmployeeDialog
        open={!!editing}
        employee={editing ?? undefined}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["employees"] })}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.first_name} {deleting?.last_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the employee and may affect existing assignments. Consider marking inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteM.mutate(deleting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function EmployeeDialog({
  open, onOpenChange, employee, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee?: Employee;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Employee>>(employee ?? { position: "Tech", active: true });
  const [busy, setBusy] = useState(false);

  // Reset form when opening
  useState(() => {
    setForm(employee ?? { position: "Tech", active: true });
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = employeeSchema.safeParse({
      first_name: form.first_name ?? "",
      last_name: form.last_name ?? "",
      position: form.position ?? "Tech",
      email: form.email ?? "",
      phone: form.phone ?? "",
      hire_date: form.hire_date ?? "",
      active: form.active ?? true,
      notes: form.notes ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const payload = {
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      hire_date: parsed.data.hire_date || null,
      notes: parsed.data.notes || null,
    };
    setBusy(true);
    const { error } = employee
      ? await supabase.from("employees").update(payload).eq("id", employee.id)
      : await supabase.from("employees").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(employee ? "Employee updated" : "Employee added");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setForm(employee ?? { position: "Tech", active: true }); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit person" : "Add person"}</DialogTitle>
          <DialogDescription>{employee ? "Update details for this crew member." : "Add a crew member to the workforce."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">First name</Label>
              <Input id="fn" value={form.first_name ?? ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="ln">Last name</Label>
              <Input id="ln" value={form.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>Position</Label>
            <Select value={form.position ?? "Tech"} onValueChange={(v) => setForm({ ...form, position: v as Position })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="hd">Hire date</Label>
            <Input id="hd" type="date" value={form.hire_date ?? ""} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="active" checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label htmlFor="active" className="cursor-pointer">Active</Label>
          </div>
          <div>
            <Label htmlFor="nt">Notes</Label>
            <Textarea id="nt" rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : employee ? "Save changes" : "Add person"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
