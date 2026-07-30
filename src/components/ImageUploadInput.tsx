import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/media";
import MediaImage from "./MediaImage";

type Props = {
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  label?: string;
  className?: string;
};

/** Gallery/camera file picker that uploads to storage and returns the stored path. */
export default function ImageUploadInput({ value, onChange, folder, label = "Upload image", className }: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB");
    setBusy(true);
    try {
      const path = await uploadMedia(file, folder);
      onChange(path);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
