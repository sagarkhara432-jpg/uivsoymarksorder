import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsRight, Loader2 } from "lucide-react";

type Props = {
  label: string;
  onConfirm: () => void | Promise<void>;
  /** tailwind classes for the filled track + knob accent */
  tone?: "primary" | "fresh" | "orange";
  disabled?: boolean;
};

const TONES = {
  primary: { fill: "bg-primary", knob: "text-primary", text: "text-primary-foreground" },
  fresh: { fill: "bg-fresh", knob: "text-fresh", text: "text-fresh-foreground" },
  orange: { fill: "bg-orange", knob: "text-orange", text: "text-orange-foreground" },
} as const;

function haptic(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export default function SwipeToConfirm({ label, onConfirm, tone = "primary", disabled }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef(0);
  const armed = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0);
  const [max, setMax] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const t = TONES[tone];

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setMax(Math.max(0, el.clientWidth - 56 - 8));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const finish = useCallback(async () => {
    setBusy(true);
    haptic([18, 40, 28]);
    try {
      await onConfirm();
      setDone(true);
    } catch {
      setDone(false);
      setX(0);
    } finally {
      setBusy(false);
    }
  }, [onConfirm]);

  useEffect(() => {
    if (!dragging) return;
    const clamp = (clientX: number) => Math.min(max, Math.max(0, clientX - startX.current));
    const onMove = (e: PointerEvent) => {
      const next = clamp(e.clientX);
      setX(next);
      if (!armed.current && next > max * 0.55) {
        armed.current = true;
        haptic(10);
      }
      if (armed.current && next < max * 0.4) armed.current = false;
    };
    const onUp = (e: PointerEvent) => {
      setDragging(false);
      armed.current = false;
      const next = clamp(e.clientX);
      if (next >= max - 6) {
        setX(max);
        void finish();
      } else {
        setX(0);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, max, finish]);


  const pct = max ? x / max : 0;
  const locked = disabled || busy || done;

  return (
    <div
      ref={trackRef}
      className={`relative mt-3 h-14 w-full select-none overflow-hidden rounded-full border border-border/60 bg-surface ${
        locked ? "opacity-90" : ""
      }`}
      style={{ touchAction: "pan-y" }}
    >
      {/* filled progress track */}
      <div
        className={`absolute inset-y-0 left-0 ${t.fill}`}
        style={{
          width: `${x + 56}px`,
          transition: dragging ? "none" : "width 260ms cubic-bezier(.22,1,.36,1)",
        }}
      />

      {/* arrow hint / label */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span
          className={`flex items-center gap-1 text-sm font-extrabold ${
            pct > 0.5 ? t.text : "text-muted-foreground"
          }`}
          style={{ opacity: done ? 0 : 1 - pct * 0.55 }}
        >
          {done ? null : (
            <>
              {label}
              <ChevronsRight className="h-4 w-4 animate-pulse" />
            </>
          )}
        </span>
        {done && <span className={`text-sm font-extrabold ${t.text}`}>Confirmed</span>}
      </div>

      {/* knob */}
      <div
        onPointerDown={(e) => {
          if (locked) return;
          setDragging(true);
          armed.current = false;
          startX.current = e.clientX - x;
          measure();
          haptic(8);
        }}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
            e.preventDefault();
            setX(max);
            void finish();
          }
        }}
        className={`absolute top-1 left-1 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-background shadow-[var(--shadow-pop)] active:cursor-grabbing ${t.knob}`}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 260ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : done ? (
          <Check className="h-5 w-5" />
        ) : (
          <ChevronsRight className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
