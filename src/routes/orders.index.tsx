import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your orders — Uivsoymarks" },
      { name: "description", content: "See all your past and current Uivsoymarks orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id, status, total, placed_at").order("placed_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [user?.id]);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/menu" className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-lg font-extrabold">Your orders</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-2 px-4 py-4">
        {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p>}
        {rows.map((o) => (
          <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="press flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 active:bg-accent">
            <div>
              <p className="text-sm font-bold">Order #{o.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground capitalize">{o.status.replace(/_/g, " ")} · {new Date(o.placed_at).toLocaleString()}</p>
            </div>
            <p className="text-sm font-extrabold">₹{o.total}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
