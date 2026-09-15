import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { DEFAULT_LANDING, saveLandingContent, useLandingContent, type LandingContent, type LandingFeature } from "@/lib/landing";
import LandingFeatureIcon, { LANDING_ICON_NAMES } from "@/components/LandingFeatureIcon";

const ROUTES = ["/menu", "/partner", "/cart", "/orders", "/auth", "/onboarding", "/"];

/** Master-admin editor for every element on the public landing page. */
export default function LandingTab() {
  const { content, loading } = useLandingContent();
  const [draft, setDraft] = useState<LandingContent>(DEFAULT_LANDING);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep the form in sync with live content until the admin starts editing.
  useEffect(() => {
    if (!dirty) setDraft(content);
  }, [content, dirty]);

  function set<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setDirty(true);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setFeature(index: number, patch: Partial<LandingFeature>) {
    setDirty(true);
    setDraft((d) => ({ ...d, features: d.features.map((f, i) => (i === index ? { ...f, ...patch } : f)) }));
  }

  async function save() {
    setSaving(true);
    try {
      await saveLandingContent(draft);
      setDirty(false);
      toast.success("Landing page updated — it's live now");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading landing content…</div>;

  return (
    <div className="space-y-4">
      <Card title="Top badge">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.badge_enabled} onChange={(e) => set("badge_enabled", e.target.checked)} />
          Show badge
        </label>
        <Field label="Badge text" value={draft.badge_text} onChange={(v) => set("badge_text", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Color label="Badge background" value={draft.badge_bg} onChange={(v) => set("badge_bg", v)} />
          <Color label="Badge text colour" value={draft.badge_fg} onChange={(v) => set("badge_fg", v)} />
        </div>
        <Preview>
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: draft.badge_bg, color: draft.badge_fg }}>
            {draft.badge_text || "Badge"}
          </span>
        </Preview>
      </Card>

      <Card title="Headline & description">
        <Field label="Headline (plain part)" value={draft.headline} onChange={(v) => set("headline", v)} />
        <Field label="Headline (highlighted part)" value={draft.headline_highlight} onChange={(v) => set("headline_highlight", v)} />
        <Field label="Description" value={draft.subheadline} onChange={(v) => set("subheadline", v)} multiline />
      </Card>

      <Card title="Primary button">
        <Field label="Label" value={draft.primary_label} onChange={(v) => set("primary_label", v)} />
        <RouteField label="Goes to" value={draft.primary_href} onChange={(v) => set("primary_href", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Color label="Background" value={draft.primary_bg} onChange={(v) => set("primary_bg", v)} />
          <Color label="Text colour" value={draft.primary_fg} onChange={(v) => set("primary_fg", v)} />
        </div>
      </Card>

      <Card title="Secondary button">
        <Field label="Label" value={draft.secondary_label} onChange={(v) => set("secondary_label", v)} />
        <RouteField label="Goes to" value={draft.secondary_href} onChange={(v) => set("secondary_href", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Color label="Background" value={draft.secondary_bg} onChange={(v) => set("secondary_bg", v)} />
          <Color label="Text colour" value={draft.secondary_fg} onChange={(v) => set("secondary_fg", v)} />
        </div>
        <Preview>
          <span className="inline-flex rounded-full px-4 py-2 text-sm font-semibold" style={{ background: draft.primary_bg, color: draft.primary_fg }}>
            {draft.primary_label || "Primary"}
          </span>
          <span className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold" style={{ background: draft.secondary_bg, color: draft.secondary_fg }}>
            {draft.secondary_label || "Secondary"}
          </span>
        </Preview>
      </Card>

      <Card title="Feature cards">
        <div className="space-y-3">
          {draft.features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <LandingFeatureIcon name={f.icon} className="h-4 w-4" /> Card {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => { setDirty(true); setDraft((d) => ({ ...d, features: d.features.filter((_, j) => j !== i) })); }}
                  className="press inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
              <div className="space-y-2">
                <Field label="Title" value={f.title} onChange={(v) => setFeature(i, { title: v })} />
                <Field label="Description" value={f.text} onChange={(v) => setFeature(i, { text: v })} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold">
                    Icon
                    <select
                      value={f.icon}
                      onChange={(e) => setFeature(i, { icon: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      {LANDING_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold">
                    Colour tone
                    <select
                      value={f.tone ?? "orange"}
                      onChange={(e) => setFeature(i, { tone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="orange">Orange</option>
                      <option value="fresh">Green</option>
                      <option value="offer">Yellow</option>
                      <option value="primary">Red</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setDirty(true); setDraft((d) => ({ ...d, features: [...d.features, { icon: "Sparkles", title: "New card", text: "Describe this highlight.", tone: "orange" }] })); }}
          className="press mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold active:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add card
        </button>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card/95 p-2 shadow-[var(--shadow-pop)] backdrop-blur">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="press inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : dirty ? "Save & publish" : "Saved"}
        </button>
        <button
          onClick={() => { setDraft(content); setDirty(false); }}
          className="press inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Discard changes
        </button>
        <button
          onClick={() => { setDraft({ ...DEFAULT_LANDING }); setDirty(true); }}
          className="press rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold active:bg-accent"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      {multiline ? (
        <textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      )}
    </label>
  );
}

function RouteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        value={value}
        list="landing-routes"
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      <datalist id="landing-routes">
        {ROUTES.map((r) => <option key={r} value={r} />)}
      </datalist>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <span className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 rounded border-0 bg-transparent p-0" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
      </span>
    </label>
  );
}

function Preview({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border p-3">{children}</div>;
}
