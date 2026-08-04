import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Save, Store, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/LocationPicker";

type Kitchen = {
  id: string; name: string; description: string | null; phone: string | null;
  address_line: string | null; landmark: string | null; city: string | null; pincode: string | null;
  lat: number | null; lng: number | null; is_open: boolean; status: string;
  commission_percent: number | null;
};

const STATUSES = ["active", "inactive", "suspended"] as const;

/** Owner-side kitchen control: status, commission, location and live order load. */
export default function KitchensTab() {
  const [rows, setRows] = useState<Kitchen[]>([]);
  const [orders, setOrders] = useState<{ id: string; restaurant_id: string | null; status: string; total: number; customer_name: string | null }[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function load() {
    const [{ data: k, error }, { data: o }] = await Promise.all([
      supabase.from("restaurants").select("*").order("created_at"),
      supabase.from("orders").select("id, restaurant_id, status, total, customer_name")
        .not("status", "in", "(delivered,cancelled)").order("placed_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setRows((k ?? []) as Kitchen[]);
    setOrders((o ?? []) as any[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-kitchens")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const liveByKitchen = useMemo(() => {
    const m = new Map<string, typeof orders>();
    orders.forEach((o) => {
      const key = o.restaurant_id ?? "unassigned";
      m.set(key, [...(m.get(key) ?? []), o]);
    });
    return m;
  }, [orders]);

  async function addKitchen(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Kitchen name required");
    const { error } = await supabase.from("restaurants").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    toast.success("Kitchen added");
  }

  async function patch(id: string, values: Partial<Kitchen>) {
    const { error } = await supabase.from("restaurants").update(values as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kitchen updated");
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this kitchen? Its dishes stay but lose the kitchen link.")) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={addKitchen} className="flex gap-2 rounded-2xl border border-border/60 bg-card p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New kitchen name" className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <button className="press rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"><Plus className="mr-1 inline h-3.5 w-3.5" /> Add</button>
      </form>

      {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No kitchens registered yet.</p>}

      {rows.map((k) => {
        const live = liveByKitchen.get(k.id) ?? [];
        return (
          <section key={k.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange/15 text-orange"><Store className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{k.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {k.address_line || "No address saved"}{k.landmark ? ` · ${k.landmark}` : ""}
                  {k.lat != null && k.lng != null ? ` · 📍 ${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}` : " · no GPS pin"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Commission {k.commission_percent ?? "global"}{k.commission_percent != null ? "%" : ""} · {live.length} live orders</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  onClick={() => patch(k.id, { is_open: !k.is_open })}
                  className={`press rounded-full px-3 py-1 text-[10px] font-bold uppercase ${k.is_open ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {k.is_open ? "Open" : "Closed"}
                </button>
                <select
                  value={k.status}
                  onChange={(e) => patch(k.id, { status: e.target.value })}
                  className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-bold uppercase"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex gap-1">
                  <button onClick={() => setEditId(editId === k.id ? null : k.id)} className="press grid h-8 w-8 place-items-center rounded-full active:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(k.id)} className="press grid h-8 w-8 place-items-center rounded-full text-destructive active:bg-accent"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {editId === k.id && <KitchenEditor kitchen={k} onSaved={() => { setEditId(null); load(); }} onCancel={() => setEditId(null)} />}

            {live.length > 0 && (
              <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-surface px-3">
                {live.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2 text-xs">
                    <span className="truncate">#{o.id.slice(0, 8)} · {o.customer_name ?? "Customer"}</span>
                    <span className="ml-2 shrink-0 font-bold capitalize">{o.status.replace(/_/g, " ")} · ₹{o.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function KitchenEditor({ kitchen, onSaved, onCancel }: { kitchen: Kitchen; onSaved: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: kitchen.name ?? "", phone: kitchen.phone ?? "", description: kitchen.description ?? "",
    address_line: kitchen.address_line ?? "", landmark: kitchen.landmark ?? "", city: kitchen.city ?? "",
    pincode: kitchen.pincode ?? "", commission_percent: kitchen.commission_percent == null ? "" : String(kitchen.commission_percent),
    lat: kitchen.lat, lng: kitchen.lng,
  });

  async function save() {
    const { error } = await supabase.from("restaurants").update({
      name: f.name.trim() || kitchen.name,
      phone: f.phone || null,
      description: f.description || null,
      address_line: f.address_line || null,
      landmark: f.landmark || null,
      city: f.city || null,
      pincode: f.pincode || null,
      commission_percent: f.commission_percent ? Number(f.commission_percent) : null,
      lat: f.lat,
      lng: f.lng,
    }).eq("id", kitchen.id);
    if (error) return toast.error(error.message);
    toast.success("Kitchen saved");
    onSaved();
  }

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-primary/40 bg-surface p-3 sm:grid-cols-2">
      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Kitchen name" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description / layout notes" className="rounded-xl border border-border bg-card px-3 py-2 text-sm sm:col-span-2" />
      <input value={f.address_line} onChange={(e) => setF({ ...f, address_line: e.target.value })} placeholder="Full address" className="rounded-xl border border-border bg-card px-3 py-2 text-sm sm:col-span-2" />
      <input value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} placeholder="Landmark" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <input value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} placeholder="Pin code" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <input type="number" value={f.commission_percent} onChange={(e) => setF({ ...f, commission_percent: e.target.value })} placeholder="Commission % (blank = global)" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      <div className="sm:col-span-2">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Map location</p>
        <LocationPicker lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF({ ...f, lat, lng })} height={200} />
      </div>
      <div className="col-span-full flex gap-2">
        <button onClick={save} className="press flex-1 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"><Save className="mr-1 inline h-3.5 w-3.5" /> Save kitchen</button>
        <button onClick={onCancel} className="press rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold active:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
