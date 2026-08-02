import { Radar } from "lucide-react";

/**
 * Blinkit-style circular radar sweep shown while the system hunts for the
 * nearest online delivery partner.
 */
export default function RadarScan({ label = "Finding a delivery partner nearby…" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center">
      <div className="absolute inset-0 bg-background/35 backdrop-blur-[1px]" />
      <div className="relative grid h-40 w-40 place-items-center">
        <span className="radar-ring" />
        <span className="radar-ring radar-ring-delay-1" />
        <span className="radar-ring radar-ring-delay-2" />
        <span className="radar-sweep" />
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-pop)]">
          <Radar className="h-6 w-6" />
        </span>
      </div>
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/80 px-3 py-1.5 text-[11px] font-bold text-background">
        {label}
      </p>
    </div>
  );
}
