import { useState } from "react";
import { X, Smartphone, Banknote, CreditCard, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { AppSettings } from "@/lib/settings";
import { newPaymentRef, upiDeepLink, type UpiScheme } from "@/lib/upi";
import QrCode from "./QrCode";
import MediaImage from "./MediaImage";

export type PaymentMethod = "online" | "cod" | "card";

type Props = {
  open: boolean;
  total: number;
  settings: AppSettings | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
};

export default function PaymentSheet({ open, total, settings, busy, onClose, onConfirm }: Props) {
  const [screen, setScreen] = useState<"choose" | "upi">("choose");
  const [copied, setCopied] = useState(false);
  const [ref] = useState(newPaymentRef);
  if (!open) return null;

  const upiId = settings?.upi_id?.trim() || "";
  const note = `${settings?.app_name ?? "Uivsoymarks"} order`;
  /** Direct UPI intent — opens GPay / PhonePe / Paytm with no gateway involved. */
  const link = (scheme: UpiScheme) =>
    upiDeepLink(scheme, {
      pa: upiId,
      pn: settings?.upi_merchant_name || settings?.upi_holder_name || settings?.app_name || "Uivsoymarks",
      am: total,
      tr: ref,
      tn: note,
    });
  const payUrl = link("upi://pay");


  const methods: { id: PaymentMethod; label: string; hint: string; icon: React.ReactNode; enabled: boolean }[] = [
    {
      id: "online",
      label: "Online payment (UPI / GPay / Paytm)",
      hint: upiId ? `Pay instantly to ${upiId}` : "UPI not configured yet",
      icon: <Smartphone className="h-5 w-5" />,
      enabled: settings?.payment_online_enabled !== false && !!upiId,
    },
    {
      id: "cod",
      label: "Cash on delivery",
      hint: "Pay the rider in cash when your food arrives",
      icon: <Banknote className="h-5 w-5" />,
      enabled: settings?.payment_cod_enabled !== false,
    },
    {
      id: "card",
      label: "Card",
      hint: settings?.payment_card_enabled ? "Debit / credit card at the door" : "Currently unavailable",
      icon: <CreditCard className="h-5 w-5" />,
      enabled: !!settings?.payment_card_enabled,
    },
  ];

  function copy() {
    navigator.clipboard?.writeText(upiId);
    setCopied(true);
    toast.success("UPI ID copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-pop)] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {screen === "upi" && (
              <button onClick={() => setScreen("choose")} aria-label="Back" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-extrabold">{screen === "choose" ? "Choose payment method" : "Pay via UPI"}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Amount payable <span className="font-extrabold text-foreground">₹{total.toFixed(0)}</span>
        </p>

        {screen === "choose" && (
          <div className="mt-4 space-y-2">
            {methods.map((m) => (
              <button
                key={m.id}
                disabled={!m.enabled || busy}
                onClick={() => (m.id === "online" ? setScreen("upi") : onConfirm(m.id))}
                className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left active:bg-accent disabled:opacity-45"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {screen === "upi" && (
          <div className="mt-4">
            <div className="rounded-2xl border border-border/60 bg-surface p-4 text-center">
              {settings?.upi_qr_url ? (
                <MediaImage
                  src={settings.upi_qr_url}
                  alt="Scan to pay"
                  className="mx-auto h-56 w-56 rounded-2xl border border-border bg-background object-contain p-2"
                />
              ) : (
                <QrCode value={payUrl} size={224} showDownloads={false} fileName="uivsoymarks-upi" />
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paying to</p>
              <p className="text-sm font-extrabold">{settings?.upi_merchant_name || settings?.app_name}</p>
              {settings?.upi_holder_name && <p className="text-xs text-muted-foreground">{settings.upi_holder_name}</p>}
              <button onClick={copy} className="press mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold">
                {copied ? <Check className="h-3.5 w-3.5 text-fresh" /> : <Copy className="h-3.5 w-3.5" />} {upiId || "UPI not set"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <AppLink href={link("tez://upi/pay")} label="GPay" />
              <AppLink href={link("phonepe://pay")} label="PhonePe" />
              <AppLink href={link("paytmmp://pay")} label="Paytm" />
            </div>


            <button
              disabled={busy}
              onClick={() => onConfirm("online")}
              className="press mt-4 w-full rounded-2xl py-3.5 text-sm font-bold disabled:opacity-60"
              style={{
                background: "var(--checkout-bar, var(--primary))",
                color: "var(--checkout-bar-foreground, var(--primary-foreground))",
              }}
            >
              {busy ? "Placing order…" : "I've paid · Place order"}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Your payment is verified by the kitchen before dispatch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="press grid place-items-center rounded-xl border border-border bg-surface py-2.5 text-xs font-bold active:bg-accent"
    >
      {label}
    </a>
  );
}
