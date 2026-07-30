import { useMedia } from "@/lib/media";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
  loading?: "lazy" | "eager";
};

/** Renders an image from either an absolute URL or a private-storage object path. */
export default function MediaImage({ src, alt, className, fallback = "🍽️", loading = "lazy" }: Props) {
  const url = useMedia(src);
  if (!url) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground ${className ?? ""}`} aria-label={alt}>
        <span aria-hidden>{fallback}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} loading={loading} className={className} />;
}
