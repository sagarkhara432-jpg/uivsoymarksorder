import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Menu as MenuIcon, Users, ClipboardList, Plus, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { decideVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Uivsoymarks" },
      { name: "description", content: "Master admin dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tab = "orders" | "menu" | "partners";

function AdminPage() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const admin = roles?.some((r) => r.role === "admin") ?? false;
      setIsAdmin(admin);
    })();
  }, []);

  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  if (isAdmin === null) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;
  if (!isAdmin) return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="max-w-md rounded-3xl border border-border/60 bg-card p-6 text-center">
        <h1 className="text-lg font-extrabold">Not authorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only the master admin can access this panel.</p>
        <Link to="/" className="press mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground active:bg-primary-press">Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h1 className="font-extrabold">Master Admin</h1></div>
          <button onClick={signOut} className="press inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
          <TabBtn active={tab==="orders"} onClick={() => setTab("orders")} icon={<ClipboardList className="h-4 w-4" />} label="Orders" />
          <TabBtn active={tab==="menu"} onClick={() => setTab("menu")} icon={<MenuIcon className="h-4 w-4" />} label="Menu" />
          <TabBtn active={tab==="partners"} onClick={() => setTab("partners")} icon={<Users className="h-4 w-4" />} label="Partners" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {tab === "orders" && <OrdersTab />}
        {tab === "menu" && <MenuTab />}
        {tab === "partners" && <PartnersTab />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-surface border border-border active:bg-accent"}`}>{icon}{label}</button>
  );
}

function OrdersTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("orders").select("*").order("placed_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    }
    load();
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return (
    <div className="space-y-2">
      {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p>}
      {rows.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">#{o.id.slice(0, 8)} · {o.customer_name}</p>
              <p className="text-xs text-muted-foreground">{o.address_line} · {o.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-extrabold">₹{o.total}</p>
              <p className="text-xs capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuTab() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", price: "", description: "", image_url: "", category_id: "", is_veg: true });

  async function load() {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("created_at"),
    ]);
    setCats(c ?? []); setItems(m ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price) return toast.error("Name and price required");
    const { error } = await supabase.from("menu_items").insert({
      name: form.name, price: Number(form.price), description: form.description || null,
      image_url: form.image_url || null, category_id: form.category_id || null, is_veg: form.is_veg,
    });
    if (error) return toast.error(error.message);
    toast.success("Added"); setForm({ name: "", price: "", description: "", image_url: "", category_id: "", is_veg: true }); load();
  }

  async function toggleAvail(id: string, v: boolean) {
    await supabase.from("menu_items").update({ is_available: v }).eq("id", id); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id); load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input type="number" placeholder="Price ₹" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <option value="">— category —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} /> Vegetarian
        </label>
        <button className="press col-span-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press"><Plus className="mr-1 inline h-4 w-4" /> Add dish</button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{i.name}</p>
              <p className="text-xs text-muted-foreground">₹{i.price}</p>
            </div>
            <button onClick={() => toggleAvail(i.id, !i.is_available)} className={`press rounded-full px-2 py-1 text-[10px] font-bold ${i.is_available ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}>{i.is_available ? "Available" : "Sold out"}</button>
            <button onClick={() => del(i.id)} className="press grid h-8 w-8 place-items-center rounded-full text-destructive active:bg-accent"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const decide = useServerFn(decideVerification);
  async function load() {
    const { data } = await supabase.from("partner_verifications").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, decision: "approved" | "rejected") {
    try { await decide({ data: { verification_id: id, decision } }); toast.success(`Marked ${decision}`); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-2">
      {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No partner applications.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{r.full_name} <span className="ml-1 text-[10px] uppercase text-muted-foreground">({r.requested_role})</span></p>
              <p className="text-xs text-muted-foreground">{r.phone}{r.vehicle_number ? ` · ${r.vehicle_number}` : ""}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "approved" ? "bg-fresh text-fresh-foreground" : r.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-offer text-offer-foreground"}`}>{r.status}</span>
          </div>
          {r.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => act(r.id, "approved")} className="press rounded-full bg-fresh px-3 py-1.5 text-xs font-bold text-fresh-foreground active:brightness-90">Approve</button>
              <button onClick={() => act(r.id, "rejected")} className="press rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground active:brightness-90">Reject</button>
              <a href="#" onClick={async (e) => {
                e.preventDefault();
                const { data } = await supabase.storage.from("id-proofs").createSignedUrl(r.id_proof_path, 300);
                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
              }} className="press ml-auto rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent">View ID</a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
