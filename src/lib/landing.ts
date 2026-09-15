import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LandingFeature = {
  icon: string;
  title: string;
  text: string;
  tone?: string;
};

export type LandingContent = {
  id: string;
  badge_text: string;
  badge_bg: string;
  badge_fg: string;
  badge_enabled: boolean;
  headline: string;
  headline_highlight: string;
  subheadline: string;
  primary_label: string;
  primary_href: string;
  primary_bg: string;
  primary_fg: string;
  secondary_label: string;
  secondary_href: string;
  secondary_bg: string;
  secondary_fg: string;
  features: LandingFeature[];
};

export const DEFAULT_LANDING: LandingContent = {
  id: "global",
  badge_text: "Get 50% off your first order",
  badge_bg: "#FDE68A",
  badge_fg: "#7C2D12",
  badge_enabled: true,
  headline: "Hot food,",
  headline_highlight: "delivered fast.",
  subheadline: "Browse hand-picked menus, tap once, and watch your order fly across town in real time.",
  primary_label: "Order food",
  primary_href: "/menu",
  primary_bg: "#DC2626",
  primary_fg: "#FFFFFF",
  secondary_label: "Partner with us",
  secondary_href: "/partner",
  secondary_bg: "#FFFFFF",
  secondary_fg: "#111827",
  features: [
    { icon: "ChefHat", title: "Live kitchens", text: "Real-time order feed with prep-time tracking.", tone: "orange" },
    { icon: "Bike", title: "Fastest riders", text: "Auto-assigned to your nearest verified partner.", tone: "fresh" },
    { icon: "ShieldCheck", title: "Secure & private", text: "Masked calls, verified partners, protected data.", tone: "offer" },
  ],
};

/** Normalises a database row into a safe, fully-populated content object. */
function normalise(row: Record<string, unknown> | null): LandingContent {
  if (!row) return DEFAULT_LANDING;
  const rawFeatures = row.features;
  const features = Array.isArray(rawFeatures)
    ? (rawFeatures as LandingFeature[]).filter((f) => f && typeof f.title === "string")
    : DEFAULT_LANDING.features;
  return { ...DEFAULT_LANDING, ...(row as Partial<LandingContent>), features };
}

const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Live landing-page content. Any master-admin save pushes straight here over the
 * realtime channel, so the public page updates without a refresh.
 */
export function useLandingContent() {
  const [content, setContent] = useState<LandingContent>(DEFAULT_LANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("landing_content").select("*").eq("id", "global").maybeSingle();
      if (!alive) return;
      setContent(normalise(data as Record<string, unknown> | null));
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`landing-content-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "landing_content" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { content, loading };
}

/** Saves the landing content (admin only, enforced by database policy). */
export async function saveLandingContent(next: LandingContent) {
  const { id: _id, ...fields } = next;
  const { error } = await supabase
    .from("landing_content")
    .upsert({ id: "global", ...fields } as never, { onConflict: "id" });
  if (error) throw error;
}
