-- Keve Marketplace B2B — Storage buckets e policies
-- APLIQUE NO REMOTO: SQL Editor ou supabase db push

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('demand-attachments', 'demand-attachments', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('order-attachments', 'order-attachments', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- documents: supplier uploads own files
create policy storage_documents_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_documents_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- staff can read documents for approval
create policy storage_documents_staff_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('admin', 'commercial')
    )
  );

-- chat-attachments: participants upload/read
create policy storage_chat_select on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-attachments');

create policy storage_chat_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- demand-attachments: buyer owns folder
create policy storage_demand_attachments on storage.objects
  for all to authenticated
  using (
    bucket_id = 'demand-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'demand-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- order-attachments: order participants
create policy storage_order_attachments_select on storage.objects
  for select to authenticated
  using (bucket_id = 'order-attachments');

create policy storage_order_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- product-images: public read, supplier write own folder
create policy storage_product_images_select on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'product-images');

create policy storage_product_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_product_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_product_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars in documents bucket subfolder avatars/{user_id}/
create policy storage_avatars_select on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'avatars');

create policy storage_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
