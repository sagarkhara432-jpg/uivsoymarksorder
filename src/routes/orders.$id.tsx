import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  id: string; status: string; subtotal: number; discount: number; delivery_fee: number; total: number;
  prep_time_mins: number | null; placed_at: string; accepted_at: string | null; out_for_delivery_at: string | null;
  delivered_at: string | null; address_line: string; phone: string; customer_name: string | null;
  partner_id: string | null;
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
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<{ name: string; qty: number; price: number }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order | null);
      const { data: oi } = await supabase.from("order_items").select("name, qty, price").eq("order_id", id);
      setItems(oi ?? []);
    }
    load();
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order);
        toast.info(`Status: ${(payload.new as Order).status.replace(/_/g, " ")}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!order) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading order…</div>;

  const stageIdx = order.status === "cancelled" ? -1 : STAGES.findIndex((s) => s.key === order.status);

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
                  <span className={`grid h-7 w-7 place-items-center rounded-full ${done ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"} ${current ? "pulse-ring" : ""}`}>
                    {done ? <Check className="h-4 w-4" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                  </span>
                  <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
            {order.status === "cancelled" && <p className="text-sm font-semibold text-destructive">Order cancelled</p>}
          </ol>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Items</h2>
          <div className="mt-2 space-y-1 text-sm">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>₹{(i.price * i.qty).toFixed(0)}</span></div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2 text-sm">
            <Row label="Subtotal" value={`₹${order.subtotal}`} />
            {order.discount > 0 && <Row label="Discount" value={`-₹${order.discount}`} tone="fresh" />}
            <Row label="Delivery" value={order.delivery_fee ? `₹${order.delivery_fee}` : "FREE"} />
            <div className="mt-1 flex justify-between font-extrabold"><span>Total</span><span>₹{order.total}</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Delivery to</h2>
          <p className="mt-1 text-sm">{order.customer_name}</p>
          <p className="text-sm text-muted-foreground">{order.address_line}</p>
          {order.partner_id && (
            <button
              onClick={() => toast.info("Masked calling will connect via a secure proxy (telephony provider required).")}
              className="press mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:bg-primary-press"
            >
              <Phone className="h-3.5 w-3.5" /> Call rider (masked)
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "fresh" }) {
  return (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={tone === "fresh" ? "text-fresh font-semibold" : ""}>{value}</span></div>
  );
}
