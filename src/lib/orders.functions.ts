import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlaceOrderInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
        notes: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(50),
  restaurant_id: z.string().uuid().optional(),
  address_line: z.string().min(5).max(500),
  house_no: z.string().max(120).optional(),
  building: z.string().max(160).optional(),
  landmark: z.string().max(200).optional(),
  address_tag: z.enum(["Home", "Work", "Other"]).optional(),
  city: z.string().max(120).optional(),
  pincode: z.string().max(20).optional(),
  phone: z.string().min(6).max(20),
  customer_name: z.string().min(1).max(120),
  lat: z.number().optional(),
  lng: z.number().optional(),
  payment_method: z.enum(["online", "cod", "card"]).default("online"),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlaceOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings } = await supabase.from("app_settings").select("*").eq("id", "global").maybeSingle();
    if (settings && settings.service_enabled === false) {
      throw new Error(settings.service_message || "Ordering is temporarily unavailable. Please try again later.");
    }
    const baseFee = Number(settings?.base_delivery_fee ?? 29);
    const freeOver = Number(settings?.free_delivery_over ?? 400);
    const taxPct = Number(settings?.tax_percent ?? 5);
    const riderPayout = Number(settings?.rider_payout_per_order ?? 35);
    const commissionPct = Number(settings?.commission_percent ?? 15);
    if (data.payment_method === "cod" && settings && settings.payment_cod_enabled === false) {
      throw new Error("Cash on delivery is currently unavailable");
    }
    if (data.payment_method === "online" && settings && settings.payment_online_enabled === false) {
      throw new Error("Online payment is currently unavailable");
    }
    if (data.payment_method === "card" && settings && settings.payment_card_enabled === false) {
      throw new Error("Card payment is currently unavailable");
    }

    // Look up menu items with authoritative pricing
    const ids = data.items.map((i) => i.id);
    const { data: menu, error: mErr } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url, is_available, out_of_stock, restaurant_id")
      .in("id", ids);
    if (mErr) throw new Error(mErr.message);
    if (!menu || menu.length === 0) throw new Error("Menu items not found");

    const orderItems = data.items.map((it) => {
      const m = menu.find((x) => x.id === it.id);
      if (!m) throw new Error("Item unavailable");
      if (!m.is_available || m.out_of_stock) throw new Error(`${m.name} is out of stock`);
      return {
        menu_item_id: m.id,
        name: m.name,
        price: Number(m.price),
        qty: it.qty,
        image_url: m.image_url ?? null,
        notes: it.notes?.trim() || null,
      };
    });

    const restaurant_id = data.restaurant_id ?? menu[0].restaurant_id ?? null;

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery_fee = subtotal >= freeOver ? 0 : baseFee;
    const tax = Math.round(subtotal * (taxPct / 100) * 100) / 100;

    // First-order discount lock: claim the flag BEFORE pricing the order.
    // The unique constraint on user_id makes this a single-use reservation, so
    // only a successful insert may grant the discount. A duplicate-key error
    // (23505) means it was already consumed; any other error is unexpected and
    // must abort the order rather than silently changing the price.
    let discount = 0;
    let first_order_discount = false;
    const { error: claimErr } = await supabase.from("first_order_flags").insert({ user_id: userId });
    if (claimErr && claimErr.code !== "23505") {
      throw new Error("Could not verify first-order offer. Please try again.");
    }
    if (!claimErr) {
      discount = Math.min(150, Math.round(subtotal * 0.5 * 100) / 100);
      first_order_discount = true;
    }

    const total = Math.round((Math.max(0, subtotal - discount) + delivery_fee + tax) * 100) / 100;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        customer_id: userId,
        restaurant_id,
        status: "placed",
        subtotal,
        discount,
        delivery_fee,
        tax,
        total,
        rider_payout: riderPayout,
        commission_percent: commissionPct,
        kitchen_payout: Math.round(subtotal * (1 - commissionPct / 100) * 100) / 100,
        payment_method: data.payment_method,
        payment_status: data.payment_method === "cod" ? "cod_pending" : "pending",
        first_order_discount,
        address_line: data.address_line,
        house_no: data.house_no ?? null,
        building: data.building ?? null,
        landmark: data.landmark ?? null,
        address_tag: data.address_tag ?? "Home",
        city: data.city ?? null,
        pincode: data.pincode ?? null,
        phone: data.phone,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        customer_name: data.customer_name,
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await supabase
      .from("order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Private 4-digit delivery PIN — stored where only the customer can read it.
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("order_pins").insert({ order_id: order.id, customer_id: userId, pin });

    return { order_id: order.id };
  });

const AcceptInput = z.object({
  order_id: z.string().uuid(),
  prep_time_mins: z.number().int().min(5).max(180),
});

