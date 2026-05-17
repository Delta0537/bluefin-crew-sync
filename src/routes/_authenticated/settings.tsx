import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type AppRole = Database["public"]["Enums"]["app_role"];

function canUsePasswordLogin(user: User | null): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === "email"));
}

function SettingsPage() {
  const { user, role, isAdmin, signOut } = useAuth();

  const usersQ = useQuery({
    queryKey: ["all-users", isAdmin],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const rolesByUser = new Map<string, AppRole>();
      for (const r of roles ?? []) {
        const existing = rolesByUser.get(r.user_id);
        // admin > manager > viewer precedence
        if (!existing || r.role === "admin" || (r.role === "manager" && existing === "viewer")) {
          rolesByUser.set(r.user_id, r.role);
        }
      }
      return (profiles ?? []).map((p) => ({
        ...p,
        role: rolesByUser.get(p.user_id) ?? ("viewer" as AppRole),
      }));
    },
    enabled: isAdmin,
  });

  const changeRole = async (userId: string, newRole: AppRole) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    usersQ.refetch();
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and (if admin) the workspace.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-3">Account</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Email">{user?.email}</Row>
          <Row label="Role">
            <Badge variant="outline" className="capitalize">
              {role ?? "—"}
            </Badge>
          </Row>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {canUsePasswordLogin(user) && <ChangePasswordButton email={user?.email ?? ""} />}
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-5">
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Promote to manager (can edit) or admin (full access). Viewers are read-only.
          </p>
          {usersQ.isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {(usersQ.data ?? []).map((u) => {
                const currentRole: AppRole = u.role;
                return (
                  <div key={u.user_id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {u.display_name ?? u.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <Select
                      value={currentRole}
                      onValueChange={(v) => changeRole(u.user_id, v as AppRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-2">Keyboard shortcuts</h2>
        <dl className="space-y-1.5 text-sm">
          <ShortcutRow keys={["n"]} label="New job" />
          <ShortcutRow keys={["/"]} label="Focus search" />
          <ShortcutRow keys={["Esc"]} label="Close dialogs" />
        </dl>
      </Card>
    </div>
  );
}

function ChangePasswordButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetFields();
    setOpen(next);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Missing email address for this session.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signErr) {
      setBusy(false);
      toast.error("Current password is incorrect.");
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateErr) {
      toast.error(updateErr.message);
      return;
    }
    toast.success("Password updated.");
    resetFields();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Change password
      </Button>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one (minimum 8 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-current-password">Current password</Label>
              <Input
                id="settings-current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-new-password">New password</Label>
              <Input
                id="settings-new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-confirm-password">Confirm new password</Label>
              <Input
                id="settings-confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save new password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="bg-muted px-2 py-0.5 rounded border text-[11px] font-medium">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
