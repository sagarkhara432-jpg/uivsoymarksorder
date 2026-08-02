import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { resolveMedia } from "@/lib/media";

type Props = {
  value: string;
  logo?: string | null;
  size?: number;
  fileName?: string;
  showDownloads?: boolean;
  className?: string;
};

/**
 * High-resolution QR canvas with an optional centre logo. The destination is
 * whatever the admin saved, so updating the URL re-points every printed poster
 * the next time it is generated.
 */
export default function QrCode({
  value,
  logo,
  size = 320,
  fileName = "uivsoymarks-qr",
  showDownloads = true,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoSrc, setLogoSrc] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!logo) {
      setLogoSrc("");
      return;
    }
    resolveMedia(logo).then((u) => alive && setLogoSrc(u));
    return () => {
      alive = false;
    };
  }, [logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    let cancelled = false;

    (async () => {
      try {
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "H",
          color: { dark: "#111111", light: "#ffffff" },
        });
        if (cancelled || !logoSrc) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (cancelled) return;
          const box = size * 0.24;
          const x = (canvas.width - box) / 2;
          const y = (canvas.height - box) / 2;
          const pad = box * 0.12;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - pad, y - pad, box + pad * 2, box + pad * 2);
          ctx.drawImage(img, x, y, box, box);
        };
        img.src = logoSrc;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not render QR");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, size, logoSrc]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fileName}.png`;
    a.click();
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(value, { type: "svg", margin: 2, errorCorrectionLevel: "H" });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        aria-label="App download QR code"
        className="rounded-2xl border border-border bg-surface p-2"
        style={{ width: size, height: size, maxWidth: "100%" }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {showDownloads && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="press inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> SVG
          </button>
        </div>
      )}
    </div>
  );
}
