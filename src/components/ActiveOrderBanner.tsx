import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bike, ChefHat, Package, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ActiveOrder = { id: string; status: string; total: number };

const LABELS: Record<string, string> = {
  placed: "Order placed",
  accepted: "Order accepted",
  preparing: "Preparing your food",
  packed: "Ready for pickup",
  out_for_delivery: "Out for delivery",
};

function statusIcon(status: string) {
  if (status === "out_for_delivery") return <Bike className="h-4 w-4" />;
  if (status === "packed") return <Package className="h-4 w-4" />;
  if (status === "preparing" || status === "accepted") return <ChefHat className="h-4 w-4" />;
  return <Timer className="h-4 w-4" />;
}

/** Swiggy/Zomato-style persistent live order strip pinned to the bottom. */
export default function ActiveOrderBanner() {
  const [order, setOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;

      async function load() {
        const { data } = await supabase
          .from("orders")
          .select("id, status, total")
          .eq("customer_id", uid!)
          .in("status", ["placed", "accepted", "preparing", "packed", "out_for_delivery"])
          .order("placed_at", { ascending: false })
          .limit(1);
        if (!cancelled) setOrder(((data ?? [])[0] as ActiveOrder | undefined) ?? null);
      }

      await load();
      channel = supabase
        .channel(`customer-active-order-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${uid}` },
          () => load(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (!order) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-pop)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          {statusIcon(order.status)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{LABELS[order.status] ?? order.status.replace(/_/g, " ")}</p>
          <p className="truncate text-xs text-muted-foreground">
            Order #{order.id.slice(0, 6)} · ₹{order.total}
          </p>
        </div>
        <Link
          to="/orders/$id"
          params={{ id: order.id }}
          className="press shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"
        >
          Track order
        </Link>
      </div>
    </div>
  );
}
