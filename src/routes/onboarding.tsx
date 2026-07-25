import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, User, Phone, Home, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete your profile — Uivsoymarks" },
      { name: "description", content: "Set up your delivery profile so we can send hot food to your door." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    pincode: "",
  });
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    if (!loading && !user) { nav({ to: "/auth" }); return; }
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.profile_completed) { nav({ to: "/menu" }); return; }
      setForm({
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
        phone: data?.phone ?? "",
        address_line: data?.address_line ?? "",
        city: data?.city ?? "",
        pincode: data?.pincode ?? "",
      });
      if (data?.lat && data?.lng) setCoords({ lat: data.lat, lng: data.lng });
      setChecking(false);
    });
  }, [user?.id, loading]);

  function detectLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    toast.loading("Detecting location…", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured", { id: "geo" }); },
      () => toast.error("Could not detect location", { id: "geo" }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim() || form.full_name.trim().length < 2) return toast.error("Enter your real full name");
    if (!/^\+?\d[\d\s-]{6,}$/.test(form.phone)) return toast.error("Enter a valid phone number");
    if (!form.address_line.trim() || form.address_line.trim().length < 8) return toast.error("Enter a precise address");
    if (!coords.lat || !coords.lng) return toast.error("Please tap 'Use my location' for precise delivery");

    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      address_line: form.address_line.trim(),
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
      profile_completed: true,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved!");
    nav({ to: "/menu" });
  }

  if (loading || checking) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><span className="font-black">U</span></div>
          <h1 className="text-base font-extrabold">Complete your profile</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-orange/10 p-4">
          <p className="text-sm font-semibold">Welcome, {user?.user_metadata?.full_name?.split(" ")[0] ?? "there"} 👋</p>
          <p className="mt-1 text-xs text-muted-foreground">Quick one-time setup so your food finds you fast. Your Google account keeps orders spam-free.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Identity</h2>
            <Field icon={<User className="h-4 w-4" />} placeholder="Real full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <label className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-fresh" />
              <input readOnly value={user?.email ?? ""} className="w-full bg-transparent text-sm text-muted-foreground outline-none" />
              <span className="text-[10px] font-bold uppercase text-fresh">Verified</span>
            </label>
            <Field icon={<Phone className="h-4 w-4" />} placeholder="Phone (e.g. +91 98765 43210)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Delivery address</h2>
            <Field icon={<Home className="h-4 w-4" />} placeholder="House / flat, street, area, landmark" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field placeholder="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field placeholder="PIN code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
            </div>
            <button type="button" onClick={detectLocation} className={`press mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${coords.lat ? "bg-fresh text-fresh-foreground" : "border border-primary bg-primary/10 text-primary"}`}>
              <MapPin className="h-3.5 w-3.5" /> {coords.lat ? `Location captured ✓ (${coords.lat.toFixed(4)}, ${coords.lng!.toFixed(4)})` : "Use my precise location (required)"}
            </button>
          </section>

          <button
            type="submit"
            disabled={busy}
            className="press fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] active:bg-primary-press disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save & start ordering"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, ...p }: { icon?: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        type={p.type ?? "text"}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
