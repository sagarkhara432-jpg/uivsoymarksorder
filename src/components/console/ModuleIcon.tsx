import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = (props: { className?: string }) => React.ReactNode;

/** Renders any Lucide icon by name, falling back to a folder glyph. */
export default function ModuleIcon({ name, className }: { name?: string | null; className?: string }) {
  const registry = Icons as unknown as Record<string, IconComponent>;
  const Cmp = (name && registry[name]) || registry.Folder;
  return <Cmp className={cn("h-4 w-4", className)} />;
}

export const ICON_CHOICES = [
  "Folder", "ShoppingBag", "Truck", "Users", "Cpu", "Apple", "Store", "Bike",
  "ShieldCheck", "Watch", "Smartphone", "Headphones", "CupSoda", "CircleCheck",
  "CircleSlash", "Radio", "KeyRound", "LayoutDashboard", "Tag", "Settings",
  "ClipboardList", "Wallet", "BarChart3", "Boxes",
];
