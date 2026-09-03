import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Platform verticals used by the level-2 category filter. */
export const CATEGORIES = [
  { slug: "kirana", label: "Kirana", storeTypes: ["kirana", "grocery"] },
  { slug: "fruits_vegetables", label: "Fruits & Vegetables", storeTypes: ["fruits_vegetables", "fruits", "vegetables"] },
  { slug: "food", label: "Food / Restaurants", storeTypes: ["food", "fast_food", "restaurant", "cloud_kitchen"] },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function categoryBySlug(slug?: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export type FeatureFlag = {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  scope: "global" | "category" | "vendor";
  category: string | null;
  restaurant_id: string | null;
  is_enabled: boolean;
};

export type VendorRow = {
  id: string;
  name: string;
  store_type: string;
  status: string;
  is_open: boolean;
  city: string | null;
  phone: string | null;
  commission_percent: number | null;
  upi_id: string | null;
};

/** Live feature-flag registry with realtime updates. */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("feature_flags").select("*").order("label");
    if (error) toast.error(error.message);
    setFlags((data as FeatureFlag[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feature-flags")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { flags, loading, reload: load };
}

export async function setFlag(id: string, isEnabled: boolean) {
  const { error } = await supabase.from("feature_flags").update({ is_enabled: isEnabled }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Adds (or flips) a per-vendor override for a feature key. */
export async function upsertVendorFlag(base: FeatureFlag, restaurantId: string, isEnabled: boolean) {
  const { error } = await supabase.from("feature_flags").upsert(
    {
      feature_key: base.feature_key,
      label: base.label,
      description: base.description,
      scope: "vendor",
      category: null,
      restaurant_id: restaurantId,
      is_enabled: isEnabled,
    },
    { onConflict: "feature_key,scope,category,restaurant_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeFlag(id: string) {
  const { error } = await supabase.from("feature_flags").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Resolution order: vendor override -> category override -> global default.
 */
export function resolveFlag(flags: FeatureFlag[], key: string, opts: { category?: string | null; vendorId?: string | null } = {}) {
  const vendor = opts.vendorId ? flags.find((f) => f.scope === "vendor" && f.feature_key === key && f.restaurant_id === opts.vendorId) : null;
  if (vendor) return vendor.is_enabled;
  const cat = opts.category ? flags.find((f) => f.scope === "category" && f.feature_key === key && f.category === opts.category) : null;
  if (cat) return cat.is_enabled;
  const global = flags.find((f) => f.scope === "global" && f.feature_key === key);
  return global?.is_enabled ?? true;
}

/** Global emergency pause, backed by app_settings.service_enabled. */
export function useKillSwitch() {
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("service_enabled, service_message").eq("id", "app").maybeSingle();
    if (data) {
      setPaused(!data.service_enabled);
      setMessage(data.service_message ?? "");
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("kill-switch")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function toggle(nextPaused: boolean, note?: string) {
    setBusy(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ service_enabled: !nextPaused, service_message: note ?? message ?? null })
      .eq("id", "app");
    setBusy(false);
    if (error) return toast.error(error.message);
    setPaused(nextPaused);
    toast[nextPaused ? "warning" : "success"](nextPaused ? "Order intake paused platform-wide" : "Order intake resumed");
  }

  return { paused, message, setMessage, busy, toggle };
}

const IMPERSONATION_KEY = "uivsoymarks.impersonating";

export type Impersonation = { restaurantId: string; name: string; sessionId: string | null };

export function readImpersonation(): Impersonation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
}

/** Starts a one-click vendor view for the signed-in master admin and logs it. */
export async function startImpersonation(vendor: { id: string; name: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("impersonation_sessions")
    .insert({ admin_id: auth.user.id, restaurant_id: vendor.id })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const payload: Impersonation = { restaurantId: vendor.id, name: vendor.name, sessionId: data?.id ?? null };
  window.sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(payload));
  return payload;
}

export async function stopImpersonation() {
  const current = readImpersonation();
  window.sessionStorage.removeItem(IMPERSONATION_KEY);
  if (current?.sessionId) {
    await supabase.from("impersonation_sessions").update({ ended_at: new Date().toISOString() }).eq("id", current.sessionId);
  }
}

/** Reactive impersonation banner state. */
export function useImpersonation() {
  const [state, setState] = useState<Impersonation | null>(null);
  useEffect(() => setState(readImpersonation()), []);
  return {
    impersonation: state,
    async start(vendor: { id: string; name: string }) {
      const p = await startImpersonation(vendor);
      setState(p);
      toast.success(`Now viewing as ${vendor.name}`);
    },
    async stop() {
      await stopImpersonation();
      setState(null);
      toast.success("Returned to master admin");
    },
  };
}

/** Vendors filtered by the level-2 category. */
export function useVendors(categorySlug?: string) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("restaurants")
      .select("id, name, store_type, status, is_open, city, phone, commission_percent, upi_id")
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(error.message);
        const rows = (data as VendorRow[]) ?? [];
        const cat = categoryBySlug(categorySlug);
        setVendors(cat ? rows.filter((r) => cat.storeTypes.includes(r.store_type)) : rows);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  return { vendors, loading };
}
