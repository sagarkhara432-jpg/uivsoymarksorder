import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Save, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/LocationPicker";

type Kitchen = {
  id: string; name: string; address_line: string | null; landmark: string | null;
  city: string | null; pincode: string | null; lat: number | null; lng: number | null; phone: string | null;
};

/** Kitchen-side address + GPS capture. Riders navigate to exactly this pin. */
export default function KitchenLocationCard() {
  const [rows, setRows] = useState<Kitchen[]>([]);
  const [id, setId] = useState<string>("");
  const [f, setF] = useState({ address_line: "", landmark: "", city: "", pincode: "", phone: "", lat: null as number | null, lng: null as number | null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("restaurants").select("id, name, address_line, landmark, city, pincode, lat, lng, phone").order("created_at").then(({ data }) => {
      const list = (data ?? []) as Kitchen[];
      setRows(list);
      if (list[0]) select(list[0]);
    });
  }, []);

  function select(k: Kitchen) {
    setId(k.id);
    setF({
      address_line: k.address_line ?? "", landmark: k.landmark ?? "", city: k.city ?? "",
      pincode: k.pincode ?? "", phone: k.phone ?? "", lat: k.lat, lng: k.lng,
    });
  }

  async function save() {
    if (!id) return toast.error("No kitchen linked to your account yet — ask the owner to add one.");
    setBusy(true);
    const { error } = await supabase.from("restaurants").update({
      address_line: f.address_line || null, landmark: f.landmark || null, city: f.city || null,
      pincode: f.pincode || null, phone: f.phone || null, lat: f.lat, lng: f.lng,
    }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Kitchen location saved — riders will navigate here");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="flex items-center gap-2 text-sm font-extrabold"><Store className="h-4 w-4 text-primary" /> Address & map location</h2>
        {rows.length > 1 && (
          <select value={id} onChange={(e) => { const k = rows.find((r) => r.id === e.target.value); if (k) select(k); }} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            {rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={f.address_line} onChange={(e) => setF({ ...f, address_line: e.target.value })} placeholder="Full address" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
          <input value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} placeholder="Landmark" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <input value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} placeholder="Pin code" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Kitchen phone" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Detect current location / pick on map</p>
        <div className="mt-1">
          <LocationPicker lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF({ ...f, lat, lng })} height={220} />
        </div>
        <button disabled={busy} onClick={save} className="press mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
          <Save className="mr-1 inline h-4 w-4" /> Save kitchen location
        </button>
      </section>
    </main>
  );
}
