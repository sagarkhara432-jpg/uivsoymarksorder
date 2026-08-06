import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/media";

type Props = {
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  accept?: string;
  label?: string;
  maxMb?: number;
  className?: string;
};

/**
 * One-click uploader for any media file (used for promo videos). Uploads straight
 * to storage and hands back the stored object path.
 */
export default function MediaUploadInput({
  value,
  onChange,
  folder,
  accept = "video/*",
  label = "Upload file",
  maxMb = 60,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) return toast.error(`File must be under ${maxMb} MB`);
    setBusy(true);
    try {
      onChange(await uploadMedia(file, folder));
      toast.success("Upload complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <label className="press inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold active:bg-accent">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label}
        <input ref={inputRef} type="file" accept={accept} hidden disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="press rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-destructive active:bg-accent"
        >
          Remove
        </button>
      )}
    </div>
  );
}
