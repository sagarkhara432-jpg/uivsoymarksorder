import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Printer, QrCode as QrIcon, Save, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QrCode from "@/components/QrCode";
import ImageUploadInput from "@/components/ImageUploadInput";
import { useAppSettings } from "@/lib/settings";

/** Owner payment credentials, UPI intent preview and printable app-download poster. */
export default function PaymentsTab() {
  const { settings } = useAppSettings();
  const [f, setF] = useState({
    upi_id: "", upi_holder_name: "", upi_merchant_name: "", upi_qr_url: "" as string | null,
    download_url: "", qr_logo_url: "" as string | null,
    payment_online_enabled: true, payment_cod_enabled: true, payment_card_enabled: false,
  });
  const [poster, setPoster] = useState("Scan here to Order Online & Download the App!");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setF({
      upi_id: settings.upi_id ?? "",
      upi_holder_name: settings.upi_holder_name ?? "",
      upi_merchant_name: settings.upi_merchant_name ?? "",
      upi_qr_url: settings.upi_qr_url ?? null,
      download_url: settings.download_url ?? "",
      qr_logo_url: settings.qr_logo_url ?? null,
      payment_online_enabled: settings.payment_online_enabled,
      payment_cod_enabled: settings.payment_cod_enabled,
      payment_card_enabled: settings.payment_card_enabled,
    });
  }, [settings?.id, settings?.upi_id, settings?.download_url]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({
      upi_id: f.upi_id.trim() || null,
      upi_holder_name: f.upi_holder_name.trim() || null,
      upi_merchant_name: f.upi_merchant_name.trim() || null,
      upi_qr_url: f.upi_qr_url,
      download_url: f.download_url.trim() || null,
      qr_logo_url: f.qr_logo_url,
      payment_online_enabled: f.payment_online_enabled,
      payment_cod_enabled: f.payment_cod_enabled,
      payment_card_enabled: f.payment_card_enabled,
    }).eq("id", "global");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment settings saved");
  }

  const appUrl = f.download_url.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  const sampleUpi = `upi://pay?pa=${encodeURIComponent(f.upi_id || "your-upi@bank")}&pn=${encodeURIComponent(f.upi_merchant_name || settings?.app_name || "Uivsoymarks")}&am=250.00&cu=INR&tn=Order%20UIV1234`;

  function printPoster() {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-poster-wrap] canvas");
    const img = canvas?.toDataURL("image/png") ?? "";
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return toast.error("Allow pop-ups to print the poster");
    w.document.write(`<html><head><title>${settings?.app_name ?? "Uivsoymarks"} poster</title></head>
      <body style="margin:0;font-family:system-ui;text-align:center;padding:48px">
      <h1 style="font-size:40px;margin:0 0 8px">${settings?.app_name ?? "Uivsoymarks"}</h1>
      <p style="font-size:22px;margin:0 0 24px">${poster.replace(/</g, "&lt;")}</p>
      <img src="${img}" style="width:420px;max-width:90%" />
      <p style="font-size:16px;color:#555;margin-top:24px">${appUrl}</p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2">
        <h2 className="col-span-full flex items-center gap-2 text-sm font-extrabold"><Wallet className="h-4 w-4 text-primary" /> Google Pay / UPI payout account</h2>
        <input value={f.upi_id} onChange={(e) => setF({ ...f, upi_id: e.target.value })} placeholder="UPI ID / VPA (e.g. owner@okicici)" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input value={f.upi_merchant_name} onChange={(e) => setF({ ...f, upi_merchant_name: e.target.value })} placeholder="Business / merchant name" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input value={f.upi_holder_name} onChange={(e) => setF({ ...f, upi_holder_name: e.target.value })} placeholder="Account holder name" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <div className="rounded-xl border border-border bg-surface p-2">
          <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Official business QR image</p>
          <ImageUploadInput value={f.upi_qr_url} onChange={(p) => setF({ ...f, upi_qr_url: p })} folder="payments" label="Upload QR" />
        </div>
        <div className="col-span-full flex flex-wrap gap-3 text-sm">
          {([["payment_online_enabled", "Online / UPI"], ["payment_cod_enabled", "Cash on delivery"], ["payment_card_enabled", "Card"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
              <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}
            </label>
          ))}
        </div>
        <p className="col-span-full rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
          Customers choosing Google Pay / UPI at checkout are sent straight to your account with a generated intent link:
          <span className="mt-1 block break-all font-mono text-[10px]">{sampleUpi}</span>
        </p>
        <button disabled={busy} onClick={save} className="press col-span-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
          <Save className="mr-1 inline h-4 w-4" /> Save payment settings
        </button>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold"><QrIcon className="h-4 w-4 text-primary" /> App download QR & printable poster</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <input value={f.download_url} onChange={(e) => setF({ ...f, download_url: e.target.value })} placeholder="Customer app / Play Store link" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
            <input value={poster} onChange={(e) => setPoster(e.target.value)} placeholder="Poster headline text" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
            <div className="rounded-xl border border-border bg-surface p-2">
              <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Centre logo on QR</p>
              <ImageUploadInput value={f.qr_logo_url} onChange={(p) => setF({ ...f, qr_logo_url: p })} folder="branding" label="Upload logo" />
            </div>
            <button onClick={printPoster} className="press w-full rounded-full border border-border bg-surface py-2.5 text-sm font-semibold active:bg-accent">
              <Printer className="mr-1 inline h-4 w-4" /> Download / print poster
            </button>
          </div>
          <div className="grid place-items-center">
            <div data-poster-wrap className="w-full">
              <QrCode value={appUrl || "https://uivsoymarksorder.lovable.app"} logo={f.qr_logo_url} size={260} fileName="uivsoymarks-app-qr" />
            </div>
            <p className="mt-1 break-all text-center text-[11px] text-muted-foreground">{appUrl}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
