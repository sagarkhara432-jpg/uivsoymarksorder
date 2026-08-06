import { useMedia } from "@/lib/media";

type Props = {
  src?: string | null;
  className?: string;
  poster?: string | null;
  controls?: boolean;
  autoPlay?: boolean;
};

/** Plays a video from either an absolute URL or a private-storage object path. */
export default function MediaVideo({ src, className, poster, controls = true, autoPlay = false }: Props) {
  const url = useMedia(src);
  const posterUrl = useMedia(poster);
  if (!url) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <span aria-hidden>🎬</span>
      </div>
    );
  }
  return (
    <video
      src={url}
      poster={posterUrl || undefined}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted={autoPlay}
      loop={autoPlay}
      playsInline
      preload="metadata"
    />
  );
}
