import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Bike,
  BadgeIndianRupee,
  CheckCircle2,
  IndianRupee,
  Lock,
  LogOut,
  Navigation,
  Package,
  Phone,
  Power,
  Store,
  Volume2,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { completeDelivery, verifyPickup } from "@/lib/orders.functions";
import SwipeToConfirm from "@/components/SwipeToConfirm";
import { useOrderAlarm } from "@/hooks/use-order-alarm";
import LeafletMap from "@/components/LeafletMap";
import { useRestaurants } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery Partner Dashboard — Uivsoymarks" },
      { name: "description", content: "Go online, pick up orders, navigate and complete deliveries with OTP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeliveryPage,
});

type Order = {
  id: string; status: string; total: number; address_line: string; phone: string;
  customer_name: string | null; lat: number | null; lng: number | null; partner_id: string | null;
  restaurant_id: string | null; house_no: string | null; building: string | null; landmark: string | null;
  rider_payout: number | null; is_kitchen_verified: boolean;
};


type Stage = "assigned" | "at_store" | "picked" | "at_customer";

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function DeliveryPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"none" | "pending" | "rejected" | "approved">("none");
  const [online, setOnline] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "earnings">("active");
  const [stage, setStage] = useState<Stage>("assigned");
  const posWatch = useRef<number | null>(null);
  const alarm = useOrderAlarm();
  const [ackedId, setAckedId] = useState<string | null>(null);
  const restaurants = useRestaurants();

  const pickup = useMemo(
    () => restaurants.find((r) => r.id === order?.restaurant_id) ?? restaurants[0] ?? null,
    [restaurants, order?.restaurant_id],
  );

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUid(u.user.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (roles?.some((r) => r.role === "delivery")) setStatus("approved");
      else {
        const { data: v } = await supabase.from("partner_verifications").select("status").eq("user_id", u.user.id).eq("requested_role", "delivery").maybeSingle();
        setStatus((v?.status as any) ?? "none");
      }
      const { data: ps } = await supabase.from("partner_status").select("is_online").eq("user_id", u.user.id).maybeSingle();
      setOnline(!!ps?.is_online);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (status !== "approved" || !uid) return;
    async function load() {
      const { data } = await supabase.from("orders")
        .select("id, status, total, address_line, phone, customer_name, lat, lng, partner_id, restaurant_id, house_no, building, landmark, rider_payout")
        .eq("partner_id", uid!)
        .in("status", ["accepted", "preparing", "packed", "out_for_delivery"])
        .maybeSingle();
      setOrder(data as Order | null);
    }
    load();
    const ch = supabase.channel("delivery-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `partner_id=eq.${uid ?? ""}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [status, uid]);

  // Keep the local step in sync with the server-side order status.
  useEffect(() => {
    if (!order) { setStage("assigned"); return; }
    if (order.status === "out_for_delivery") setStage((s) => (s === "at_customer" ? s : "picked"));
    else setStage((s) => (s === "picked" || s === "at_customer" ? "assigned" : s));
  }, [order?.id, order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleOnline() {
    const next = !online;
    setOnline(next);
    if (!uid) return;
    if (next && navigator.geolocation) {
      posWatch.current = navigator.geolocation.watchPosition(async (p) => {
        await supabase.from("partner_status").upsert({
          user_id: uid, is_online: true, last_lat: p.coords.latitude, last_lng: p.coords.longitude,
        });
      }, () => toast.error("Location permission required to go online"));
    } else if (posWatch.current != null) {
      navigator.geolocation.clearWatch(posWatch.current);
      posWatch.current = null;
    }
    await supabase.from("partner_status").upsert({ user_id: uid, is_online: next });
    toast.success(next ? "You're online" : "You're offline");
  }

  // Ring persistently on a new assignment until the partner acknowledges it.
  useEffect(() => {
    if (status !== "approved") return;
    if (order && order.id !== ackedId) {
      alarm.start();
      toast.warning("New delivery assigned! Slide to acknowledge", { duration: 8000 });
    } else {
      alarm.stop();
    }
  }, [order?.id, ackedId, status]); // eslint-disable-line react-hooks/exhaustive-deps





  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;
  if (status !== "approved") return <Onboard status={status} />;

  const acked = order && order.id === ackedId;
  const dropLine = order
    ? [order.house_no, order.building, order.address_line, order.landmark].filter(Boolean).join(", ")
    : "";

  return (
    <div className="min-h-screen bg-background pb-10" onPointerDown={alarm.unlock}>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Bike className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate font-extrabold">Delivery Partner</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleOnline}
              aria-pressed={online}
              className={`press inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors ${online ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <Power className="h-3.5 w-3.5" />
              <span className={`relative h-4 w-8 rounded-full transition-colors ${online ? "bg-fresh-foreground/30" : "bg-foreground/20"}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all ${online ? "left-[18px]" : "left-0.5"}`} />
              </span>
              {online ? "Online" : "Offline"}
            </button>
            <button onClick={signOut} aria-label="Sign out" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface active:bg-accent"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {(["active", "earnings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`press flex-1 rounded-full py-2 text-xs font-bold capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {t === "active" ? "Active order" : "Daily earnings"}
            </button>
          ))}
        </div>
      </header>

      {alarm.needsUnlock && (
        <button onClick={alarm.unlock} className="press mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-2xl bg-offer px-4 py-2 text-xs font-bold text-offer-foreground">
          <Volume2 className="h-4 w-4" /> Tap once to enable assignment alarm
        </button>
      )}

      {tab === "earnings" ? (
        <EarningsTab uid={uid} />
      ) : (
        <main className="mx-auto max-w-3xl space-y-3 p-4">
          {!online && (
            <p className="rounded-2xl bg-offer/15 px-4 py-3 text-xs font-semibold text-offer">
              You're offline — flip the toggle above to start receiving orders.
            </p>
          )}
          {!order && (
            <p className="rounded-2xl border border-dashed border-border/70 py-16 text-center text-sm text-muted-foreground">
              No active assignments. Stay online to receive orders.
            </p>
          )}
          {order && (
            <>
              <section className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <h2 className="truncate font-extrabold">Order #{order.id.slice(0, 6)}</h2>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold capitalize">{order.status.replace(/_/g, " ")}</span>
                </div>

                {/* Payment badge */}
                <div className="inline-flex items-center gap-2 rounded-full bg-fresh/15 px-3 py-1.5 text-xs font-bold text-fresh">
                  <BadgeIndianRupee className="h-4 w-4" /> Prepaid — collect nothing (₹{order.total} paid online)
                </div>

                {/* Pick-up */}
                <div className="rounded-2xl border border-border/60 bg-surface p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Store className="h-3.5 w-3.5" /> Pick up from
                  </p>
                  <p className="mt-1 text-sm font-bold">{pickup?.name ?? "Restaurant"}</p>
                  <p className="text-xs text-muted-foreground">{pickup?.address_line ?? "Address shared by kitchen"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pickup?.lat != null && pickup?.lng != null && (
                      <a href={mapsLink(pickup.lat, pickup.lng)} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground active:bg-primary-press">
                        <Navigation className="h-3.5 w-3.5" /> Navigate to store
                      </a>
                    )}
                    {pickup?.phone && (
                      <a href={`tel:${pickup.phone}`} className="press inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold active:bg-accent">
                        <Phone className="h-3.5 w-3.5" /> Call store
                      </a>
                    )}
                  </div>
                </div>

                {/* Drop-off — locked until the kitchen handover code is verified */}
                <div className="rounded-2xl border border-border/60 bg-surface p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Package className="h-3.5 w-3.5" /> Drop off to
                  </p>
                  {!order.is_kitchen_verified ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-offer">
                      <Lock className="h-3.5 w-3.5 shrink-0" /> Customer details unlock after kitchen code verification.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-bold">{order.customer_name ?? "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{dropLine}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.lat != null && order.lng != null && (
                          <a href={mapsLink(order.lat, order.lng)} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground active:bg-primary-press">
                            <Navigation className="h-3.5 w-3.5" /> Navigate to customer
                          </a>
                        )}
                        <button onClick={() => toast.info("Masked calling requires a telephony provider.")} className="press inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold active:bg-accent">
                          <Phone className="h-3.5 w-3.5" /> Call customer (masked)
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Sequential actions */}
                {!acked && (
                  <SwipeToConfirm
                    key={`ack-${order.id}`}
                    label="Slide to Accept assignment"
                    onConfirm={() => { setAckedId(order.id); alarm.stop(); toast.success("Assignment accepted"); }}
                  />
                )}
                {acked && stage === "assigned" && (
                  <button onClick={() => { setStage("at_store"); toast.success("Marked arrived at store"); }} className="press w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground active:bg-primary-press">
                    Arrived at Store
                  </button>
                )}
                {acked && stage === "at_store" && (
                  order.status === "packed" ? (
                    <PickupPinVerify orderId={order.id} />
                  ) : (
                    <p className="rounded-full bg-muted py-2 text-center text-xs font-semibold text-muted-foreground">Waiting for kitchen to pack the order…</p>
                  )
                )}
                {acked && stage === "picked" && (
                  <button onClick={() => { setStage("at_customer"); toast.success("Marked arrived at customer"); }} className="press w-full rounded-full bg-offer py-3 text-sm font-bold text-offer-foreground active:opacity-90">
                    Arrived at Customer
                  </button>
                )}
                {acked && stage === "at_customer" && <PinComplete orderId={order.id} />}


                <StepTrail stage={acked ? stage : "assigned"} acked={!!acked} />
              </section>

              {order.lat != null && order.lng != null && (
                <LeafletMap lat={order.lat} lng={order.lng} zoom={15} height={280} popup="Delivery destination" />
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}

function StepTrail({ stage, acked }: { stage: Stage; acked: boolean }) {
  const steps: { key: Stage | "done"; label: string }[] = [
    { key: "assigned", label: "Accepted" },
    { key: "at_store", label: "At store" },
    { key: "picked", label: "Picked up" },
    { key: "at_customer", label: "At customer" },
  ];
  const order: string[] = ["assigned", "at_store", "picked", "at_customer"];
  const current = acked ? order.indexOf(stage) : -1;
  return (
    <ol className="flex items-center justify-between gap-1 pt-1">
      {steps.map((s, i) => (
        <li key={s.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <CheckCircle2 className={`h-4 w-4 ${i <= current ? "text-fresh" : "text-muted-foreground/40"}`} />
          <span className={`truncate text-[10px] font-semibold ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function EarningsTab({ uid }: { uid: string | null }) {
  const [rows, setRows] = useState<{ amount: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    supabase
      .from("rider_earnings")
      .select("amount, created_at")
      .eq("partner_id", uid)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as any[])?.map((r) => ({ amount: Number(r.amount), created_at: r.created_at })) ?? []);
        setLoading(false);
      });
  }, [uid]);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Package className="h-4 w-4" />} label="Deliveries today" value={String(rows.length)} />
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Earnings today" value={`₹${total.toFixed(0)}`} />
        <div className="col-span-2">
          <Stat icon={<Wallet className="h-4 w-4" />} label="COD cash balance" value="₹0" hint="All orders are prepaid online — no cash to deposit." />
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-extrabold">Today's payouts</h2>
        {loading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No deliveries completed yet today.</p>}
        <ul className="mt-2 divide-y divide-border/60">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="font-bold">₹{r.amount.toFixed(0)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Rider enters the customer's 4-digit code to close out the delivery. */
function PinComplete({ orderId }: { orderId: string }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const complete = useServerFn(completeDelivery);

  async function submit() {
    if (!/^\d{4}$/.test(pin)) return toast.error("Enter the 4-digit code from the customer");
    setBusy(true);
    try {
      const res = await complete({ data: { order_id: orderId, pin } });
      toast.success(`Delivered! ₹${res.earned} added to your earnings`);
      setPin("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-fresh/40 bg-fresh/5 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-fresh">Complete delivery with OTP</p>
      <input
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        aria-label="Delivery OTP"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-2xl font-black tracking-[0.4em] outline-none focus:border-primary"
      />
      <button
        onClick={submit}
        disabled={busy || pin.length !== 4}
        className="press w-full rounded-full bg-fresh py-3 text-sm font-bold text-fresh-foreground disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Complete Delivery with OTP"}
      </button>
    </div>
  );
}

function Onboard({ status }: { status: "none" | "pending" | "rejected" | "approved" }) {
  if (status === "pending") return <SimpleCard title="Awaiting approval" body="Your ID is under review by admin." />;
  if (status === "rejected") return <SimpleCard title="Rejected" body="Please contact support to resubmit." />;
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-extrabold">Sign up as delivery partner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload your ID to get verified by our team.</p>
        <PartnerSignupForm role="delivery" />
      </div>
    </div>
  );
}

function SimpleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-lg font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        <Link to="/" className="press mt-4 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent">Back home</Link>
      </div>
    </div>
  );
}

function PartnerSignupForm({ role }: { role: "delivery" | "kitchen" }) {
  const [form, setForm] = useState({ full_name: "", phone: "", vehicle_number: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Upload ID proof");
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
      toast.success("Submitted");
      window.location.reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
      <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
      {role === "delivery" && <input placeholder="Vehicle number" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />}
      <label className="press flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border bg-surface p-4 text-sm active:bg-accent">
        {file ? file.name : "Upload ID proof"}
        <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button disabled={busy} className="press w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
        {busy ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
