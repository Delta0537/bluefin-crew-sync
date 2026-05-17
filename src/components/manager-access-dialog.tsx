import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
};

/**
 * Shown when a signed-in viewer tries an action that requires manager/admin (RLS + can_modify).
 */
export function ManagerAccessDialog({
  open,
  onOpenChange,
  actionLabel = "make this change",
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Manager access needed</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your account is a <strong>viewer</strong>. To {actionLabel}, an{" "}
              <strong>admin</strong> must add the <strong>manager</strong> role to your user in
              Supabase (<code className="text-xs">user_roles</code> table).
            </p>
            <p className="text-xs text-muted-foreground">
              Admins can open the Supabase dashboard → Authentication → Users, or run SQL:
              <span className="block mt-1 font-mono break-all">
                insert into user_roles (user_id, role) values (&apos;&lt;your-user-uuid&gt;&apos;,
                &apos;manager&apos;);
              </span>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
