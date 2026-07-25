import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCart, cart, cartTotals } from "@/lib/cart";
import { placeOrder } from "@/lib/orders.functions";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Uivsoymarks" },
      { name: "description", content: "Confirm your delivery details and place your Uivsoymarks order." },
      { property: "og:title", content: "Checkout — Uivsoymarks" },
      { property: "og:description", content: "Confirm your delivery details and place your order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const items = useCart();
  const { subtotal, count } = cartTotals(items);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address_line: "", city: "", pincode: "" });
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const place = useServerFn(placeOrder);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user]);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data?.profile_completed) { nav({ to: "/onboarding" }); return; }
      setForm({
        name: data.full_name ?? "",
        phone: data.phone ?? "",
        address_line: data.address_line ?? "",
        city: data.city ?? "",
        pincode: data.pincode ?? "",
      });
      if (data.lat && data.lng) setCoords({ lat: data.lat, lng: data.lng });
    });
  }, [user?.id]);

  function detectLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Could not detect location"),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (count === 0) { toast.error("Cart is empty"); return; }
    if (!form.name || !form.phone || !form.address_line) { toast.error("Please fill required fields"); return; }
    setBusy(true);
    try {
      const res = await place({ data: {
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        address_line: form.address_line, city: form.city, pincode: form.pincode,
        phone: form.phone, customer_name: form.name,
        lat: coords.lat, lng: coords.lng,
      }});
      cart.clear();
      toast.success("Order placed!");
      nav({ to: "/orders/$id", params: { id: res.order_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setBusy(false);
    }
  }

  const delivery = subtotal >= 400 || subtotal === 0 ? 0 : 29;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/cart" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-extrabold">Checkout</h1>
        </div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Delivery details</h2>
          <Field icon={<User className="h-4 w-4" />} placeholder="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field icon={<Phone className="h-4 w-4" />} placeholder="Phone number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          <Field icon={<MapPin className="h-4 w-4" />} placeholder="Address (house, street, area)" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field placeholder="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field placeholder="PIN code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
          </div>
          <button type="button" onClick={detectLocation} className="press mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent">
            <MapPin className="h-3.5 w-3.5" /> {coords.lat ? "Location captured ✓" : "Use my location"}
          </button>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Order summary</h2>
          <div className="space-y-1 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>₹{(i.price * i.qty).toFixed(0)}</span></div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{delivery ? `₹${delivery}` : "FREE"}</span></div>
          </div>
          <p className="mt-2 text-xs text-fresh">First-order 50% off (max ₹150) is applied automatically if eligible.</p>
        </section>

        <button
          type="submit"
          disabled={busy || count === 0}
          className="press fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press disabled:opacity-60"
        >
          {busy ? "Placing order…" : `Place order · ₹${(subtotal + delivery).toFixed(0)}`}
        </button>
      </form>
    </div>
  );
}

function Field({ icon, ...p }: { icon?: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        type={p.type ?? "text"}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
