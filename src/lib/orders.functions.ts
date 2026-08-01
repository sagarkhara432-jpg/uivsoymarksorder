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

    // fetch order location
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status, lat, lng, partner_id")
      .eq("id", data.order_id)
      .single();
    if (oErr) throw new Error(oErr.message);
    if (order.status !== "placed") throw new Error("Order already handled");

    // find nearest online delivery partner
    const { data: partners } = await supabase
      .from("partner_status")
      .select("user_id, last_lat, last_lng")
      .eq("is_online", true);

    let partner_id: string | null = null;
    if (order.lat != null && order.lng != null && partners && partners.length > 0) {
      let best = Infinity;
      for (const p of partners) {
        if (p.last_lat == null || p.last_lng == null) continue;
        const d = haversine(order.lat, order.lng, p.last_lat, p.last_lng);
        if (d < best) {
          best = d;
          partner_id = p.user_id;
        }
      }
    } else if (partners && partners.length > 0) {
      partner_id = partners[0].user_id;
    }

    const { error: uErr } = await supabase
      .from("orders")
      .update({
        status: "accepted",
        prep_time_mins: data.prep_time_mins,
        accepted_at: new Date().toISOString(),
        partner_id,
      })
      .eq("id", data.order_id);
    if (uErr) throw new Error(uErr.message);

    return { partner_id };
  });

const StatusInput = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["preparing", "packed", "out_for_delivery", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: {
      status: typeof data.status;
      packed_at?: string;
      out_for_delivery_at?: string;
      delivered_at?: string;
    } = { status: data.status };
    if (data.status === "packed") patch.packed_at = now;
    if (data.status === "out_for_delivery") patch.out_for_delivery_at = now;
    if (data.status === "delivered") patch.delivered_at = now;
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
      .select("id, status, partner_id, rider_payout")
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

    const amount = Number(order.rider_payout ?? 0);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (amount > 0) {
      await supabaseAdmin.from("rider_earnings").insert({ partner_id: userId, order_id: order.id, amount });
    }

    return { ok: true, earned: amount };
  });

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
