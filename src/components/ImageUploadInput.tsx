import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/media";
import MediaImage from "./MediaImage";

type Props = {
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  label?: string;
  className?: string;
  /** "icon" renders a single camera button — one tap straight to the gallery. */
  variant?: "default" | "icon";
};

/**
 * Compresses a picked photo to 70% quality JPEG before upload so gallery shots
 * from a phone stay small and load instantly on slow connections.
 */
async function compress(file: File, quality = 0.7, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Gallery/camera file picker that uploads to storage and returns the stored path. */
export default function ImageUploadInput({
  value,
  onChange,
  folder,
  label = "Upload image",
  className,
  variant = "default",
}: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 12 * 1024 * 1024) return toast.error("Image must be under 12 MB");
    setBusy(true);
    try {
      const path = await uploadMedia(await compress(file), folder);
      onChange(path);
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      disabled={busy}
      onChange={(e) => pick(e.target.files?.[0])}
    />
  );

  if (variant === "icon") {
    return (
      <label
        title={label}
        aria-label={label}
        className={`press relative grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-border bg-surface ${className ?? ""}`}
      >
        <MediaImage src={value} alt="Photo" className="absolute inset-0 h-full w-full object-cover" fallback="" />
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-foreground/70 text-background">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </span>
        {fileInput}
      </label>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
        <MediaImage src={value} alt="Selected" className="h-full w-full object-cover" fallback="🖼️" />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg bg-destructive text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <label className="press inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold active:bg-accent">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label}
        {fileInput}
      </label>
    </div>
  );
}
