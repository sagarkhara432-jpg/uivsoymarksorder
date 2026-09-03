import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bike,
  IndianRupee,
  Megaphone,
  Settings2,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/console/")({
  component: ConsoleOverview,
});

type Kpis = {
  vendors: number;
  activeVendors: number;
  riders: number;
  ridersOnline: number;
  users: number;
  activeModules: number;
  orders7d: number;
  revenue7d: number;
};

const LEVEL1 = [
  { slug: "vendors", label: "Vendors", icon: Store, hint: "Kirana, Fruits & Veg, Food", tone: "text-primary" },
  { slug: "riders", label: "Riders", icon: Bike, hint: "Fleet, online status, payouts", tone: "text-[color:var(--orange,#f97316)]" },
  { slug: "marketing", label: "Marketing", icon: Megaphone, hint: "Coupons, banners, campaigns", tone: "text-emerald-600" },
  { slug: "system", label: "System", icon: Settings2, hint: "Global switches, health, roles", tone: "text-amber-600" },
];

function ConsoleOverview() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [series, setSeries] = useState<{ day: string; orders: number; revenue: number }[]>([]);

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 6 * 864e5);
      since.setHours(0, 0, 0, 0);
      const [vendors, riders, online, users, modules, orders] = await Promise.all([
        supabase.from("restaurants").select("id, status"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "delivery"),
        supabase.from("partner_status").select("user_id", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("nav_modules").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("total, status, placed_at").gte("placed_at", since.toISOString()),
      ]);

      const orderRows = (orders.data ?? []).filter((o) => o.status !== "cancelled");
      const buckets = new Map<string, { orders: number; revenue: number }>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(since.getTime() + i * 864e5);
        buckets.set(d.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
      }
      orderRows.forEach((o) => {
        const key = String(o.placed_at).slice(0, 10);
        const b = buckets.get(key);
        if (b) {
          b.orders += 1;
          b.revenue += Number(o.total ?? 0);
        }
      });

      setSeries(
        [...buckets.entries()].map(([day, v]) => ({
          day: new Date(day).toLocaleDateString(undefined, { weekday: "short" }),
          ...v,
        })),
      );
      setKpis({
        vendors: vendors.data?.length ?? 0,
        activeVendors: (vendors.data ?? []).filter((v) => v.status === "active").length,
        riders: riders.count ?? 0,
        ridersOnline: online.count ?? 0,
        users: users.count ?? 0,
        activeModules: modules.count ?? 0,
        orders7d: orderRows.length,
        revenue7d: orderRows.reduce((s, o) => s + Number(o.total ?? 0), 0),
      });
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black tracking-tight">Master Admin Console</h1>
        <p className="text-xs font-semibold text-muted-foreground">
          God-mode control over vendors, fleet, marketing and platform-wide feature switches.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpis ? (
          <>
            <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Total users" value={String(kpis.users)} sub={`${kpis.riders} riders`} />
            <Kpi icon={<Store className="h-3.5 w-3.5" />} label="Vendors" value={String(kpis.vendors)} sub={`${kpis.activeVendors} active`} />
            <Kpi icon={<Activity className="h-3.5 w-3.5" />} label="System health" value={kpis.ridersOnline > 0 ? "Healthy" : "Idle"} sub={`${kpis.activeModules} active modules`} />
            <Kpi icon={<IndianRupee className="h-3.5 w-3.5" />} label="Revenue (7d)" value={`₹${kpis.revenue7d.toFixed(0)}`} sub={`${kpis.orders7d} orders`} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[86px] rounded-2xl" />)
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Orders & revenue — last 7 days
        </p>
        <div className="h-52">
          {series.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="g-orders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary, 0 84% 55%))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary, 0 84% 55%))" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                  formatter={(v: number, n) => (n === "revenue" ? [`₹${v.toFixed(0)}`, "Revenue"] : [v, "Orders"])}
                />
                <Area type="monotone" dataKey="orders" stroke="var(--primary)" fill="url(#g-orders)" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="var(--orange, #f97316)" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full w-full rounded-xl" />
          )}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Level 1 — core modules</p>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {LEVEL1.map((m) => (
            <Link
              key={m.slug}
              to="/console/$"
              params={{ _splat: m.slug }}
              className="group rounded-2xl border border-border/60 bg-card p-3.5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
            >
              <m.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", m.tone)} />
              <p className="mt-2 text-sm font-black">{m.label}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">{m.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <RolesTable />
      <ActivityLog />
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)] transition hover:border-primary/40">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-0.5 text-xl font-black">{value}</p>
      {sub && <p className="text-[11px] font-semibold text-muted-foreground">{sub}</p>}
    </div>
  );
}

type AdminUser = { id: string; email: string | null; full_name: string | null; is_blocked: boolean; roles: string[] };

function RolesTable() {
  const [rows, setRows] = useState<AdminUser[] | null>(null);

  async function load() {
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "kitchen", "delivery"]),
      supabase.from("profiles").select("id, email, full_name, is_blocked"),
    ]);
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]));
    setRows(
      (profiles ?? [])
        .filter((p) => byUser.has(p.id))
        .map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })),
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: AdminUser) {
    const { error } = await supabase.from("profiles").update({ is_blocked: !u.is_blocked }).eq("id", u.id);
    if (error) return;
    load();
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Staff & role management
      </p>
      <div className="divide-y divide-border/60">
        {rows === null && <div className="p-3"><Skeleton className="h-10 w-full" /></div>}
        {rows?.length === 0 && <p className="p-3 text-xs font-semibold text-muted-foreground">No staff accounts yet.</p>}
        {rows?.map((u) => (
          <div key={u.id} className="flex items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{u.full_name || u.email || u.id.slice(0, 8)}</p>
              <p className="flex flex-wrap gap-1 pt-0.5">
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                ))}
              </p>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">{u.is_blocked ? "Inactive" : "Active"}</span>
            <Switch checked={!u.is_blocked} onCheckedChange={() => toggleActive(u)} aria-label="Toggle active" />
          </div>
        ))}
      </div>
    </section>
  );
}

type Log = { id: string; actor_email: string | null; table_name: string; action: string; created_at: string };

function ActivityLog() {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, actor_email, table_name, action, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      setLogs((data as Log[]) ?? []);
    }
    load();
    const ch = supabase
      .channel("console-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
        <Activity className="h-3.5 w-3.5" /> System activity log
      </p>
      <div className="divide-y divide-border/60">
        {logs === null && <div className="p-3"><Skeleton className="h-10 w-full" /></div>}
        {logs?.map((l) => (
          <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-xs">
            <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{l.action}</Badge>
            <span className="truncate font-bold">{l.table_name}</span>
            <span className="truncate text-muted-foreground">{l.actor_email ?? "system"}</span>
            <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">
              {new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
