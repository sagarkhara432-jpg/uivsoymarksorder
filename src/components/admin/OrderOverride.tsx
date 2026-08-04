import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, RefreshCw, Settings2 } from "lucide-react";
import { forceOrderStatus, regeneratePickupPin } from "@/lib/owner.functions";

const STATUSES = ["placed", "accepted", "preparing", "packed", "out_for_delivery", "delivered", "cancelled"] as const;

/** Emergency owner override for a single order. */
export default function OrderOverride({ orderId, status, onDone }: { orderId: string; status: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(status);
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const force = useServerFn(forceOrderStatus);
  const regen = useServerFn(regeneratePickupPin);

  async function apply() {
    setBusy(true);
    try {
      await force({ data: { order_id: orderId, status: next as (typeof STATUSES)[number] } });
      toast.success("Order status overridden");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function newPin() {
    setBusy(true);
    try {
      const res = await regen({ data: { order_id: orderId } });
      setPin(res.pin);
      toast.success("New pickup code issued");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="press mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold active:bg-accent">
        <Settings2 className="h-3.5 w-3.5" /> Override
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-surface p-2">
      <select value={next} onChange={(e) => setNext(e.target.value)} className="rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold capitalize">
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>
      <button disabled={busy} onClick={apply} className="press rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-60">Force status</button>
      <button disabled={busy} onClick={newPin} className="press inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold active:bg-accent">
        <RefreshCw className="h-3.5 w-3.5" /> New pickup code
      </button>
      {pin && <span className="inline-flex items-center gap-1 rounded-full bg-offer px-2 py-1 text-[11px] font-black tracking-widest text-offer-foreground"><KeyRound className="h-3 w-3" />{pin}</span>}
      <button onClick={() => setOpen(false)} className="press ml-auto rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground">Close</button>
    </div>
  );
}
