import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, ShieldAlert, Tag, IndianRupee, UserCog, X, ExternalLink } from "lucide-react";
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

export function AlertsBell({ enabled, onOpenAudit }: { enabled: boolean; onOpenAudit?: (logId: string) => void }) {
  const [detail, setDetail] = useState<RiskAlert | null>(null);
  const { alerts, unread, markRead, clear } = useHighRiskAlerts(enabled, (a) => setDetail(a));
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
                  <button
                    key={a.id}
                    onClick={() => { setDetail(a); setOpen(false); }}
                    className="flex w-full gap-2 border-b border-border/40 px-3 py-2 text-left last:border-0 active:bg-accent"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">{a.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{a.detail}</span>
                      <span className="block text-[10px] text-muted-foreground">{a.actor} · {new Date(a.at).toLocaleString()}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {detail && (
        <AlertDetailDrawer
          alert={detail}
          onClose={() => setDetail(null)}
          onOpenAudit={onOpenAudit ? (id) => { setDetail(null); onOpenAudit(id); } : undefined}
        />
      )}
    </div>
  );
}

const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at"]);

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AlertDetailDrawer({ alert, onClose, onOpenAudit }: { alert: RiskAlert; onClose: () => void; onOpenAudit?: (logId: string) => void }) {
  const r = alert.row;
  const oldD = r.old_data ?? {};
  const newD = r.new_data ?? {};
  const [subject, setSubject] = useState<string>("Loading…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = { ...oldD, ...newD };
      let label = "—";
      if (r.table_name === "user_roles") {
        const { data } = await supabase.from("profiles").select("full_name,email").eq("id", d.user_id).maybeSingle();
        label = data ? `${data.full_name ?? "User"} · ${data.email ?? d.user_id}` : d.user_id;
      } else if (r.table_name === "profiles") {
        label = `${d.full_name ?? "User"} · ${d.email ?? r.record_id}`;
      } else if (r.table_name === "coupons") {
        label = `${d.code} — ${d.description ?? "coupon"}`;
      } else if (r.table_name === "menu_items") {
        label = `${d.name}`;
      }
      if (!cancelled) setSubject(label);
    })();
    return () => { cancelled = true; };
  }, [r.id]);

  const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)]))
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .filter((k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));

  const KIND_LABEL: Record<RiskAlert["kind"], string> = {
    role: "Role change", coupon: "Coupon", price: "Price change", block: "User access",
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 shadow-[var(--shadow-pop)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem] sm:rounded-l-3xl sm:rounded-tr-none sm:border-l">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-primary">{KIND_LABEL[alert.kind]}</p>
            <h2 className="text-lg font-extrabold">{alert.title}</h2>
            <p className="text-xs text-muted-foreground">{new Date(alert.at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface active:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <dl className="mt-4 space-y-2 rounded-2xl border border-border/60 bg-surface p-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Affected</dt><dd className="text-right font-semibold">{subject}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Changed by</dt><dd className="text-right font-semibold">{alert.actor}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Action</dt><dd className="text-right font-semibold capitalize">{r.action}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Record</dt><dd className="truncate text-right font-mono text-[11px]">{r.record_id}</dd></div>
        </dl>

        <h3 className="mt-4 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Old vs new</h3>
        <div className="mt-2 space-y-2">
          {!keys.length && <p className="text-xs text-muted-foreground">No field-level differences recorded.</p>}
          {keys.map((k) => (
            <div key={k} className="rounded-2xl border border-border/60 bg-card p-2.5 text-xs">
              <p className="font-bold capitalize">{k.replace(/_/g, " ")}</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-destructive/10 px-2 py-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Old</p>
                  <p className="break-words font-semibold">{fmt(oldD[k])}</p>
                </div>
                <div className="rounded-xl bg-fresh/15 px-2 py-1">
                  <p className="text-[10px] uppercase text-muted-foreground">New</p>
                  <p className="break-words font-semibold">{fmt(newD[k])}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {onOpenAudit && (
          <button
            onClick={() => onOpenAudit(r.id)}
            className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press"
          >
            <ExternalLink className="h-4 w-4" /> Open in audit log
          </button>
        )}
      </div>
    </div>
  );
}

