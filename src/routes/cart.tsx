import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useCart, cart, cartTotals } from "@/lib/cart";
import CartRecommendations from "@/components/CartRecommendations";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Uivsoymarks" },
      { name: "description", content: "Review your Uivsoymarks order before checkout." },
      { property: "og:title", content: "Your cart — Uivsoymarks" },
      { property: "og:description", content: "Review your order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart();
  const { subtotal, count } = cartTotals(items);
  const delivery = subtotal >= 400 || subtotal === 0 ? 0 : 29;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/menu" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-extrabold">Your cart</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {count === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border/70 py-16 text-center">
            <div className="text-5xl">🛒</div>
            <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/menu" className="press mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground active:bg-primary-press">Browse menu</Link>
          </div>
        )}
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">₹{i.price.toFixed(0)}</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5">
                <button onClick={() => cart.dec(i.id)} className="press grid h-7 w-7 place-items-center rounded-full active:bg-accent"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                <button onClick={() => cart.inc(i.id)} className="press grid h-7 w-7 place-items-center rounded-full active:bg-accent"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button onClick={() => cart.remove(i.id)} className="press grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-accent">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {count > 0 && (
          <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4">
            <Row label="Item total" value={`₹${subtotal.toFixed(0)}`} />
            <Row label="Delivery fee" value={delivery === 0 ? "FREE" : `₹${delivery.toFixed(0)}`} tone={delivery === 0 ? "fresh" : undefined} />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-bold">To pay</span>
              <span className="text-lg font-extrabold">₹{(subtotal + delivery).toFixed(0)}</span>
            </div>
            <p className="mt-2 text-[11px] text-fresh">First order? 50% off (up to ₹150) applies automatically at checkout.</p>
          </div>
        )}

        {count > 0 && <CartRecommendations />}
      </main>

      {count > 0 && (
        <Link to="/checkout" className="press fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press">
          Continue to checkout →
        </Link>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "fresh" }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone === "fresh" ? "text-fresh" : ""}`}>{value}</span>
    </div>
  );
}
