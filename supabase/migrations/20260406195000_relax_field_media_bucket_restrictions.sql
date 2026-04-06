update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array['image/*']
where id = 'field-media';
