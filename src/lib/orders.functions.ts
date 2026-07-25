import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlaceOrderInput = z.object({
  items: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1).max(50),
  address_line: z.string().min(5).max(500),
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

    // Look up menu items with authoritative pricing
    const ids = data.items.map((i) => i.id);
    const { data: menu, error: mErr } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .in("id", ids);
    if (mErr) throw new Error(mErr.message);
    if (!menu || menu.length === 0) throw new Error("Menu items not found");

    const orderItems = data.items.map((it) => {
      const m = menu.find((x) => x.id === it.id);
      if (!m) throw new Error("Item unavailable");
      if (!m.is_available) throw new Error(`${m.name} is unavailable`);
      return { menu_item_id: m.id, name: m.name, price: Number(m.price), qty: it.qty };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery_fee = subtotal >= 400 ? 0 : 29;

    // First-order discount lock
    const { data: flag } = await supabase
      .from("first_order_flags")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    let discount = 0;
    let first_order_discount = false;
    if (!flag) {
      discount = Math.round(subtotal * 0.5 * 100) / 100;
      if (discount > 150) discount = 150;
      first_order_discount = true;
    }
    const total = Math.max(0, subtotal - discount) + delivery_fee;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        customer_id: userId,
        status: "placed",
        subtotal, discount, delivery_fee, total,
        first_order_discount,
        address_line: data.address_line,
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

    if (first_order_discount) {
      await supabase.from("first_order_flags").insert({ user_id: userId, order_id: order.id });
    }

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
        if (d < best) { best = d; partner_id = p.user_id; }
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
