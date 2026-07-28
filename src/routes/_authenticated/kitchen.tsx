import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChefHat, LogOut, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptOrder, updateOrderStatus } from "@/lib/orders.functions";
import SwipeToConfirm from "@/components/SwipeToConfirm";
import { useOrderAlarm } from "@/hooks/use-order-alarm";


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
  id: string; status: string; total: number; prep_time_mins: number | null;
  customer_name: string | null; address_line: string; phone: string; placed_at: string;
};

function KitchenPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [verifiedOrPending, setVerifiedOrPending] = useState<"none" | "pending" | "rejected" | "approved">("none");
  const [orders, setOrders] = useState<Order[]>([]);
  const [prep, setPrep] = useState<Record<string, number>>({});
  const [alerting, setAlerting] = useState(false);
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
        .select("id, status, total, prep_time_mins, customer_name, address_line, phone, placed_at")
        .in("status", ["placed", "accepted", "preparing", "packed"])
        .order("placed_at", { ascending: false });
      setOrders(data ?? []);
      (data ?? []).forEach((o) => knownIds.current.add(o.id));
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


      <main className="mx-auto grid max-w-5xl gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {!orders.length && <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No active orders.</p>}
        {orders.map((o) => (
          <article key={o.id} className={`rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] ${o.status === "placed" ? "pulse-ring" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="font-extrabold">#{o.id.slice(0, 6)}</p>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold capitalize text-accent-foreground">{o.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(o.placed_at).toLocaleTimeString()}</p>
            <p className="mt-2 text-sm font-semibold">{o.customer_name}</p>
            <p className="text-xs text-muted-foreground">{o.address_line}</p>
            <p className="mt-2 text-sm font-bold">₹{o.total}</p>

            {o.status === "placed" && (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-semibold">Prep time (mins)</label>
                <input type="number" min={5} max={120} defaultValue={20} onChange={(e) => setPrep({ ...prep, [o.id]: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
                <SwipeToConfirm tone="fresh" label="Slide to Accept" onConfirm={() => doAccept(o.id)} />
              </div>
            )}
            {o.status === "accepted" && <SwipeToConfirm label="Slide to Start preparing" onConfirm={() => advance(o.id, "preparing")} />}
            {o.status === "preparing" && <SwipeToConfirm tone="orange" label="Slide to Mark packed" onConfirm={() => advance(o.id, "packed")} />}
            {o.status === "packed" && <SwipeToConfirm label="Slide to Hand to rider" onConfirm={() => advance(o.id, "out_for_delivery")} />}

          </article>
        ))}
      </main>
    </div>
  );
}


function PartnerOnboard({ role, status }: { role: "kitchen" | "delivery"; status: "none" | "pending" | "rejected" | "approved" }) {
  const [form, setForm] = useState({ full_name: "", phone: "", vehicle_number: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please upload your ID proof");
    if (!form.full_name || !form.phone) return toast.error("Fill all fields");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${role}-${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("id-proofs").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase.from("partner_verifications").insert({
        user_id: u.user.id, requested_role: role, full_name: form.full_name, phone: form.phone,
        vehicle_number: form.vehicle_number || null, id_proof_path: path, status: "pending",
      });
      if (error) throw error;
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
