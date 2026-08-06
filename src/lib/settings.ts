import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: string;
  app_name: string;
  logo_url: string | null;
  splash_url: string | null;
  download_url: string | null;
  delivery_radius_km: number;
  base_delivery_fee: number;
  free_delivery_over: number;
  tax_percent: number;
  rider_payout_per_order: number;
  service_enabled: boolean;
  service_message: string | null;
  primary_color: string;
  accent_color: string;
  splash_bg_color: string;
  checkout_theme_color: string;
  qr_logo_url: string | null;
  upi_id: string | null;
  upi_holder_name: string | null;
  upi_merchant_name: string | null;
  upi_qr_url: string | null;
  payment_online_enabled: boolean;
  payment_cod_enabled: boolean;
  payment_card_enabled: boolean;
  per_km_rate: number;
  rider_incentive_amount: number;
  rider_incentive_km: number;
  commission_percent: number;
};

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  media_type: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_sponsored: boolean;
  impressions: number;
  clicks: number;
  menu_item_id: string | null;
  restaurant_id: string | null;
};


export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  cover_url: string | null;
  is_open: boolean;
  is_sponsored: boolean;
  landmark?: string | null;
  status?: string;
  commission_percent?: number | null;
};


const uid = () => Math.random().toString(36).slice(2, 9);

/** Live app branding + commerce settings. Any admin edit lands here instantly. */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      supabase
        .from("app_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle()
        .then(({ data }) => {
          if (!alive) return;
          setSettings((data as AppSettings) ?? null);
          setLoading(false);
        });
    load();
    const ch = supabase
      .channel(`app-settings-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { settings, loading };
}

export function useBanners(activeOnly = true) {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      let q = supabase.from("banners").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data } = await q;
      if (alive) setBanners((data as Banner[]) ?? []);
    };
    load();
    const ch = supabase
      .channel(`banners-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [activeOnly]);
  return banners;
}

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("restaurants").select("*").order("created_at");
      if (alive) setRestaurants((data as Restaurant[]) ?? []);
    };
    load();
    const ch = supabase
      .channel(`restaurants-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);
  return restaurants;
}

/** Pricing preview used by cart/checkout — mirrors the authoritative server maths. */
export function quote(subtotal: number, s: AppSettings | null) {
  const base = Number(s?.base_delivery_fee ?? 29);
  const freeOver = Number(s?.free_delivery_over ?? 400);
  const taxPct = Number(s?.tax_percent ?? 5);
  const delivery = subtotal <= 0 || subtotal >= freeOver ? 0 : base;
  const tax = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  return { delivery, tax, taxPct, total: subtotal + delivery + tax };
}

/** Count a banner view or click for the admin ad-analytics panel. */
export function bumpBanner(bannerId: string, kind: "view" | "click") {
  void supabase.rpc("bump_banner_metric", { _banner_id: bannerId, _kind: kind });
}

/** Commission split preview used by the kitchen earnings dashboard. */
export function commissionSplit(subtotal: number, percent: number) {
  const commission = Math.round(subtotal * (percent / 100) * 100) / 100;
  return { commission, payout: Math.round((subtotal - commission) * 100) / 100 };
}
