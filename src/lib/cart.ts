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
      cached = { raw, items: JSON.parse(raw) };
    } catch {
      cached = { raw, items: [] };
    }
  }
  return cached.items;
}

let listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function write(items: CartItem[]) {
  const raw = JSON.stringify(items);
  localStorage.setItem(KEY, raw);
  cached = { raw, items };
  emit();
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "qty">) {
    const items = read();
    const existing = items.find((i) => i.id === item.id);
    if (existing) existing.qty += 1;
    else items.push({ ...item, qty: 1 });
    write(items);
  },
  inc(id: string) {
    const items = read();
    const it = items.find((i) => i.id === id);
    if (it) it.qty += 1;
    write(items);
  },
  dec(id: string) {
    let items = read();
    const it = items.find((i) => i.id === id);
    if (!it) return;
    it.qty -= 1;
    if (it.qty <= 0) items = items.filter((i) => i.id !== id);
    write(items);
  },
  setNotes(id: string, notes: string) {
    const items = read().map((i) => (i.id === id ? { ...i, notes: notes.slice(0, 200) } : i));
    write(items);
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
