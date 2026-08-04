import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AssignInput = z.object({
  order_id: z.string().uuid(),
  partner_id: z.string().uuid().nullable(),
});

const ForceInput = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["placed", "accepted", "preparing", "packed", "out_for_delivery", "delivered", "cancelled"]),
});

const OrderInput = z.object({ order_id: z.string().uuid() });

/** Manual dispatch override: the owner assigns or reassigns any active order. */
export const assignRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssignInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ partner_id: data.partner_id })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Emergency override: force any order into any state (complete, cancel, rewind). */
export const forceOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ForceInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "preparing") patch.accepted_at = now;
    if (data.status === "packed") { patch.packed_at = now; patch.ready_at = now; }
    if (data.status === "out_for_delivery") patch.out_for_delivery_at = now;
    if (data.status === "delivered") patch.delivered_at = now;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Issues a fresh kitchen handover code when the old one is lost or disputed. */
export const regeneratePickupPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("order_pickup_pins")
      .upsert({ order_id: data.order_id, pin, verified_at: null }, { onConflict: "order_id" });
    if (error) throw new Error(error.message);
    return { pin };
  });

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin, error } = await (context.supabase as any).rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}
