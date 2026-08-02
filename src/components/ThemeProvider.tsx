import { useEffect } from "react";
import { useAppSettings } from "@/lib/settings";

/** Parse #rgb / #rrggbb into [r,g,b]. Returns null for anything else. */
function parseHex(hex?: string | null): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(rgb: [number, number, number]) {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function shade(hex: string, amount: number) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((v) => v + (amount < 0 ? v * amount : (255 - v) * amount)) as [number, number, number]);
}

/** Pick a readable foreground (near-white or near-black) for a background colour. */
function readableOn(hex: string) {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.5 ? "#161616" : "#ffffff";
}

/**
 * Applies the admin-controlled palette to CSS custom properties so every screen
 * (buttons, tabs, badges, splash, checkout bar) re-themes instantly with no deploy.
 */
export default function ThemeProvider() {
  const { settings } = useAppSettings();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const set = (k: string, v: string | null) => (v ? root.style.setProperty(k, v) : root.style.removeProperty(k));

    const primary = parseHex(settings?.primary_color) ? settings!.primary_color : null;
    if (primary) {
      set("--primary", primary);
      set("--primary-foreground", readableOn(primary));
      set("--primary-press", shade(primary, -0.18));
      set("--brand", primary);
      set("--brand-foreground", readableOn(primary));
      set("--ring", primary);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", primary);
    }

    const accent = parseHex(settings?.accent_color) ? settings!.accent_color : null;
    if (accent) {
      set("--offer", accent);
      set("--offer-foreground", readableOn(accent));
      set("--orange", accent);
      set("--orange-foreground", readableOn(accent));
    }

    const splash = parseHex(settings?.splash_bg_color) ? settings!.splash_bg_color : null;
    set("--splash-bg", splash);
    set("--splash-fg", splash ? readableOn(splash) : null);

    const checkout = parseHex(settings?.checkout_theme_color) ? settings!.checkout_theme_color : null;
    set("--checkout-bar", checkout);
    set("--checkout-bar-foreground", checkout ? readableOn(checkout) : null);
  }, [
    settings?.primary_color,
    settings?.accent_color,
    settings?.splash_bg_color,
    settings?.checkout_theme_color,
  ]);

  return null;
}
