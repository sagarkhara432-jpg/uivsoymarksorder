
CREATE POLICY "app_media_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'app-media');
CREATE POLICY "app_media_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "app_media_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'app-media' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'app-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "app_media_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'app-media' AND public.has_role(auth.uid(),'admin'));
