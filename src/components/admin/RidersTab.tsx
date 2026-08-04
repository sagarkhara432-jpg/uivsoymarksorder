import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Bike, IndianRupee, MapPin, Power, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { decideVerification } from "@/lib/admin.functions";
import { assignRider } from "@/lib/owner.functions";

type Rider = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_blocked: boolean;
  is_online: boolean;
  last_lat: number | null;
  last_lng: number | null;
  trips_today: number;
  earned_today: number;
  earned_total: number;
  verification?: { id: string; status: string } | null;
};

/** Owner-side rider control room: status, approvals, dispatch and payouts. */
export default function RidersTab() {
  const [rows, setRows] = useState<Rider[]>([]);
  const [active, setActive] = useState<{ id: string; status: string; partner_id: string | null; customer_name: string | null; total: number }[]>([]);
  const decide = useServerFn(decideVerification);
  const assign = useServerFn(assignRider);

  async function load() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [{ data: roles }, { data: statuses }, { data: earnings }, { data: verifs }, { data: orders }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "delivery"),
      supabase.from("partner_status").select("user_id, is_online, last_lat, last_lng"),
      supabase.from("rider_earnings").select("partner_id, amount, created_at"),
      supabase.from("partner_verifications").select("id, user_id, status").eq("requested_role", "delivery"),
      supabase.from("orders").select("id, status, partner_id, customer_name, total").not("status", "in", "(delivered,cancelled)").order("placed_at", { ascending: false }),
    ]);
    setActive((orders ?? []) as any[]);

    const ids = new Set<string>([...(roles ?? []).map((r: any) => r.user_id), ...(verifs ?? []).map((v: any) => v.user_id)]);
    if (!ids.size) { setRows([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, phone, is_blocked").in("id", [...ids]);

    setRows((profiles ?? []).map((p: any) => {
      const st = (statuses ?? []).find((s: any) => s.user_id === p.id);
      const mine = (earnings ?? []).filter((e: any) => e.partner_id === p.id);
      const today = mine.filter((e: any) => new Date(e.created_at) >= since);
      const v = (verifs ?? []).find((x: any) => x.user_id === p.id);
      return {
        ...p,
        is_online: !!st?.is_online,
        last_lat: st?.last_lat ?? null,
        last_lng: st?.last_lng ?? null,
        trips_today: today.length,
        earned_today: today.reduce((s: number, e: any) => s + Number(e.amount), 0),
        earned_total: mine.reduce((s: number, e: any) => s + Number(e.amount), 0),
        verification: v ? { id: v.id, status: v.status } : null,
      } as Rider;
    }));
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-riders")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_status" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_earnings" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function setOnline(userId: string, online: boolean) {
    const { error } = await supabase.from("partner_status").upsert({ user_id: userId, is_online: online });
    if (error) return toast.error(error.message);
    toast.success(online ? "Rider forced online" : "Rider forced offline");
    load();
  }

  async function toggleBlock(userId: string, blocked: boolean) {
    const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success(blocked ? "Rider blocked" : "Rider unblocked");
    load();
  }

  async function approve(id: string, decision: "approved" | "rejected") {
    try { await decide({ data: { verification_id: id, decision } }); toast.success(`Marked ${decision}`); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function reassign(orderId: string, partnerId: string) {
    try {
      await assign({ data: { order_id: orderId, partner_id: partnerId || null } });
      toast.success(partnerId ? "Order assigned" : "Rider removed from order");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Manual dispatch · active orders</h2>
        {!active.length && <p className="mt-2 text-xs text-muted-foreground">No active orders right now.</p>}
        <ul className="mt-2 space-y-2">
          {active.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-semibold">#{o.id.slice(0, 8)} · {o.customer_name ?? "Customer"} · <span className="capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</span></span>
              <select
                value={o.partner_id ?? ""}
                onChange={(e) => reassign(o.id, e.target.value)}
                className="rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold"
              >
                <option value="">— unassigned —</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name || r.email}{r.is_online ? " (online)" : ""}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>

      {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No delivery partners yet.</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-3 ${r.is_blocked ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card"}`}>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fresh/15 text-fresh"><Bike className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {r.full_name || "Unnamed rider"}
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${r.is_online ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}>{r.is_online ? "On-duty" : "Off-duty"}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.email} · {r.phone ?? "no phone"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {r.last_lat != null && r.last_lng != null ? (
                    <a href={`https://www.google.com/maps?q=${r.last_lat},${r.last_lng}`} target="_blank" rel="noreferrer" className="underline">{r.last_lat.toFixed(4)}, {r.last_lng.toFixed(4)}</a>
                  ) : "no location shared"}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold"><IndianRupee className="h-3 w-3" />Today ₹{r.earned_today.toFixed(0)} · {r.trips_today} trips · lifetime ₹{r.earned_total.toFixed(0)}</p>
                {r.verification?.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => approve(r.verification!.id, "approved")} className="press rounded-full bg-fresh px-3 py-1 text-[10px] font-bold text-fresh-foreground">Approve rider</button>
                    <button onClick={() => approve(r.verification!.id, "rejected")} className="press rounded-full bg-destructive px-3 py-1 text-[10px] font-bold text-destructive-foreground">Reject</button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => setOnline(r.id, !r.is_online)} className="press inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold active:bg-accent">
                  <Power className="h-3.5 w-3.5" /> {r.is_online ? "Force offline" : "Force online"}
                </button>
                <button onClick={() => toggleBlock(r.id, !r.is_blocked)} className={`press inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${r.is_blocked ? "bg-fresh text-fresh-foreground" : "bg-destructive text-destructive-foreground"}`}>
                  {r.is_blocked ? <><UserCheck className="h-3.5 w-3.5" /> Unblock</> : <><UserX className="h-3.5 w-3.5" /> Block</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
