import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Waves } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth/")({
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const goSignIn = () => {
    setAuthMode("signin");
    setMode("signin");
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — check your email to confirm.");
    goSignIn();
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your work email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) {
      const msg = error.message ?? "";
      if (/rate limit|too many|429/i.test(msg)) {
        toast.error("Too many reset emails. Wait several minutes or use a different path (check spam).");
      } else {
        toast.error(msg);
      }
      return;
    }
    toast.success("If an account exists for that email, a reset link was sent.");
    goSignIn();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waves className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">BlueFin Energy Services</h1>
            <p className="text-xs text-muted-foreground">Scheduling workspace</p>
          </div>
        </div>
        <Card className="p-6">
          {authMode === "forgot" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">Reset password</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  We will email you a link to choose a new password.
                </p>
              </div>
              <form onSubmit={onForgot} className="space-y-4">
                <div>
                  <Label htmlFor="email-f">Work email</Label>
                  <Input
                    id="email-f"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={goSignIn}>
                  Back to sign in
                </Button>
              </form>
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(v) => {
                const next = v as "signin" | "signup";
                setMode(next);
                setAuthMode(next);
              }}
            >
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="email-i">Work email</Label>
                    <Input
                      id="email-i"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pw-i">Password</Label>
                    <Input
                      id="pw-i"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-2"
                      onClick={() => {
                        setAuthMode("forgot");
                        setPassword("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="name-s">Display name</Label>
                    <Input
                      id="name-s"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-s">Work email</Label>
                    <Input
                      id="email-s"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pw-s">Password</Label>
                    <Input
                      id="pw-s"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Min 8 characters. New accounts start as view-only until promoted.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing in you agree to BlueFin internal use policy.
        </p>
      </div>
    </div>
  );
}
