import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  qty: number;
  notes?: string;
  restaurant_id?: string | null;
};

const KEY = "uivso_cart_v1";

let cached: { raw: string; items: CartItem[] } = { raw: "", items: [] };
function read(): CartItem[] {
  if (typeof window === "undefined") return cached.items;
  const raw = localStorage.getItem(KEY) || "[]";
  if (raw !== cached.raw) {
    try {
      const parsed = JSON.parse(raw);
      cached = { raw, items: Array.isArray(parsed) ? parsed : [] };
    } catch {
      cached = { raw, items: [] };
    }
  }
  return cached.items;
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

/**
 * Every write stores a brand-new array. useSyncExternalStore bails out when the
 * snapshot reference is unchanged, so mutating in place made the cart bar only
 * appear after a refresh.
 */
function write(items: CartItem[]) {
  const next = items.map((i) => ({ ...i }));
  const raw = JSON.stringify(next);
  if (typeof window !== "undefined") localStorage.setItem(KEY, raw);
  cached = { raw, items: next };
  emit();
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const items = read();
    const exists = items.some((i) => i.id === item.id);
    write(
      exists
        ? items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i))
        : [...items, { ...item, qty }],
    );
  },
  inc(id: string) {
    write(read().map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  },
  dec(id: string) {
    write(
      read()
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    );
  },
  setNotes(id: string, notes: string) {
    write(read().map((i) => (i.id === id ? { ...i, notes: notes.slice(0, 200) } : i)));
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

const EMPTY: CartItem[] = [];
export function useCart() {
  return useSyncExternalStore(cart.subscribe, read, () => EMPTY);
}

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  return { subtotal, count };
}
