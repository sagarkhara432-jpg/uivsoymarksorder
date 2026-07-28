import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Bike, LogOut, Navigation, Power, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus } from "@/lib/orders.functions";
import SwipeToConfirm from "@/components/SwipeToConfirm";
import { useOrderAlarm } from "@/hooks/use-order-alarm";


export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery — Uivsoymarks" },
      { name: "description", content: "Delivery partner dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeliveryPage,
});

type Order = {
  id: string; status: string; total: number; address_line: string; phone: string;
  customer_name: string | null; lat: number | null; lng: number | null; partner_id: string | null;
};

function DeliveryPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"none" | "pending" | "rejected" | "approved">("none");
  const [online, setOnline] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const posWatch = useRef<number | null>(null);
  const update = useServerFn(updateOrderStatus);
  const alarm = useOrderAlarm();
  const [ackedId, setAckedId] = useState<string | null>(null);


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
        .select("id, status, total, address_line, phone, customer_name, lat, lng, partner_id")
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

  async function advance(next: "out_for_delivery" | "delivered") {
    if (!order) return;
    try { await update({ data: { order_id: order.id, status: next } }); toast.success(`Order ${next.replace(/_/g, " ")}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); throw e; }
  }


  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;
  if (status !== "approved") {
    return <Onboard status={status} />;
  }

  return (
    <div className="min-h-screen bg-background" onPointerDown={alarm.unlock}>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2"><Bike className="h-5 w-5 text-primary" /><h1 className="font-extrabold">Delivery</h1></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleOnline} className={`press inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${online ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}>
              <Power className="h-3.5 w-3.5" /> {online ? "Online" : "Go online"}
            </button>
            <button onClick={signOut} className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface active:bg-accent"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {alarm.needsUnlock && (
        <button onClick={alarm.unlock} className="press mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-2xl bg-offer px-4 py-2 text-xs font-bold text-offer-foreground">
          <Volume2 className="h-4 w-4" /> Tap once to enable assignment alarm
        </button>
      )}

      <main className="mx-auto max-w-3xl space-y-3 p-4">
        {!order && <p className="rounded-2xl border border-dashed border-border/70 py-16 text-center text-sm text-muted-foreground">No active assignments. Stay online to receive orders.</p>}
        {order && (
          <>
            <section className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold">Order #{order.id.slice(0, 6)}</h2>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold capitalize">{order.status.replace(/_/g, " ")}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.address_line}</p>
              <p className="mt-1 text-sm font-bold">₹{order.total}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => toast.info("Masked calling requires a telephony provider.")} className="press rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent">📞 Call customer (masked)</button>
                {order.lat && order.lng && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground active:bg-primary-press">
                    <Navigation className="h-3.5 w-3.5" /> Open in Maps
                  </a>
                )}
              </div>

              {order.id !== ackedId && (
                <SwipeToConfirm
                  key={`ack-${order.id}`}
                  label="Slide to Accept assignment"
                  onConfirm={() => { setAckedId(order.id); alarm.stop(); toast.success("Assignment accepted"); }}
                />
              )}
              {order.id === ackedId && order.status === "packed" && (
                <SwipeToConfirm key={`pick-${order.id}`} tone="orange" label="Slide to Pick up Order" onConfirm={() => advance("out_for_delivery")} />
              )}
              {order.id === ackedId && order.status === "out_for_delivery" && (
                <SwipeToConfirm key={`done-${order.id}`} tone="fresh" label="Slide to Complete Delivery" onConfirm={() => advance("delivered")} />
              )}
              {order.id === ackedId && order.status !== "packed" && order.status !== "out_for_delivery" && (
                <p className="mt-3 rounded-full bg-muted py-2 text-center text-xs font-semibold text-muted-foreground">Waiting for kitchen to pack the order…</p>
              )}
            </section>

            {order.lat && order.lng && <MiniMap lat={order.lat} lng={order.lng} />}
          </>
        )}
      </main>
    </div>
  );
}


function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const [{ MapContainer, TileLayer, Marker, Popup }, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      // fix default marker icons
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setComp({ MapContainer, TileLayer, Marker, Popup });
    })();
  }, []);
  if (!Comp) return <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">Loading map…</div>;
  const { MapContainer, TileLayer, Marker, Popup } = Comp;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <MapContainer center={[lat, lng]} zoom={15} style={{ height: 300, width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <Marker position={[lat, lng]}><Popup>Delivery destination</Popup></Marker>
      </MapContainer>
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
        <p className="mt-1 text-sm text-muted-foreground">Head to the kitchen sign-up flow shape below to upload your ID.</p>
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
