import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "app-media";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function isAbsolute(v: string) {
  return /^(https?:)?\/\//.test(v) || v.startsWith("data:") || v.startsWith("blob:");
}

/** Resolve a stored value (absolute URL or storage object path) into a usable src. */
export async function resolveMedia(value?: string | null): Promise<string> {
  if (!value) return "";
  if (isAbsolute(value)) return value;
  const hit = cache.get(value);
  if (hit) return hit;
  const pending = inflight.get(value);
  if (pending) return pending;
  const p = supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(value, 60 * 60 * 24 * 7)
    .then(({ data }) => {
      const url = data?.signedUrl ?? "";
      if (url) cache.set(value, url);
      inflight.delete(value);
      return url;
    });
  inflight.set(value, p);
  return p;
}

/** React hook version of resolveMedia. */
export function useMedia(value?: string | null) {
  const [src, setSrc] = useState(() => (value && isAbsolute(value) ? value : cache.get(value ?? "") ?? ""));
  useEffect(() => {
    let alive = true;
    if (!value) {
      setSrc("");
      return;
    }
    resolveMedia(value).then((u) => {
      if (alive) setSrc(u);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  return src;
}

/** Upload a device-gallery file to storage and return the stored object path. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "-").slice(-60);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
