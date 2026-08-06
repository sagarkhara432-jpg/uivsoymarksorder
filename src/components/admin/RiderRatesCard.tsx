import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bike, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/lib/settings";

/** Master-admin controls for what riders earn per delivery, per km and as incentive. */
export default function RiderRatesCard() {
  const { settings } = useAppSettings();
  const [f, setF] = useState({ rider_payout_per_order: "", per_km_rate: "", rider_incentive_amount: "", rider_incentive_km: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setF({
      rider_payout_per_order: String(settings.rider_payout_per_order ?? 0),
      per_km_rate: String(settings.per_km_rate ?? 0),
      rider_incentive_amount: String(settings.rider_incentive_amount ?? 0),
      rider_incentive_km: String(settings.rider_incentive_km ?? 0),
    });
  }, [settings?.id, settings?.per_km_rate, settings?.rider_incentive_amount]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const nums = {
      rider_payout_per_order: Number(f.rider_payout_per_order),
      per_km_rate: Number(f.per_km_rate),
      rider_incentive_amount: Number(f.rider_incentive_amount),
      rider_incentive_km: Number(f.rider_incentive_km),
    };
    if (Object.values(nums).some((n) => !Number.isFinite(n) || n < 0)) return toast.error("Enter valid amounts");
    setBusy(true);
    const { error } = await supabase.from("app_settings").update(nums).eq("id", "global");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rider earning rates saved");
  }

  const fields: [keyof typeof f, string, string][] = [
    ["rider_payout_per_order", "Base payout per order (₹)", "35"],
    ["per_km_rate", "Per-kilometer rate (₹/km)", "6"],
    ["rider_incentive_amount", "Daily / long-trip incentive (₹)", "20"],
    ["rider_incentive_km", "Incentive triggers after (km)", "5"],
  ];

  return (
    <section className="mb-3 grid gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2">
      <h2 className="col-span-full flex items-center gap-2 text-sm font-extrabold">
        <Bike className="h-4 w-4 text-primary" /> Rider earnings & incentives
      </h2>
      {fields.map(([k, label, ph]) => (
        <label key={k} className="text-xs font-semibold text-muted-foreground">
          {label}
          <input
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            placeholder={ph}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground"
          />
        </label>
      ))}
      <button
        disabled={busy}
        onClick={save}
        className="press col-span-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60"
      >
        <Save className="mr-1 inline h-4 w-4" /> Save rider rates
      </button>
      <p className="col-span-full rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
        Every completed delivery pays the base payout, and the incentive is added automatically when the trip distance crosses the km threshold.
      </p>
    </section>
  );
}
