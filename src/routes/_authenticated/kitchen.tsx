import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChefHat, LogOut, Volume2, IndianRupee, ClipboardList, Store, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptOrder, updateOrderStatus } from "@/lib/orders.functions";
import SwipeToConfirm from "@/components/SwipeToConfirm";
import { useOrderAlarm } from "@/hooks/use-order-alarm";
import MediaImage from "@/components/MediaImage";
import KitchenLocationCard from "@/components/KitchenLocationCard";
import { commissionSplit, useAppSettings } from "@/lib/settings";


export const Route = createFileRoute("/_authenticated/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen — Uivsoymarks" },
      { name: "description", content: "Kitchen dashboard for Uivsoymarks partners." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KitchenPage,
});

type Order = {
  id: string; status: string; total: number; subtotal: number; prep_time_mins: number | null;
  customer_name: string | null; address_line: string; phone: string; placed_at: string;
  accepted_at: string | null; commission_percent: number | null; payment_method: string | null;
};

type OrderItem = { id: string; order_id: string; name: string; qty: number; price: number; image_url: string | null; notes: string | null };

function KitchenPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [verifiedOrPending, setVerifiedOrPending] = useState<"none" | "pending" | "rejected" | "approved">("none");
  const [orders, setOrders] = useState<Order[]>([]);
  const [prep, setPrep] = useState<Record<string, number>>({});
  const [alerting, setAlerting] = useState(false);
  const [tab, setTab] = useState<"live" | "earnings" | "store">("live");
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [viewItems, setViewItems] = useState<string | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const { settings } = useAppSettings();
  const alarm = useOrderAlarm();
  const knownIds = useRef<Set<string>>(new Set());
  const accept = useServerFn(acceptOrder);
  const update = useServerFn(updateOrderStatus);


  useEffect(() => {
    async function check() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const isKitchen = roles?.some((r) => r.role === "kitchen");
      if (!isKitchen) {
        const { data: v } = await supabase.from("partner_verifications").select("status").eq("user_id", u.user.id).eq("requested_role", "kitchen").maybeSingle();
        setVerifiedOrPending(v?.status ?? "none");
      } else {
        setVerifiedOrPending("approved");
      }
      setReady(true);
    }
    check();
  }, []);

  useEffect(() => {
    if (verifiedOrPending !== "approved") return;
    async function load() {
      const { data } = await supabase.from("orders")
        .select(SEL)
        .in("status", ["placed", "accepted", "preparing", "packed"])
        .order("placed_at", { ascending: false });
      setOrders(data ?? []);
      (data ?? []).forEach((o) => knownIds.current.add(o.id));

      const ids = (data ?? []).map((o) => o.id);
      if (ids.length) {
        const { data: its } = await supabase
          .from("order_items")
          .select("id, order_id, name, qty, price, image_url, notes")
          .in("order_id", ids);
        const map: Record<string, OrderItem[]> = {};
        (its ?? []).forEach((i) => { (map[i.order_id] ||= []).push(i); });
        setItemsByOrder(map);
      }
    }
    load();
    const ch = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new.status === "placed") {
          if (!knownIds.current.has(payload.new.id)) {
            knownIds.current.add(payload.new.id);
            fireAlert();
          }
        }
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [verifiedOrPending]);

  // Alarm stays on while any order is still un-accepted, even after a refresh.
  useEffect(() => {
    if (verifiedOrPending !== "approved") return;
    const pending = orders.some((o) => o.status === "placed");
    setAlerting(pending);
    if (pending) alarm.start();
    else alarm.stop();
  }, [orders, verifiedOrPending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Today's completed orders drive the earnings tab.
  useEffect(() => {
    if (verifiedOrPending !== "approved") return;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    supabase
      .from("orders")
      .select(SEL)
      .gte("placed_at", since.toISOString())
      .order("placed_at", { ascending: false })
      .then(({ data }) => setHistory(data ?? []));
  }, [verifiedOrPending, orders]);

  function fireAlert() {
    setAlerting(true);
    alarm.start();
    toast.warning("New order! 🔔 Slide to accept to stop the alarm", { duration: 8000 });
  }
  function silence() {
    setAlerting(false);
    alarm.stop();
  }

  async function doAccept(id: string) {
    const mins = prep[id] || 20;
    try {
      await accept({ data: { order_id: id, prep_time_mins: mins } });
      silence();
      toast.success(`Accepted · ${mins} min prep`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      throw e;
    }
  }

  async function advance(id: string, next: "preparing" | "packed" | "out_for_delivery") {
    try { await update({ data: { order_id: id, status: next } }); toast.success(`Marked ${next.replace(/_/g, " ")}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); throw e; }
  }


  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;

  if (verifiedOrPending !== "approved") {
    return <PartnerOnboard role="kitchen" status={verifiedOrPending} />;
  }

  return (
    <div className="min-h-screen bg-background" onPointerDown={alarm.unlock}>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-extrabold">Kitchen dashboard</h1>
          </div>
          <button onClick={signOut} className="press inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      {alarm.needsUnlock && (
        <button onClick={alarm.unlock} className="press mx-auto mt-3 flex max-w-5xl items-center gap-2 rounded-2xl bg-offer px-4 py-2 text-xs font-bold text-offer-foreground">
          <Volume2 className="h-4 w-4" /> Tap once to enable order alarm sound
        </button>
      )}

      {alerting && (
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> New order incoming — alarm ringing</div>
          <button onClick={silence} className="press rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">Silence</button>
        </div>
      )}


      <nav className="mx-auto mt-3 flex max-w-5xl gap-2 px-4">
        {([["live", "Live orders", ClipboardList], ["earnings", "Earnings", IndianRupee], ["store", "Store & location", Store]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`press inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold ${
              tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface active:bg-accent"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      {tab === "store" && <KitchenLocationCard />}

      {tab === "live" && (
        <main className="mx-auto grid max-w-5xl gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {!orders.length && <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No active orders.</p>}
          {orders.map((o) => {
            const its = itemsByOrder[o.id] ?? [];
            const split = commissionSplit(Number(o.subtotal ?? 0), o.commission_percent ?? settings?.commission_percent ?? 15);
            return (
              <article key={o.id} className={`rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] ${o.status === "placed" ? "pulse-ring" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="font-extrabold">#{o.id.slice(0, 6)}</p>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold capitalize text-accent-foreground">{o.status.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(o.placed_at).toLocaleTimeString()}</span>
                  <PrepTimer order={o} />
                </div>
                <p className="mt-2 text-sm font-semibold">{o.customer_name}</p>
                <p className="text-xs text-muted-foreground">{o.address_line}</p>

                {/* Visual KOT: dish thumbnails so the line cook can plate at a glance. */}
                <ul className="mt-2 space-y-1.5">
                  {its.slice(0, 3).map((i) => (
                    <li key={i.id} className="flex items-center gap-2">
                      <MediaImage src={i.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{i.name}</span>
                      <span className="text-xs font-extrabold">×{i.qty}</span>
                    </li>
                  ))}
                </ul>
                {its.length > 0 && (
                  <button onClick={() => setViewItems(o.id)} className="press mt-2 w-full rounded-xl border border-border bg-surface py-1.5 text-[11px] font-bold active:bg-accent">
                    View items ({its.reduce((n, i) => n + i.qty, 0)})
                  </button>
                )}

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-bold">₹{Number(o.total).toFixed(0)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {o.payment_method === "cod" ? "COD" : "Prepaid"} · payout ₹{split.payout.toFixed(0)}
                  </span>
                </div>

                {o.status === "placed" && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-semibold">Prep time (mins)</label>
                    <input type="number" min={5} max={120} defaultValue={20} onChange={(e) => setPrep({ ...prep, [o.id]: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
                    <SwipeToConfirm tone="fresh" label="Slide to Accept" onConfirm={() => doAccept(o.id)} />
                  </div>
                )}
                {(o.status === "accepted" || o.status === "preparing") && (
                  <div className="mt-3"><SwipeToConfirm tone="orange" label="Slide to Mark ready" onConfirm={() => advance(o.id, "packed")} /></div>
                )}
                {o.status === "packed" && (
                  <div className="mt-3 space-y-2">
                    <p className="rounded-xl bg-fresh/10 px-3 py-2 text-[11px] font-bold text-fresh">
                      Ready · rider auto-dispatched
                    </p>
                    <PickupCode orderId={o.id} />
                  </div>
                )}

              </article>
            );
          })}
        </main>
      )}

      {tab === "earnings" && <KitchenEarnings orders={history} fallbackPct={settings?.commission_percent ?? 15} />}

      {viewItems && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">Order #{viewItems.slice(0, 6)}</h2>
              <button onClick={() => setViewItems(null)} aria-label="Close" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {(itemsByOrder[viewItems] ?? []).map((i) => (
                <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface p-2">
                  <MediaImage src={i.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{i.name} × {i.qty}</p>
                    <p className="text-xs text-muted-foreground">₹{(Number(i.price) * i.qty).toFixed(0)}</p>
                    {i.notes && <p className="mt-0.5 text-[11px] italic text-offer">Special request: {i.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}

/** Handover code the kitchen reads out to the rider at pickup. */
function PickupCode({ orderId }: { orderId: string }) {
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("order_pickup_pins")
      .select("pin")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => { if (alive) setPin(data?.pin ?? null); });
    return () => { alive = false; };
  }, [orderId]);

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Rider pickup code</p>
      <p className="text-2xl font-black tracking-[0.3em]">{pin ?? "••••"}</p>
      <p className="text-[10px] text-muted-foreground">Read this to the delivery partner only after handing over the food.</p>
    </div>
  );
}


const SEL =
  "id, status, total, subtotal, prep_time_mins, customer_name, address_line, phone, placed_at, accepted_at, commission_percent, payment_method";

/** Counts up from acceptance so staff can see how long a ticket has been open. */
function PrepTimer({ order }: { order: Order }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!order.accepted_at) return null;
  const secs = Math.max(0, Math.floor((Date.now() - new Date(order.accepted_at).getTime()) / 1000));
  const late = order.prep_time_mins != null && secs > order.prep_time_mins * 60;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${late ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
      {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
      {order.prep_time_mins ? ` / ${order.prep_time_mins}m` : ""}
    </span>
  );
}

function KitchenEarnings({ orders, fallbackPct }: { orders: Order[]; fallbackPct: number }) {
  const completed = orders.filter((o) => o.status === "delivered");
  const gross = completed.reduce((s, o) => s + Number(o.subtotal ?? 0), 0);
  const totals = completed.reduce(
    (acc, o) => {
      const split = commissionSplit(Number(o.subtotal ?? 0), o.commission_percent ?? fallbackPct);
      acc.commission += split.commission;
      acc.payout += split.payout;
      return acc;
    },
    { commission: 0, payout: 0 },
  );

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today's orders" value={String(orders.length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Gross revenue" value={`₹${gross.toFixed(0)}`} />
        <Stat label="Net payout" value={`₹${totals.payout.toFixed(0)}`} tone />
      </div>
      <p className="rounded-2xl border border-border/60 bg-card p-3 text-xs text-muted-foreground">
        App commission deducted today: <span className="font-extrabold text-foreground">₹{totals.commission.toFixed(0)}</span>
      </p>

      <div className="space-y-2">
        {completed.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No completed orders yet today.</p>}
        {completed.map((o) => {
          const pct = o.commission_percent ?? fallbackPct;
          const split = commissionSplit(Number(o.subtotal ?? 0), pct);
          return (
            <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-3 text-sm">
              <div className="flex items-center justify-between font-bold">
                <span>#{o.id.slice(0, 6)}</span>
                <span>₹{Number(o.subtotal ?? 0).toFixed(0)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>Item total ₹{Number(o.subtotal ?? 0).toFixed(0)}</span>
                <span>Commission {pct}% (−₹{split.commission.toFixed(0)})</span>
                <span className="font-extrabold text-fresh">Payout ₹{split.payout.toFixed(0)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone ? "border-fresh/40 bg-fresh/5" : "border-border/60 bg-card"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function PartnerOnboard({ role, status }: { role: "kitchen" | "delivery"; status: "none" | "pending" | "rejected" | "approved" }) {
  const [form, setForm] = useState({ full_name: "", phone: "", vehicle_number: "", upi_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please upload your ID proof");
    if (!form.full_name || !form.phone) return toast.error("Fill all fields");
    // A real UPI ID is mandatory — every payout is settled straight to it.
    if (!isValidUpiId(form.upi_id)) return toast.error("Enter a valid UPI ID, e.g. name@okicici");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${role}-${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("id-proofs").upload(path, file);
      if (up.error) throw up.error;
      const upi = form.upi_id.trim();
      const { error } = await supabase.from("partner_verifications").insert({
        user_id: u.user.id, requested_role: role, full_name: form.full_name, phone: form.phone,
        vehicle_number: form.vehicle_number || null, id_proof_path: path, status: "pending", upi_id: upi,
      });
      if (error) throw error;
      await supabase.from("profiles").update({ upi_id: upi }).eq("id", u.user.id);
      toast.success("Submitted for admin review");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }


  if (status === "pending") return <StatusCard title="Awaiting admin approval" body="Your ID proof is under review. You'll be notified once approved." tone="offer" />;
  if (status === "rejected") return <StatusCard title="Application rejected" body="Please contact support or resubmit updated documents." tone="destructive" />;

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-extrabold">{role === "kitchen" ? "Join as Kitchen Partner" : "Join as Delivery Partner"}</h1>
        <p className="text-sm text-muted-foreground">Upload a government-issued ID (Aadhar / license). You cannot go online until an admin approves it.</p>
        <input placeholder="Full name (as on ID)" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
        {role === "delivery" && (
          <input placeholder="Vehicle number" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary" />
        )}
        <label className="press flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface p-4 text-center text-sm active:bg-accent">
          {file ? <span className="font-semibold text-fresh">Selected: {file.name}</span> : <><span className="font-semibold">Upload ID proof</span><span className="text-xs text-muted-foreground">JPG or PDF, up to 5MB</span></>}
          <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button disabled={busy} className="press w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
      </form>
    </div>
  );
}

function StatusCard({ title, body, tone }: { title: string; body: string; tone: "offer" | "destructive" }) {
  const bg = tone === "offer" ? "bg-offer text-offer-foreground" : "bg-destructive text-destructive-foreground";
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${bg} text-lg font-black`}>!</div>
        <h1 className="mt-3 text-lg font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        <Link to="/" className="press mt-4 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent">Back home</Link>
      </div>
    </div>
  );
}
