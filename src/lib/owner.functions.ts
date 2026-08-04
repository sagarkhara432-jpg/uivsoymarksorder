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
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

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
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const now = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: data.status,
        ...(data.status === "preparing" ? { accepted_at: now } : {}),
        ...(data.status === "packed" ? { packed_at: now, ready_at: now } : {}),
        ...(data.status === "out_for_delivery" ? { out_for_delivery_at: now } : {}),
        ...(data.status === "delivered" ? { delivered_at: now } : {}),
      })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Issues a fresh kitchen handover code when the old one is lost or disputed. */
export const regeneratePickupPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("order_pickup_pins")
      .upsert({ order_id: data.order_id, pin, verified_at: null }, { onConflict: "order_id" });
    if (error) throw new Error(error.message);
    return { pin };
  });
