import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, ShieldAlert, Tag, IndianRupee, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RiskAlert = {
  id: string;
  kind: "role" | "coupon" | "price" | "block";
  title: string;
  detail: string;
  actor: string;
  at: string;
  row: any;
};

function base(row: any) {
  return { id: row.id, actor: row.actor_email || "system", at: row.created_at as string, row };
}

function classify(row: any): RiskAlert | null {
  const oldD = row.old_data ?? {};
  const newD = row.new_data ?? {};

  if (row.table_name === "user_roles") {
    if (row.action === "insert")
      return { ...base(row), kind: "role", title: "Role granted", detail: `Role “${newD.role}” given to a user` };
    if (row.action === "delete")
      return { ...base(row), kind: "role", title: "Role removed", detail: `Role “${oldD.role}” revoked from a user` };
  }

  if (row.table_name === "coupons") {
    if (row.action === "insert")
      return { ...base(row), kind: "coupon", title: "New coupon created", detail: `${newD.code} · ${newD.discount_type === "percent" ? `${newD.value}% off` : `₹${newD.value} off`}` };
    if (row.action === "update" && oldD.is_active !== newD.is_active)
      return { ...base(row), kind: "coupon", title: newD.is_active ? "Coupon activated" : "Coupon deactivated", detail: `${newD.code}` };
  }

  if (row.table_name === "menu_items" && row.action === "update" && Number(oldD.price) !== Number(newD.price))
    return { ...base(row), kind: "price", title: "Price changed", detail: `${newD.name}: ₹${oldD.price} → ₹${newD.price}` };

  if (row.table_name === "profiles" && row.action === "update" && oldD.is_blocked !== newD.is_blocked)
    return { ...base(row), kind: "block", title: newD.is_blocked ? "User blocked" : "User unblocked", detail: `${newD.email ?? newD.full_name ?? "user"}` };

  return null;
}


const ICONS = {
  role: UserCog,
  coupon: Tag,
  price: IndianRupee,
  block: ShieldAlert,
} as const;

export function useHighRiskAlerts(enabled: boolean, onSelect?: (a: RiskAlert) => void) {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;


  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    function push(rows: any[], notify: boolean) {
      const fresh: RiskAlert[] = [];
      for (const r of rows) {
        if (seen.current.has(r.id)) continue;
        const a = classify(r);
        if (!a) continue;
        seen.current.add(r.id);
        fresh.push(a);
      }
      if (!fresh.length || cancelled) return;
      setAlerts((prev) => [...fresh, ...prev].slice(0, 50));
      if (notify) {
        setUnread((u) => u + fresh.length);
        for (const a of fresh)
          toast.warning(a.title, {
            description: `${a.detail} · by ${a.actor}`,
            action: { label: "Details", onClick: () => selectRef.current?.(a) },
          });

      }
    }

    (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .in("table_name", ["user_roles", "coupons", "menu_items", "profiles"])
        .order("created_at", { ascending: false })
        .limit(60);
      push(data ?? [], false);
    })();

    const ch = supabase
      .channel("admin-risk-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        push([payload.new], true);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [enabled]);

  return { alerts, unread, markRead: () => setUnread(0), clear: () => setAlerts([]) };
}

export function AlertsBell({ enabled }: { enabled: boolean }) {
  const { alerts, unread, markRead, clear } = useHighRiskAlerts(enabled);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); markRead(); }}
        aria-label="High-risk alerts"
        className="press relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface active:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-xs font-extrabold uppercase tracking-wide">High-risk activity</p>
              <div className="flex items-center gap-2">
                <button onClick={clear} className="text-[11px] font-semibold text-muted-foreground">Clear</button>
                <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!alerts.length && <p className="px-3 py-8 text-center text-xs text-muted-foreground">No high-risk changes yet.</p>}
              {alerts.map((a) => {
                const Icon = ICONS[a.kind];
                return (
                  <div key={a.id} className="flex gap-2 border-b border-border/40 px-3 py-2 last:border-0">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{a.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{a.detail}</p>
                      <p className="text-[10px] text-muted-foreground">{a.actor} · {new Date(a.at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
