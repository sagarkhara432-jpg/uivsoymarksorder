import {
  Bike,
  ChefHat,
  Clock,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Utensils,
  Wallet,
} from "lucide-react";

/** Icons a master admin can pick for a landing feature card. */
export const LANDING_ICONS = {
  ChefHat,
  Bike,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Truck,
  Clock,
  MapPin,
  Star,
  Heart,
  Flame,
  Leaf,
  Percent,
  Wallet,
  Utensils,
} as const;

export type LandingIconName = keyof typeof LANDING_ICONS;

export const LANDING_ICON_NAMES = Object.keys(LANDING_ICONS) as LandingIconName[];

export default function LandingFeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LANDING_ICONS[name as LandingIconName] ?? Sparkles;
  return <Icon className={className ?? "h-5 w-5"} />;
}
