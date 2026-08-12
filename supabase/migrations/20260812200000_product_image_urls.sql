-- Múltiplas imagens por produto (image_urls); image_url permanece como capa/primária.

alter table public.products
  add column if not exists image_urls text[] not null default '{}';

update public.products
set image_urls = array[image_url]
where image_url is not null
  and btrim(image_url) <> ''
  and coalesce(cardinality(image_urls), 0) = 0;
