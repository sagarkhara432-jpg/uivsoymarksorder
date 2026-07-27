import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Menu as MenuIcon, Users, ClipboardList, Plus, Trash2, LogOut, Tag, UserX, UserCheck, History, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { decideVerification } from "@/lib/admin.functions";
import { AlertsBell } from "@/components/AdminAlerts";


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

type Tab = "orders" | "menu" | "partners" | "offers" | "users" | "audit";

function AdminPage() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  const [tab, setTab] = useState<Tab>("orders");
  const [focusLog, setFocusLog] = useState<string | null>(null);


  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      setEmail(u.user.email ?? "");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const hasRole = roles?.some((r) => r.role === "admin") ?? false;
      const isMaster = (u.user.email ?? "").toLowerCase() === "sagarkharal21@gmail.com";
      setIsAdmin(hasRole && isMaster);

    })();
  }, []);

  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  if (isAdmin === null) return <div className="grid min-h-screen place-items-center text-sm">Loading…</div>;
  if (!isAdmin) return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="max-w-md rounded-3xl border border-destructive/40 bg-card p-6 text-center shadow-[var(--shadow-pop)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><Shield className="h-7 w-7" /></div>
        <h1 className="mt-3 text-lg font-extrabold">Unauthorized access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as <span className="font-semibold">{email || "unknown"}</span>. Only the master admin can access this panel.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/admin-login" className="press rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground active:bg-primary-press">Owner login</Link>
          <Link to="/" className="press rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold active:bg-accent">Home</Link>
          <button onClick={signOut} className="press rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold active:bg-accent">Sign out</button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h1 className="font-extrabold">Master Admin</h1><span className="hidden text-[10px] font-semibold uppercase text-muted-foreground sm:inline">· {email}</span></div>
          <div className="flex items-center gap-2">
            <AlertsBell enabled={isAdmin === true} onOpenAudit={(id) => { setFocusLog(id); setTab("audit"); }} />
            <button onClick={signOut} className="press inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>

        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          <TabBtn active={tab==="orders"} onClick={() => setTab("orders")} icon={<ClipboardList className="h-4 w-4" />} label="Orders" />
          <TabBtn active={tab==="menu"} onClick={() => setTab("menu")} icon={<MenuIcon className="h-4 w-4" />} label="Menu" />
          <TabBtn active={tab==="partners"} onClick={() => setTab("partners")} icon={<Users className="h-4 w-4" />} label="Partners" />
          <TabBtn active={tab==="offers"} onClick={() => setTab("offers")} icon={<Tag className="h-4 w-4" />} label="Offers" />
          <TabBtn active={tab==="users"} onClick={() => setTab("users")} icon={<UserCheck className="h-4 w-4" />} label="Users" />
          <TabBtn active={tab==="audit"} onClick={() => setTab("audit")} icon={<History className="h-4 w-4" />} label="Audit log" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {tab === "orders" && <OrdersTab />}
        {tab === "menu" && <MenuTab />}
        {tab === "partners" && <PartnersTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "users" && <UsersTab />}
        {tab === "audit" && <AuditTab focusId={focusLog} />}
      </main>

    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-surface border border-border active:bg-accent"}`}>{icon}{label}</button>
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
  const [editId, setEditId] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", emoji: "", sort_order: "" });


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
  async function saveItem(id: string, patch: any) {
    const { error } = await supabase.from("menu_items").update({
      name: patch.name, price: Number(patch.price), description: patch.description || null,
      image_url: patch.image_url || null, category_id: patch.category_id || null, is_veg: patch.is_veg,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditId(null); load();
  }

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catForm.name.trim()) return toast.error("Category name required");
    const { error } = await supabase.from("categories").insert({
      name: catForm.name.trim(), emoji: catForm.emoji || null, sort_order: catForm.sort_order ? Number(catForm.sort_order) : 0,
    });
    if (error) return toast.error(error.message);
    setCatForm({ name: "", emoji: "", sort_order: "" }); load();
  }
  async function saveCat(id: string, name: string, emoji: string, sort_order: string) {
    const { error } = await supabase.from("categories").update({ name, emoji: emoji || null, sort_order: Number(sort_order) || 0 }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category saved"); setEditCatId(null); load();
  }
  async function delCat(id: string) {
    if (!confirm("Delete this category? Dishes stay but lose their category.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
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

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Categories</h2>
        <form onSubmit={addCat} className="mt-2 flex flex-wrap gap-2">
          <input placeholder="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <input placeholder="Emoji" value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <input type="number" placeholder="Sort" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <button className="press rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:bg-primary-press">Add</button>
        </form>
        <div className="mt-3 space-y-2">
          {cats.map((c) => editCatId === c.id ? (
            <CategoryEditRow key={c.id} cat={c} onCancel={() => setEditCatId(null)} onSave={saveCat} />
          ) : (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm">
              <span className="flex-1 truncate">{c.emoji} {c.name} <span className="text-xs text-muted-foreground">· #{c.sort_order}</span></span>
              <button onClick={() => setEditCatId(c.id)} className="press grid h-8 w-8 place-items-center rounded-full active:bg-accent"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => delCat(c.id)} className="press grid h-8 w-8 place-items-center rounded-full text-destructive active:bg-accent"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => editId === i.id ? (
          <MenuEditCard key={i.id} item={i} cats={cats} onCancel={() => setEditId(null)} onSave={saveItem} />
        ) : (
          <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{i.name}</p>
              <p className="text-xs text-muted-foreground">₹{i.price}{i.is_veg ? " · veg" : " · non-veg"}</p>
            </div>
            <button onClick={() => toggleAvail(i.id, !i.is_available)} className={`press rounded-full px-2 py-1 text-[10px] font-bold ${i.is_available ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}>{i.is_available ? "Available" : "Sold out"}</button>
            <button onClick={() => setEditId(i.id)} className="press grid h-8 w-8 place-items-center rounded-full active:bg-accent"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => del(i.id)} className="press grid h-8 w-8 place-items-center rounded-full text-destructive active:bg-accent"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuEditCard({ item, cats, onCancel, onSave }: { item: any; cats: any[]; onCancel: () => void; onSave: (id: string, patch: any) => void }) {
  const [f, setF] = useState({
    name: item.name ?? "", price: String(item.price ?? ""), description: item.description ?? "",
    image_url: item.image_url ?? "", category_id: item.category_id ?? "", is_veg: !!item.is_veg,
  });
  return (
    <div className="grid gap-2 rounded-2xl border border-primary/50 bg-card p-3">
      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="Image URL" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
        <option value="">— category —</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_veg} onChange={(e) => setF({ ...f, is_veg: e.target.checked })} /> Vegetarian</label>
      <div className="flex gap-2">
        <button onClick={() => onSave(item.id, f)} className="press flex-1 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"><Save className="mr-1 inline h-3.5 w-3.5" /> Save</button>
        <button onClick={onCancel} className="press rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function CategoryEditRow({ cat, onCancel, onSave }: { cat: any; onCancel: () => void; onSave: (id: string, name: string, emoji: string, sort: string) => void }) {
  const [name, setName] = useState(cat.name ?? "");
  const [emoji, setEmoji] = useState(cat.emoji ?? "");
  const [sort, setSort] = useState(String(cat.sort_order ?? 0));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/50 bg-surface px-3 py-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm" />
      <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16 rounded-lg border border-border bg-card px-2 py-1.5 text-sm" />
      <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="w-16 rounded-lg border border-border bg-card px-2 py-1.5 text-sm" />
      <button onClick={() => onSave(cat.id, name, emoji, sort)} className="press rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Save className="h-3.5 w-3.5" /></button>
      <button onClick={onCancel} className="press rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><X className="h-3.5 w-3.5" /></button>
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

function OffersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", description: "", discount_type: "percent", value: "", min_order: "", max_discount: "", usage_limit: "", expires_at: "", is_active: true });
  const [editId, setEditId] = useState<string | null>(null);


  async function load() {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-coupons").on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return toast.error("Code and value required");
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      value: Number(form.value),
      min_order: form.min_order ? Number(form.min_order) : 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Coupon added");
    setForm({ code: "", description: "", discount_type: "percent", value: "", min_order: "", max_discount: "", usage_limit: "", expires_at: "", is_active: true });
  }

  async function toggle(id: string, v: boolean) {
    const { error } = await supabase.from("coupons").update({ is_active: v }).eq("id", id);
    if (error) toast.error(error.message);
  }
  async function del(id: string) {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-3">
        <input placeholder="CODE (e.g. WELCOME50)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm uppercase" />
        <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <option value="percent">Percent (%)</option>
          <option value="flat">Flat (₹)</option>
        </select>
        <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-3" />
        <input type="number" placeholder="Min order ₹" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input type="number" placeholder="Max discount ₹" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input type="number" placeholder="Usage limit" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input type="datetime-local" placeholder="Expires" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
        </label>
        <button className="press col-span-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press"><Plus className="mr-1 inline h-4 w-4" /> Create coupon</button>
      </form>

      <div className="space-y-2">
        {!rows.length && <p className="py-16 text-center text-sm text-muted-foreground">No coupons yet.</p>}
        {rows.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          if (editId === c.id) return <CouponEditCard key={c.id} coupon={c} onCancel={() => setEditId(null)} onSaved={() => { setEditId(null); load(); }} />;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-offer text-offer-foreground"><Tag className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-wide">{c.code} <span className="ml-1 text-[10px] font-semibold uppercase text-muted-foreground">{c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`}</span></p>
                <p className="truncate text-xs text-muted-foreground">{c.description || "—"} · used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}{c.expires_at ? ` · exp ${new Date(c.expires_at).toLocaleDateString()}` : ""}</p>
              </div>
              {expired && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Expired</span>}
              <button onClick={() => toggle(c.id, !c.is_active)} className={`press rounded-full px-2 py-1 text-[10px] font-bold ${c.is_active ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "Active" : "Paused"}</button>
              <button onClick={() => setEditId(c.id)} className="press grid h-8 w-8 place-items-center rounded-full active:bg-accent"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(c.id)} className="press grid h-8 w-8 place-items-center rounded-full text-destructive active:bg-accent"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);


  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: byUser.get(p.id) ?? [] })));
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-users").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function toggleBlock(id: string, blocked: boolean) {
    const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(blocked ? "User blocked" : "User unblocked");
    load();
  }

  const MASTER = "sagarkharal21@gmail.com";

  async function toggleRole(u: any, role: string, has: boolean) {
    if (role === "admin" && has && (u.email ?? "").toLowerCase() === MASTER) {
      return toast.error("The master admin role cannot be removed");
    }
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role as any);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: role as any });
      if (error) return toast.error(error.message);
    }
    toast.success("Roles updated");
    load();
  }

  async function saveProfile(id: string, patch: any) {
    const { error } = await supabase.from("profiles").update({
      full_name: patch.full_name || null, phone: patch.phone || null,
      address_line: patch.address_line || null, city: patch.city || null, pincode: patch.pincode || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved"); setEditId(null); load();
  }

  const filtered = rows.filter((r) => {
    if (roleFilter !== "all" && !r.roles.includes(roleFilter)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.email ?? "").toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s) || (r.phone ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-full border border-border bg-surface px-3 py-2 text-sm">
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="kitchen">Kitchen</option>
          <option value="delivery">Delivery</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {!filtered.length && <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No users match.</p>}
        {filtered.map((u) => (
          <div key={u.id} className={`rounded-2xl border p-3 ${u.is_blocked ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card"}`}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs font-bold text-muted-foreground">{(u.full_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{u.full_name || "Unnamed"}{u.is_blocked && <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive-foreground">Blocked</span>}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.phone ?? "no phone"}{u.city ? ` · ${u.city}` : ""}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <button key={r} onClick={() => toggleRole(u, r, has)}
                        className={`press rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${has ? (r === "admin" ? "bg-primary text-primary-foreground" : r === "kitchen" ? "bg-orange text-orange-foreground" : r === "delivery" ? "bg-fresh text-fresh-foreground" : "bg-secondary text-secondary-foreground") : "border border-border bg-surface text-muted-foreground"}`}>
                        {has ? r : `+ ${r}`}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => toggleBlock(u.id, !u.is_blocked)}
                  className={`press inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${u.is_blocked ? "bg-fresh text-fresh-foreground active:brightness-90" : "bg-destructive text-destructive-foreground active:brightness-90"}`}
                >
                  {u.is_blocked ? <><UserCheck className="h-3.5 w-3.5" /> Unblock</> : <><UserX className="h-3.5 w-3.5" /> Block</>}
                </button>
                <button onClick={() => setEditId(editId === u.id ? null : u.id)} className="press inline-flex items-center justify-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold active:bg-accent"><Pencil className="h-3.5 w-3.5" /> Edit</button>
              </div>
            </div>
            {editId === u.id && <ProfileEditForm user={u} onCancel={() => setEditId(null)} onSave={saveProfile} />}
          </div>
        ))}
      </div>
    </div>

  );
}

function CouponEditCard({ coupon, onCancel, onSaved }: { coupon: any; onCancel: () => void; onSaved: () => void }) {
  const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
  const [f, setF] = useState({
    code: coupon.code ?? "", description: coupon.description ?? "", discount_type: coupon.discount_type ?? "percent",
    value: String(coupon.value ?? ""), min_order: String(coupon.min_order ?? ""), max_discount: coupon.max_discount == null ? "" : String(coupon.max_discount),
    usage_limit: coupon.usage_limit == null ? "" : String(coupon.usage_limit), expires_at: toLocal(coupon.expires_at), is_active: !!coupon.is_active,
  });
  async function save() {
    const { error } = await supabase.from("coupons").update({
      code: f.code.trim().toUpperCase(),
      description: f.description || null,
      discount_type: f.discount_type,
      value: Number(f.value),
      min_order: f.min_order ? Number(f.min_order) : 0,
      max_discount: f.max_discount ? Number(f.max_discount) : null,
      usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
      is_active: f.is_active,
    }).eq("id", coupon.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon updated");
    onSaved();
  }
  return (
    <div className="grid gap-2 rounded-2xl border border-primary/50 bg-card p-3 sm:grid-cols-3">
      <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm uppercase" />
      <select value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
        <option value="percent">Percent (%)</option>
        <option value="flat">Flat (₹)</option>
      </select>
      <input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-3" />
      <input type="number" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} placeholder="Min order ₹" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input type="number" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} placeholder="Max discount ₹" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input type="number" value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} placeholder="Usage limit" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
      <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active</label>
      <div className="col-span-full flex gap-2">
        <button onClick={save} className="press flex-1 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"><Save className="mr-1 inline h-3.5 w-3.5" /> Save changes</button>
        <button onClick={onCancel} className="press rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

const ROLES = ["customer", "kitchen", "delivery", "admin"] as const;

function AuditTab({ focusId }: { focusId?: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  const [table, setTable] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(focusId ?? null);

  useEffect(() => {
    if (!focusId) return;
    setTable("all");
    setOpen(focusId);
    const t = setTimeout(() => {
      document.getElementById(`audit-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => clearTimeout(t);
  }, [focusId]);


  async function load() {
    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
    if (table !== "all") query = query.eq("table_name", table);
    const { data, error } = await query;
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-audit").on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.actor_email ?? "").toLowerCase().includes(s) || (r.table_name ?? "").includes(s) || (r.record_id ?? "").includes(s) || JSON.stringify(r.new_data ?? {}).toLowerCase().includes(s);
  });

  function changedFields(r: any): string[] {
    if (r.action !== "update" || !r.old_data || !r.new_data) return [];
    return Object.keys(r.new_data).filter((k) => JSON.stringify(r.old_data[k]) !== JSON.stringify(r.new_data[k]) && k !== "updated_at");
  }

  const LABEL: Record<string, string> = {
    coupons: "Offer", profiles: "User", user_roles: "Role", menu_items: "Menu item", categories: "Category",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by admin email, record, value…" className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary" />
        <select value={table} onChange={(e) => setTable(e.target.value)} className="rounded-full border border-border bg-surface px-3 py-2 text-sm">
          <option value="all">All activity</option>
          <option value="coupons">Offers</option>
          <option value="profiles">Users</option>
          <option value="user_roles">Roles</option>
          <option value="menu_items">Menu</option>
          <option value="categories">Categories</option>
        </select>
      </div>

      {!filtered.length && <p className="py-16 text-center text-sm text-muted-foreground">No activity recorded yet.</p>}

      <div className="space-y-2">
        {filtered.map((r) => {
          const fields = changedFields(r);
          const expanded = open === r.id;
          return (
            <div key={r.id} id={`audit-${r.id}`} className={`rounded-2xl border bg-card p-3 ${focusId === r.id ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}>
              <button onClick={() => setOpen(expanded ? null : r.id)} className="flex w-full items-start gap-3 text-left">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-extrabold uppercase ${r.action === "insert" ? "bg-fresh text-fresh-foreground" : r.action === "delete" ? "bg-destructive text-destructive-foreground" : "bg-offer text-offer-foreground"}`}>
                  {r.action === "insert" ? "NEW" : r.action === "delete" ? "DEL" : "EDIT"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{LABEL[r.table_name] ?? r.table_name} {r.action === "insert" ? "created" : r.action === "delete" ? "deleted" : "updated"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    by {r.actor_email ?? "system"} · {new Date(r.created_at).toLocaleString()}
                    {fields.length ? ` · ${fields.join(", ")}` : ""}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">record {String(r.record_id ?? "—").slice(0, 8)}</span>
                </span>
              </button>
              {expanded && (
                <div className="mt-2 space-y-2 border-t border-border pt-2 text-xs">
                  {r.action === "update" ? (
                    fields.length ? fields.map((k) => (
                      <div key={k} className="flex flex-wrap gap-1">
                        <span className="font-semibold">{k}:</span>
                        <span className="text-destructive line-through">{JSON.stringify(r.old_data[k])}</span>
                        <span>→</span>
                        <span className="text-fresh font-semibold">{JSON.stringify(r.new_data[k])}</span>
                      </div>
                    )) : <p className="text-muted-foreground">No field differences recorded.</p>
                  ) : (
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-surface p-2">{JSON.stringify(r.new_data ?? r.old_data, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileEditForm({ user, onCancel, onSave }: { user: any; onCancel: () => void; onSave: (id: string, patch: any) => void }) {
  const [f, setF] = useState({
    full_name: user.full_name ?? "", phone: user.phone ?? "",
    address_line: user.address_line ?? "", city: user.city ?? "", pincode: user.pincode ?? "",
  });
  return (
    <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
      <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Full name" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.address_line} onChange={(e) => setF({ ...f, address_line: e.target.value })} placeholder="Address" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
      <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <input value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} placeholder="Pincode" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
      <div className="col-span-full flex gap-2">
        <button onClick={() => onSave(user.id, f)} className="press flex-1 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground active:bg-primary-press"><Save className="mr-1 inline h-3.5 w-3.5" /> Save profile</button>
        <button onClick={onCancel} className="press rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
