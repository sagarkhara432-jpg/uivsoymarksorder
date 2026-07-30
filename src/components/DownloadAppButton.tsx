import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { useAppSettings } from "@/lib/settings";

/** Floating "Download App" button that opens a shareable standee / QR modal. */
export default function DownloadAppButton() {
  const [open, setOpen] = useState(false);
  const { settings } = useAppSettings();
  const target =
    settings?.download_url ||
    (typeof window !== "undefined" ? window.location.origin : "https://uivsoymarksorder.lovable.app");
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(target)}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press fixed bottom-24 right-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2.5 text-xs font-bold text-background shadow-[var(--shadow-pop)]"
      >
        <Download className="h-4 w-4" /> Download app
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-foreground/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-start justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-offer px-3 py-1 text-[11px] font-bold text-offer-foreground">
                <Smartphone className="h-3.5 w-3.5" /> Scan &amp; install
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-4 text-xl font-extrabold">Get {settings?.app_name ?? "Uivsoymarks"} on your phone</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Point your camera at the code, then tap “Add to Home Screen”.
            </p>
            <img src={qr} alt="QR code to install the app" className="mx-auto mt-4 h-56 w-56 rounded-2xl border border-border bg-background p-2" />
            <p className="mt-3 break-all text-[11px] text-muted-foreground">{target}</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(target);
              }}
              className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground active:bg-primary-press"
            >
              Copy link to share
            </button>
          </div>
        </div>
      )}
    </>
  );
}