export const acceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AcceptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", data.order_id)
      .single();
    if (oErr) throw new Error(oErr.message);
    if (order.status !== "placed") throw new Error("Order already handled");

    // Kitchen staff may ONLY move the order into preparation. Writing partner_id
    // or any delivery timestamp here trips the order-security trigger, so rider
    // dispatch is handled separately once the food is marked ready.
    const { error: uErr } = await supabase
      .from("orders")
      .update({
        status: "preparing",
        prep_time_mins: data.prep_time_mins,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", data.order_id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true };
  });

/** Assigns the nearest online rider. Runs with elevated rights so kitchen
 * accounts never write delivery columns themselves. */
async function dispatchNearestPartner(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, lat, lng, partner_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.partner_id) return null;

  const { data: partners } = await supabaseAdmin
    .from("partner_status")
    .select("user_id, last_lat, last_lng")
    .eq("is_online", true);
  if (!partners || partners.length === 0) return null;

  let partner_id: string | null = partners[0].user_id;
  if (order.lat != null && order.lng != null) {
    let best = Infinity;
    for (const p of partners) {
      if (p.last_lat == null || p.last_lng == null) continue;
      const d = haversine(order.lat, order.lng, p.last_lat, p.last_lng);
      if (d < best) {
        best = d;
        partner_id = p.user_id;
      }
    }
  }

  await supabaseAdmin.from("orders").update({ partner_id }).eq("id", orderId);
  return partner_id;
}

const StatusInput = z.object({
  order_id: z.string().uuid(),
  // 'delivered' is intentionally absent: completion requires the customer PIN
  // and is only reachable through completeDelivery below.
  status: z.enum(["preparing", "packed", "out_for_delivery", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: {
      status: typeof data.status;
      packed_at?: string;
      ready_at?: string;
      out_for_delivery_at?: string;
    } = { status: data.status };
    if (data.status === "packed") {
      patch.packed_at = now;
      patch.ready_at = now;
    }
    if (data.status === "out_for_delivery") patch.out_for_delivery_at = now;

    // RLS-scoped update. A caller without permission matches zero rows and gets
    // no error, so we require the updated row back before doing anything else.
    const { data: updated, error } = await context.supabase
      .from("orders")
      .update(patch)
      .eq("id", data.order_id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Not allowed to update this order");

    // "Packed" means the kitchen marked the food ready — auto-dispatch a rider.
    let partner_id: string | null = null;
    if (data.status === "packed") partner_id = await dispatchNearestPartner(data.order_id);

    return { ok: true, partner_id };
  });


const CompleteInput = z.object({
  order_id: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/, "Enter the 4-digit code"),
});

/**
 * Rider-side delivery completion. The PIN never leaves the database — it is
 * checked by a security-definer function, so a wrong code simply fails.
 */
export const completeDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status, partner_id, rider_payout, lat, lng")
      .eq("id", data.order_id)
      .single();
    if (oErr) throw new Error(oErr.message);
    if (order.partner_id !== userId) throw new Error("This order is not assigned to you");
    if (order.status === "delivered") throw new Error("Order already delivered");

    const { data: ok, error: vErr } = await supabase.rpc("verify_delivery_pin", {
      _order_id: data.order_id,
      _pin: data.pin,
    });
    if (vErr) throw new Error(vErr.message);
    if (!ok) throw new Error("Incorrect delivery code — ask the customer to read it again");

    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: now })
      .eq("id", data.order_id);
    if (uErr) throw new Error(uErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabase
      .from("app_settings")
      .select("per_km_rate, rider_incentive_amount, rider_incentive_km")
      .eq("id", "global")
      .maybeSingle();

    // Distance-triggered incentive on top of the flat per-order payout.
    let incentive = 0;
    const { data: status } = await supabase
      .from("partner_status")
      .select("last_lat, last_lng")
      .eq("user_id", userId)
      .maybeSingle();
    const triggerKm = Number(settings?.rider_incentive_km ?? 5);
    if (order.lat != null && order.lng != null && status?.last_lat != null && status?.last_lng != null) {
      const km = haversine(order.lat, order.lng, status.last_lat, status.last_lng);
      if (km >= triggerKm) incentive = Number(settings?.rider_incentive_amount ?? 0);
    }

    const amount = Math.round((Number(order.rider_payout ?? 0) + incentive) * 100) / 100;
    if (amount > 0) {
      await supabaseAdmin.from("rider_earnings").insert({ partner_id: userId, order_id: order.id, amount });
    }
    await supabaseAdmin.from("orders").update({ payment_status: "paid" }).eq("id", order.id);

    return { ok: true, earned: amount, incentive };
  });

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
