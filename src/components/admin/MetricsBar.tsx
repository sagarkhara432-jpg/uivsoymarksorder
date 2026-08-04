import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, IndianRupee, Store, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Live owner KPIs: active orders, kitchens, riders online and today's sales. */
export default function MetricsBar() {
  const [m, setM] = useState({ active: 0, kitchens: 0, ridersOnline: 0, sales: 0 });

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const [orders, kitchens, riders, today] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }),
        supabase.from("partner_status").select("user_id", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("orders").select("total, status").gte("placed_at", since.toISOString()),
      ]);
      if (today.error) toast.error(today.error.message);
      const sales = (today.data ?? [])
        .filter((o: { status: string }) => o.status !== "cancelled")
        .reduce((s: number, o: { total: number }) => s + Number(o.total ?? 0), 0);
      setM({
        active: orders.count ?? 0,
        kitchens: kitchens.count ?? 0,
        ridersOnline: riders.count ?? 0,
        sales,
      });
    }
    load();
    const ch = supabase
      .channel("admin-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_status" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
      <Kpi icon={<ClipboardList className="h-3.5 w-3.5" />} label="Active orders" value={String(m.active)} />
      <Kpi icon={<Store className="h-3.5 w-3.5" />} label="Kitchens" value={String(m.kitchens)} />
      <Kpi icon={<Bike className="h-3.5 w-3.5" />} label="Riders online" value={String(m.ridersOnline)} />
      <Kpi icon={<IndianRupee className="h-3.5 w-3.5" />} label="Today's sales" value={`₹${m.sales.toFixed(0)}`} />
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-0.5 text-xl font-black">{value}</p>
    </div>
  );
}
