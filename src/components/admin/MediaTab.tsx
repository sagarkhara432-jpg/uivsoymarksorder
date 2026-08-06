import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Film, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ImageUploadInput from "@/components/ImageUploadInput";
import MediaUploadInput from "@/components/MediaUploadInput";
import MediaImage from "@/components/MediaImage";
import MediaVideo from "@/components/MediaVideo";

type Row = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  media_type: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty = {
  title: "",
  subtitle: "",
  link_url: "",
  sort_order: "0",
  media_type: "image" as "image" | "video",
  image_url: null as string | null,
  video_url: null as string | null,
  is_active: true,
};

/** Banner & promo-video manager with a live / unpublished toggle per item. */
export default function MediaTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-banners")
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function add() {
    if (f.media_type === "image" && !f.image_url) return toast.error("Upload a banner image first");
    if (f.media_type === "video" && !f.video_url) return toast.error("Upload a video first");
    setBusy(true);
    const { error } = await supabase.from("banners").insert({
      title: f.title.trim() || null,
      subtitle: f.subtitle.trim() || null,
      link_url: f.link_url.trim() || null,
      sort_order: Number(f.sort_order) || 0,
      media_type: f.media_type,
      image_url: f.image_url,
      video_url: f.media_type === "video" ? f.video_url : null,
      is_active: f.is_active,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(f.is_active ? "Published live" : "Saved as unpublished");
    setF(empty);
    load();
  }

  async function toggleLive(id: string, v: boolean) {
    const { error } = await supabase.from("banners").update({ is_active: v }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(v ? "Now live for customers" : "Unpublished");
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this media item?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-2">
        <h2 className="col-span-full flex items-center gap-2 text-sm font-extrabold">
          <ImageIcon className="h-4 w-4 text-primary" /> Add banner or promo video
        </h2>
        <div className="col-span-full flex gap-2">
          {(["image", "video"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setF({ ...f, media_type: t })}
              className={`press flex-1 rounded-full py-2 text-xs font-bold capitalize ${f.media_type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {t === "image" ? "Banner image" : "Promo video"}
            </button>
          ))}
        </div>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} placeholder="Subtitle" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} placeholder="Tap-through link (optional)" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <input value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} type="number" placeholder="Sort order" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <div className="col-span-full rounded-xl border border-border bg-surface p-2">
          <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">
            {f.media_type === "video" ? "Video file (plus optional cover image)" : "Banner image"}
          </p>
          <ImageUploadInput value={f.image_url} onChange={(p) => setF({ ...f, image_url: p })} folder="banners" label={f.media_type === "video" ? "Upload cover" : "Upload banner"} />
          {f.media_type === "video" && (
            <MediaUploadInput className="mt-2" value={f.video_url} onChange={(p) => setF({ ...f, video_url: p })} folder="banners" label="Upload video" />
          )}
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Publish live immediately
        </label>
        <button disabled={busy} onClick={add} className="press rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground active:bg-primary-press disabled:opacity-60">
          <Plus className="mr-1 inline h-4 w-4" /> Add media
        </button>
      </section>

      <div className="space-y-2">
        {!rows.length && <p className="py-12 text-center text-sm text-muted-foreground">No banners or videos yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {r.media_type === "video" && r.video_url ? (
                <MediaVideo src={r.video_url} poster={r.image_url} controls={false} className="h-full w-full object-cover" />
              ) : (
                <MediaImage src={r.image_url} alt={r.title ?? "Banner"} className="h-full w-full object-cover" fallback="🖼️" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold">
                {r.media_type === "video" ? <Film className="h-3.5 w-3.5 text-primary" /> : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
                {r.title || "Untitled"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{r.subtitle || r.link_url || `Position ${r.sort_order}`}</p>
            </div>
            <button
              onClick={() => toggleLive(r.id, !r.is_active)}
              aria-pressed={r.is_active}
              className={`press inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${r.is_active ? "bg-fresh text-fresh-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <span className={`relative h-4 w-8 rounded-full ${r.is_active ? "bg-fresh-foreground/30" : "bg-foreground/20"}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all ${r.is_active ? "left-[18px]" : "left-0.5"}`} />
              </span>
              {r.is_active ? "Live" : "Unpublished"}
            </button>
            <button onClick={() => del(r.id)} aria-label="Delete" className="press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-destructive active:bg-accent">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
