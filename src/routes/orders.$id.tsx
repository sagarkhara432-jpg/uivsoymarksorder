import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Phone, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import OrderChat from "@/components/OrderChat";
import MediaImage from "@/components/MediaImage";
import LeafletMap from "@/components/LeafletMap";


export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id.slice(0, 8)} — Uivsoymarks` },
      { name: "description", content: "Track your Uivsoymarks order in real time." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

type Order = {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  prep_time_mins: number | null;
  placed_at: string;
  accepted_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  address_line: string;
  house_no: string | null;
  building: string | null;
  landmark: string | null;
  phone: string;
  customer_name: string | null;
  partner_id: string | null;
  lat: number | null;
  lng: number | null;
};

const STAGES = [
  { key: "placed", label: "Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "packed", label: "Packed" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function TrackPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<{ name: string; qty: number; price: number; image_url: string | null; notes: string | null }[]>([]);
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order | null);
      const { data: oi } = await supabase.from("order_items").select("name, qty, price, image_url, notes").eq("order_id", id);
      setItems((oi as any) ?? []);
    }
    load();
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order);
        toast.info(`Status: ${(payload.new as Order).status.replace(/_/g, " ")}`);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  useEffect(() => {
    supabase
      .from("order_pins")
      .select("pin")
      .eq("order_id", id)
      .maybeSingle()
      .then(({ data }) => setPin(data?.pin ?? null));
  }, [id]);

  if (!order) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading order…</div>;

  const stageIdx = order.status === "cancelled" ? -1 : STAGES.findIndex((s) => s.key === order.status);
  const eta = etaFor(order);

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/menu" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-extrabold">Order #{order.id.slice(0, 8)}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <section className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-pop)]">
            <div>
              <p className="text-[11px] font-semibold uppercase opacity-90">Arriving in</p>
              <p className="text-2xl font-black">{eta} min</p>
            </div>
            <Clock className="h-8 w-8 opacity-80" />
          </section>
        )}

        {pin && order.status !== "delivered" && (
          <section className="rounded-2xl border border-offer/50 bg-offer/10 p-4 text-center">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-offer">
              <ShieldCheck className="h-3.5 w-3.5" /> Delivery code
            </p>
            <p className="mt-1 text-4xl font-black tracking-[0.4em]">{pin}</p>
            <p className="mt-1 text-xs text-muted-foreground">Share this with the rider only when your food is handed over.</p>
          </section>
        )}

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          {order.prep_time_mins && stageIdx >= 1 && stageIdx <= 3 && (
            <p className="mb-3 rounded-xl bg-offer px-3 py-2 text-xs font-semibold text-offer-foreground">
              🍳 Kitchen prep time: {order.prep_time_mins} mins
            </p>
          )}
          <ol className="space-y-2">
            {STAGES.map((s, i) => {
              const done = i <= stageIdx;
              const current = i === stageIdx;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full ${
                      done ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"
                    } ${current ? "pulse-ring" : ""}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                  </span>
                  <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
            {order.status === "cancelled" && <p className="text-sm font-semibold text-destructive">Order cancelled</p>}
          </ol>
        </section>

        {order.lat != null && order.lng != null && <TrackMap lat={order.lat} lng={order.lng} />}

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Items</h2>
          <div className="mt-2 space-y-2 text-sm">
            {items.map((i, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <MediaImage src={i.image_url} alt={i.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">
                      {i.name} × {i.qty}
                    </span>
                    <span>₹{(i.price * i.qty).toFixed(0)}</span>
                  </div>
                  {i.notes && <p className="text-[11px] italic text-muted-foreground">“{i.notes}”</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2 text-sm">
            <Row label="Subtotal" value={`₹${order.subtotal}`} />
            {order.discount > 0 && <Row label="Discount" value={`-₹${order.discount}`} tone="fresh" />}
            <Row label="Delivery" value={order.delivery_fee ? `₹${order.delivery_fee}` : "FREE"} />
            {Number(order.tax) > 0 && <Row label="Taxes" value={`₹${order.tax}`} />}
            <div className="mt-1 flex justify-between font-extrabold">
              <span>Total</span>
              <span>₹{order.total}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Delivery to</h2>
          <p className="mt-1 text-sm">{order.customer_name}</p>
          <p className="text-sm text-muted-foreground">
            {[order.house_no, order.building, order.address_line].filter(Boolean).join(", ")}
          </p>
          {order.landmark && <p className="text-xs text-muted-foreground">Landmark: {order.landmark}</p>}
          {order.partner_id && (
            <button
              onClick={() => toast.info("Masked calling will connect via a secure proxy (telephony provider required).")}
              className="press mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:bg-primary-press"
            >
              <Phone className="h-3.5 w-3.5" /> Call rider (masked)
            </button>
          )}
        </section>

        {user && order.partner_id && order.status !== "delivered" && (
          <OrderChat orderId={order.id} selfId={user.id} title="Chat with your rider" />
        )}
      </main>
    </div>
  );
}

function etaFor(o: Order) {
  const prep = o.prep_time_mins ?? 20;
  const base = { placed: prep + 15, accepted: prep + 12, preparing: prep + 8, packed: 12, out_for_delivery: 8 } as Record<string, number>;
  return base[o.status] ?? 5;
}

function TrackMap({ lat, lng }: { lat: number; lng: number }) {
  return <LeafletMap lat={lat} lng={lng} zoom={15} height={220} popup="Your delivery address" />;
}


function Row({ label, value, tone }: { label: string; value: string; tone?: "fresh" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "fresh" ? "text-fresh font-semibold" : ""}>{value}</span>
    </div>
  );
}
