ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

ALTER TABLE public.banners ALTER COLUMN image_url DROP NOT NULL;