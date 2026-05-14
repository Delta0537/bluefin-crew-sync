import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type AppRole = Database["public"]["Enums"]["app_role"];

function SettingsPage() {
  const { user, role, isAdmin, signOut } = useAuth();

  const usersQ = useQuery({
    queryKey: ["all-users", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ user_id: string; email: string | null; display_name: string | null; user_roles: { role: AppRole }[] }>;
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
        <p className="text-sm text-muted-foreground mt-1">Manage your account and (if admin) the workspace.</p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-3">Account</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Email">{user?.email}</Row>
          <Row label="Role"><Badge variant="outline" className="capitalize">{role ?? "—"}</Badge></Row>
        </dl>
        <Button variant="outline" className="mt-4" onClick={() => signOut()}>Sign out</Button>
      </Card>

      {isAdmin && (
        <Card className="p-5">
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted-foreground mb-3">Promote to manager (can edit) or admin (full access). Viewers are read-only.</p>
          {usersQ.isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="divide-y">
              {(usersQ.data ?? []).map((u) => {
                const currentRole: AppRole = u.user_roles?.[0]?.role ?? "viewer";
                return (
                  <div key={u.user_id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.display_name ?? u.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <Select value={currentRole} onValueChange={(v) => changeRole(u.user_id, v as AppRole)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
          <kbd key={k} className="bg-muted px-2 py-0.5 rounded border text-[11px] font-medium">{k}</kbd>
        ))}
      </div>
    </div>
  );
}
