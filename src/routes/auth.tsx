import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isPasswordRecoveryPending } from "@/lib/auth-recovery";

/**
 * Layout for /auth and /auth/reset-password.
 * Must render <Outlet /> so the child reset-password route actually displays.
 */
export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    const path = location.pathname;
    const onResetPassword =
      path === "/auth/reset-password" || path.endsWith("/reset-password");

    if (onResetPassword) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session && isPasswordRecoveryPending()) {
      throw redirect({ to: "/auth/reset-password" });
    }
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
