import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import MediaImage from "./MediaImage";

type Dish = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  restaurant_id: string | null;
};

/** "People also ordered…" carousel shown under the cart summary. */
export default function CartRecommendations() {
  const items = useCart();
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("menu_items")
      .select("id, name, price, image_url, is_veg, restaurant_id")
      .eq("is_available", true)
      .eq("out_of_stock", false)
      .order("is_bestseller", { ascending: false })
      .limit(14)
      .then(({ data }) => alive && setDishes(data ?? []));
    return () => {
      alive = false;
    };
  }, []);

  const inCart = new Set(items.map((i) => i.id));
  const suggestions = dishes.filter((d) => !inCart.has(d.id)).slice(0, 8);
  if (suggestions.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="px-1 text-sm font-extrabold">People also ordered…</h2>
      <div className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((d) => (
          <div key={d.id} className="w-32 shrink-0 snap-start rounded-2xl border border-border/60 bg-card p-2">
            <MediaImage src={d.image_url} alt={d.name} className="h-20 w-full rounded-xl object-cover" />
            <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-tight">{d.name}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-extrabold">₹{d.price.toFixed(0)}</span>
              <button
                aria-label={`Add ${d.name}`}
                onClick={() => {
                  cart.add({
                    id: d.id,
                    name: d.name,
                    price: Number(d.price),
                    image_url: d.image_url,
                    is_veg: d.is_veg,
                    restaurant_id: d.restaurant_id,
                  });
                  toast.success(`${d.name} added`);
                }}
                className="press grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground active:bg-primary-press"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
