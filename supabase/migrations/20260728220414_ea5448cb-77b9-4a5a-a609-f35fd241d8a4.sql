
CREATE POLICY "trip_photos_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "trip_photos_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "trip_photos_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "trip_photos_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
