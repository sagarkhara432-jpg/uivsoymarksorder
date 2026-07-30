import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCart, cart, cartTotals } from "@/lib/cart";
import { placeOrder } from "@/lib/orders.functions";
import { useSession } from "@/lib/auth";
import { useAppSettings, quote } from "@/lib/settings";
import LocationPicker from "@/components/LocationPicker";

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

const TAGS = ["Home", "Work", "Other"] as const;

function CheckoutPage() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const items = useCart();
  const { subtotal, count } = cartTotals(items);
  const { settings } = useAppSettings();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address_line: "",
    house_no: "",
    building: "",
    landmark: "",
    city: "",
    pincode: "",
    address_tag: "Home" as (typeof TAGS)[number],
  });
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const place = useServerFn(placeOrder);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.profile_completed) {
          nav({ to: "/onboarding" });
          return;
        }
        setForm((f) => ({
          ...f,
          name: data.full_name ?? "",
          phone: data.phone ?? "",
          address_line: data.address_line ?? "",
          city: data.city ?? "",
          pincode: data.pincode ?? "",
        }));
        if (data.lat && data.lng) setCoords({ lat: data.lat, lng: data.lng });
      });
  }, [user?.id]);

  const { delivery, tax, taxPct, total } = quote(subtotal, settings ?? null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (count === 0) return toast.error("Cart is empty");
    if (!form.name || !form.phone || !form.address_line) return toast.error("Please fill name, phone and address");
    if (!form.house_no.trim()) return toast.error("House / flat number is required for delivery");
    if (coords.lat == null || coords.lng == null) return toast.error("Please drop your location pin on the map");
    setBusy(true);
    try {
      const res = await place({
        data: {
          items: items.map((i) => ({ id: i.id, qty: i.qty, notes: i.notes })),
          restaurant_id: items.find((i) => i.restaurant_id)?.restaurant_id ?? undefined,
          address_line: form.address_line,
          house_no: form.house_no,
          building: form.building || undefined,
          landmark: form.landmark || undefined,
          address_tag: form.address_tag,
          city: form.city,
          pincode: form.pincode,
          phone: form.phone,
          customer_name: form.name,
          lat: coords.lat,
          lng: coords.lng,
        },
      });
      cart.clear();
      toast.success("Order placed!");
      nav({ to: "/orders/$id", params: { id: res.order_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setBusy(false);
    }
  }

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
        <section className="rounded-2xl border border-fresh/40 bg-fresh/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-fresh">Delivering to</p>
              <p className="mt-1 text-sm font-bold">{form.name || "—"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {form.address_line}
                {form.city ? `, ${form.city}` : ""}
                {form.pincode ? ` — ${form.pincode}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">📞 {form.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="press shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold active:bg-accent"
            >
              {editing ? "Done" : "Change"}
            </button>
          </div>
          {editing && (
            <div className="mt-3 space-y-2">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Street / area" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4" /> Exact drop-off details
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="House / flat no *" value={form.house_no} onChange={(v) => setForm({ ...form, house_no: v })} />
            <Field label="Building / society" value={form.building} onChange={(v) => setForm({ ...form, building: v })} />
          </div>
          <Field label="Landmark" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
          <div className="flex gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, address_tag: t })}
                className={`press rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  form.address_tag === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface active:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <LocationPicker
            lat={coords.lat ?? null}
            lng={coords.lng ?? null}
            onChange={(lat, lng) => setCoords({ lat, lng })}
          />
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            {items.map((i) => (
              <div key={i.id}>
                <div className="flex justify-between">
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span>₹{(i.price * i.qty).toFixed(0)}</span>
                </div>
                {i.notes && <p className="text-[11px] italic text-muted-foreground">“{i.notes}”</p>}
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{delivery ? `₹${delivery}` : "FREE"}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes ({taxPct}%)</span>
              <span>₹{tax.toFixed(0)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-fresh">First-order 50% off (max ₹150) is applied automatically if eligible.</p>
        </section>

        <button
          type="submit"
          disabled={busy || count === 0}
          className="press fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press disabled:opacity-60"
        >
          {busy ? "Placing order…" : `Place order · ₹${total.toFixed(0)}`}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
