import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, Home, Moon, Shield, Sun, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavModules } from "@/lib/navModules";
import { CATEGORIES, useImpersonation, useKillSwitch } from "@/lib/godmode";
import ConsoleSidebar from "@/components/console/ConsoleSidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Master Console — Uivsoymarks" },
      { name: "description", content: "God-mode master admin console for vendors, riders, marketing and system controls." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsoleLayout,
});

const ROOT_LABELS: Record<string, string> = {
  vendors: "Vendors",
  riders: "Riders",
  marketing: "Marketing",
  system: "System",
};

const LEAF_LABELS: Record<string, string> = {
  pricing: "Pricing",
  inventory: "Inventory",
  features: "Feature switches",
  publish: "Save & Publish",
};

function ConsoleLayout() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const { tree, loading } = useNavModules();
  const kill = useKillSwitch();
  const { impersonation, stop } = useImpersonation();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.replace(/^\/console\/?/, "").split("/").filter(Boolean);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setIsAdmin(false);
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(Boolean(ok));
      if (!ok) toast.error("Master admin access only");
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = window.localStorage.getItem("console.theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name")
      .then(({ data }) => setVendorNames(Object.fromEntries((data ?? []).map((r) => [r.id, r.name]))));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("console.theme", next ? "dark" : "light");
  }

  function labelFor(segment: string, index: number): string {
    if (index === 0) return ROOT_LABELS[segment] ?? titleize(segment);
    const cat = CATEGORIES.find((c) => c.slug === segment);
    if (cat) return cat.label;
    if (vendorNames[segment]) return vendorNames[segment];
    return LEAF_LABELS[segment] ?? titleize(segment);
  }

  if (isAdmin === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <Shield className="h-10 w-10 text-destructive" />
        <p className="text-lg font-black">Master admin access only</p>
        <Button onClick={() => nav({ to: "/admin-login" })}>Go to admin login</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <ConsoleSidebar
          tree={tree}
          loading={loading}
          activePath={segments}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs font-bold">
              <Link to="/console" className="flex shrink-0 items-center gap-1 text-muted-foreground transition hover:text-foreground">
                <Home className="h-3.5 w-3.5" /> Master Admin
              </Link>
              {segments.map((seg, i) => {
                const to = `/console/${segments.slice(0, i + 1).join("/")}`;
                const last = i === segments.length - 1;
                return (
                  <span key={to} className="flex shrink-0 items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    {last ? (
                      <span className="text-primary">{labelFor(seg, i)}</span>
                    ) : (
                      <Link to="/console/$" params={{ _splat: segments.slice(0, i + 1).join("/") }} className="text-muted-foreground transition hover:text-foreground">
                        {labelFor(seg, i)}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="rounded-xl border border-border/60 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button
              size="sm"
              variant={kill.paused ? "default" : "destructive"}
              disabled={kill.busy}
              onClick={() => kill.toggle(!kill.paused, kill.paused ? "" : "Service paused due to bad weather. We are back shortly.")}
              className="shrink-0 gap-1.5"
            >
              <AlertTriangle className="h-4 w-4" />
              {kill.paused ? "Resume intake" : "Emergency pause"}
            </Button>
          </div>

          {kill.paused && (
            <p className="bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive">
              Order intake is paused platform-wide. Customers see: “{kill.message || "Service temporarily unavailable"}”
            </p>
          )}

          {impersonation && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
              <UserCog className="h-3.5 w-3.5" />
              Viewing as vendor: {impersonation.name}
              <button type="button" onClick={stop} className="ml-auto flex items-center gap-1 underline">
                <X className="h-3 w-3" /> Exit
              </button>
            </div>
          )}
        </header>

        <main className={cn("p-3 sm:p-5")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function titleize(slug: string) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
