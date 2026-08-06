import { useBanners } from "@/lib/settings";
import MediaImage from "@/components/MediaImage";
import MediaVideo from "@/components/MediaVideo";

/** Live promo strip: shows only banners/videos the admin has toggled live. */
export default function PromoStrip() {
  const banners = useBanners(true);
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {banners.map((b) => {
          const inner = (
            <div className="relative h-40 w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[var(--shadow-card)] sm:w-[380px]">
              {b.media_type === "video" && b.video_url ? (
                <MediaVideo src={b.video_url} poster={b.image_url} controls={false} autoPlay className="h-full w-full object-cover" />
              ) : (
                <MediaImage src={b.image_url} alt={b.title ?? "Promotion"} className="h-full w-full object-cover" fallback="🎉" />
              )}
              {(b.title || b.subtitle) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-3 text-background">
                  {b.title && <p className="text-sm font-extrabold">{b.title}</p>}
                  {b.subtitle && <p className="text-xs opacity-90">{b.subtitle}</p>}
                </div>
              )}
            </div>
          );
          return b.link_url ? (
            <a key={b.id} href={b.link_url} target="_blank" rel="noreferrer" className="press shrink-0">
              {inner}
            </a>
          ) : (
            <div key={b.id} className="shrink-0">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
