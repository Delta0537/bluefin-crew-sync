import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, Plus, ChevronDown, ClipboardList, CalendarDays, Briefcase } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || (target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" && !inField) {
        e.preventDefault();
        navigate({ to: "/create" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4">
      <SidebarTrigger />
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs, customers, people…"
          className="pl-9 pr-12 h-9"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
          /
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Create
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Create new</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/create", search: { kind: "project" } })}>
                <Briefcase className="h-4 w-4" /> Project (job)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/create", search: { kind: "walk_down" } })}>
                <ClipboardList className="h-4 w-4" /> Walk-down
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/create", search: { kind: "meeting" } })}>
                <CalendarDays className="h-4 w-4" /> Meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize">{role ?? "—"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
