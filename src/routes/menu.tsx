import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, User as UserIcon, Flame, LogIn, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, cart, cartTotals } from "@/lib/cart";
import { useSession, useMyProfile } from "@/lib/auth";
import { useAppSettings, useBanners, useRestaurants } from "@/lib/settings";
import MediaImage from "@/components/MediaImage";
import DownloadAppButton from "@/components/DownloadAppButton";
import ActiveOrderBanner from "@/components/ActiveOrderBanner";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Uivsoymarks" },
      { name: "description", content: "Fresh, hot, and delicious. Browse the Uivsoymarks menu and order in a tap." },
      { property: "og:title", content: "Menu — Uivsoymarks" },
      { property: "og:description", content: "Browse the Uivsoymarks menu and order in a tap." },
    ],
  }),
  component: MenuPage,
});

type Category = { id: string; name: string; emoji: string | null; sort_order: number };
type Item = {
  id: string;
  category_id: string | null;
  restaurant_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  out_of_stock: boolean;
  is_bestseller: boolean;
};

function MenuPage() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile, loading: profileLoading } = useMyProfile(user);
  const { settings } = useAppSettings();
  const banners = useBanners();
  const restaurants = useRestaurants();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | "all">("all");
  const [rest, setRest] = useState<string | "all">("all");
  const cartItems = useCart();
  const { count, subtotal } = cartTotals(cartItems);

  useEffect(() => {
    if (user && !profileLoading && profile && !profile.profile_completed) {
      nav({ to: "/onboarding" });
    }
  }, [user?.id, profile?.profile_completed, profileLoading]);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data ?? []));
    const loadItems = () =>
      supabase
        .from("menu_items")
        .select("*")
        .order("created_at")
        .then(({ data }) => setItems((data as Item[]) ?? []));
    loadItems();

    const ch = supabase
      .channel("menu-items-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => loadItems())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (active === "all" || i.category_id === active) &&
          (rest === "all" || i.restaurant_id === rest) &&
          (q ? i.name.toLowerCase().includes(q.toLowerCase()) : true),
      ),
    [items, q, active, rest],
  );

  const appName = settings?.app_name ?? "Uivsoymarks";

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <MediaImage src={settings.logo_url} alt={appName} className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <span className="font-black">{appName.charAt(0)}</span>
              </div>
            )}
            <span className="text-base font-extrabold tracking-tight">{appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/orders" className="press hidden rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold active:bg-accent sm:inline-flex">
              My orders
            </Link>
            {user ? (
              <Link to="/onboarding" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent">
                <UserIcon className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/auth" className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground active:bg-primary-press">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Chip active={active === "all"} onClick={() => setActive("all")} label="All" emoji="🍽️" />
            {cats.map((c) => (
              <Chip key={c.id} active={active === c.id} onClick={() => setActive(c.id)} label={c.name} emoji={c.emoji ?? "•"} />
            ))}
          </div>
        </div>
      </header>

      {settings && !settings.service_enabled && (
        <p className="mx-auto mt-3 max-w-3xl rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground">
          {settings.service_message || "We're currently closed. Please check back soon."}
        </p>
      )}

      {banners.length > 0 && (
        <div className="mx-auto mt-3 flex max-w-3xl snap-x gap-3 overflow-x-auto px-4 pb-1">
          {banners.map((b) => (
            <a
              key={b.id}
              href={b.link_url ?? "#"}
              onClick={(e) => !b.link_url && e.preventDefault()}
              className="relative h-32 w-[86%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 sm:w-[60%]"
            >
              <MediaImage src={b.image_url} alt={b.title ?? "Offer"} className="h-full w-full object-cover" fallback="🎉" />
              {(b.title || b.subtitle) && (
                <div className="absolute inset-x-0 bottom-0 bg-foreground/60 px-3 py-2 text-background">
                  <p className="text-sm font-extrabold">{b.title}</p>
                  <p className="text-[11px] opacity-90">{b.subtitle}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {restaurants.length > 1 && (
        <div className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={rest === "all"} onClick={() => setRest("all")} label="All kitchens" emoji="🏪" />
          {restaurants.map((r) => (
            <Chip
              key={r.id}
              active={rest === r.id}
              onClick={() => setRest(r.id)}
              label={`${r.name}${r.is_open ? "" : " (closed)"}`}
              emoji="🍴"
            />
          ))}
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-4">
        {!items.length && <p className="py-16 text-center text-sm text-muted-foreground">Loading menu…</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((it) => (
            <DishCard key={it.id} item={it} />
          ))}
        </div>
        {!filtered.length && items.length > 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">No dishes match your search.</p>
        )}
      </main>

      <DownloadAppButton />
      {count > 0 ? <CartBar count={count} subtotal={subtotal} /> : <ActiveOrderBanner />}
    </div>
  );
}

function Chip({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`press whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface active:bg-accent"
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </button>
  );
}

function DishCard({ item }: { item: Item }) {
  const [added, setAdded] = useState(false);
  const sold = !item.is_available || item.out_of_stock;
  function add() {
    cart.add({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image_url: item.image_url,
      is_veg: item.is_veg,
      restaurant_id: item.restaurant_id,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }
  return (
    <article className="press overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <MediaImage src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        {item.is_bestseller && (
          <span className="absolute left-2 top-2 rounded-full bg-offer px-2 py-0.5 text-[10px] font-bold text-offer-foreground">
            <Flame className="mr-0.5 inline h-3 w-3" /> Bestseller
          </span>
        )}
        {sold && (
          <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-sm font-extrabold text-background">
            Out of stock
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`grid h-3.5 w-3.5 place-items-center rounded-[3px] border ${item.is_veg ? "border-fresh" : "border-destructive"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${item.is_veg ? "bg-fresh" : "bg-destructive"}`} />
              </span>
              <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
            <p className="mt-1.5 text-sm font-bold">₹{Number(item.price).toFixed(0)}</p>
          </div>
          <button
            onClick={add}
            disabled={sold}
            className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              added ? "bg-fresh text-fresh-foreground" : "bg-primary text-primary-foreground active:bg-primary-press"
            } disabled:opacity-50`}
          >
            {sold ? "Sold out" : added ? "Added ✓" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CartBar({ count, subtotal }: { count: number; subtotal: number }) {
  return (
    <Link
      to="/cart"
      className="press fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press"
    >
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5" />
        <div className="text-sm">
          <div className="font-bold">
            {count} {count === 1 ? "item" : "items"} · ₹{subtotal.toFixed(0)}
          </div>
          <div className="text-[11px] opacity-90">View cart</div>
        </div>
      </div>
      <span className="text-sm font-bold">Checkout →</span>
    </Link>
  );
}
