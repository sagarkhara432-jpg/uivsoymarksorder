/**
 * Free UPI collection helpers — no payment gateway, no SDK, no fees.
 * Every "Pay" action is a plain UPI deep link that hands off to whichever
 * UPI app the user already has installed.
 */

/** Standard VPA format, e.g. name@okicici or 9876543210@ybl. */
export const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(value: string | null | undefined) {
  return !!value && UPI_REGEX.test(value.trim());
}

export type UpiScheme = "upi://pay" | "tez://upi/pay" | "phonepe://pay" | "paytmmp://pay";

export type UpiLinkArgs = {
  /** Payee VPA (admin / merchant UPI ID). */
  pa: string;
  /** Payee display name. */
  pn: string;
  /** Amount in rupees. */
  am: number;
  /** Transaction reference — we pass the order id so payments reconcile. */
  tr?: string;
  /** Human-readable note shown inside the UPI app. */
  tn?: string;
};

/** Builds a spec-compliant UPI intent URL for the given app scheme. */
export function upiDeepLink(scheme: UpiScheme, { pa, pn, am, tr, tn }: UpiLinkArgs) {
  const params = new URLSearchParams({
    pa: pa.trim(),
    pn,
    am: am.toFixed(2),
    cu: "INR",
  });
  if (tr) params.set("tr", tr.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35));
  if (tn) params.set("tn", tn.slice(0, 50));
  return `${scheme}?${params.toString()}`;
}

/** Short, human-friendly reference used before an order id exists. */
export function newPaymentRef() {
  return `UIV${Date.now().toString(36).toUpperCase()}`;
}
